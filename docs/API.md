# API REST

La API usa Django REST Framework con versionado por URL y documentación OpenAPI generada
automáticamente con drf-spectacular a partir del propio código de las vistas.

## URLs

Todas las rutas viven bajo la base versionada `/api/v1/` (ver `backend/backend/urls.py`):

| Recurso | Ruta | Acceso |
| --- | --- | --- |
| Base versionada | `/api/v1/` | — |
| Esquema OpenAPI 3.0 | `GET /api/v1/schema/` | Público |
| Swagger UI | `GET /api/v1/docs/` | Público |
| Salud del servicio | `GET /api/v1/core/health/` | Requiere sesión (no es una sonda pública) |

No existen alias sin versión: `/api/<recurso>/` no está enrutado, solo `/api/v1/<recurso>/`.

Swagger UI y el esquema los sirve el propio backend, así que su URL depende de dónde esté
alojado. El esquema no declara un bloque `servers`, de modo que el botón **Try it out** de
Swagger UI resuelve las peticiones contra el origen desde el que se cargó la propia página de
documentación. En el frontend, el enlace del panel de API se deriva de `API_BASE`
(`frontend/src/api/httpClient.js`), que es la misma base que usa el cliente HTTP para las
peticiones reales, por lo que el enlace y las llamadas siempre apuntan al mismo backend:

- Despliegue en un solo origen (o con el proxy de Vite en desarrollo): `API_BASE` es relativa
  (`/api/v1`) y la documentación queda en `https://<host-actual>/api/v1/docs/`.
- Frontend y backend en dominios distintos: define `VITE_API_ORIGIN` (o una `VITE_API_BASE`
  absoluta) y tanto las peticiones como el enlace a la documentación irán a ese host.

## Autenticación

El backend autentica con `apps.authentication.cookie_auth.CookieJWTAuthentication`, que acepta
dos mecanismos. El esquema OpenAPI declara ambos como alternativas (`CookieAuth` y `BearerAuth`):

1. **Cookies JWT HttpOnly** (lo que usa el cliente web). `POST /api/v1/authentication/login/`
   establece `ingresosup_access` e `ingresosup_refresh`; `POST /api/v1/authentication/token/refresh/`
   renueva la de acceso a partir de la de refresco. No son legibles desde JavaScript, así que un
   XSS no puede robar el token. Como el navegador las envía solas, los métodos que modifican
   estado (POST, PUT, PATCH, DELETE) exigen además el header `X-CSRFToken` con el valor de la
   cookie `csrftoken`, que se obtiene en `GET /api/v1/authentication/csrf/`.

2. **Header Authorization** (integraciones servidor a servidor), con el mismo JWT de acceso:

   ```http
   Authorization: Bearer <access>
   ```

   No requiere CSRF, porque el token se envía de forma explícita y no viaja automáticamente.

Un usuario con contraseña temporal (`debe_cambiar_password`) solo puede usar
`change-password/`, `me/`, `logout/`, `csrf/` y `token/refresh/` hasta que la cambie.

## Formato de respuesta

Todas las respuestas JSON van envueltas por `EnvelopeJSONRenderer` en `{success, data, error}`;
el código de estado HTTP es lo que decide si es éxito o error:

```json
{ "success": true, "data": { "...": "..." }, "error": null }
```

Las rutas de exportación (`/import-export/export/...`, `/landing/export/...`, PDF y plantillas)
devuelven el archivo binario directamente, sin envoltorio.

## Consulta pública de resultados y otorgamientos

Los endpoints públicos de la landing no publican nada por el simple hecho de que la etapa esté en
curso: la publicación es una decisión explícita del Jefe de Comisión, guardada en dos interruptores
del `Proceso` (uno por año y etapa), ambos `false` por omisión.

| Interruptor | Abre |
| --- | --- |
| `config_consulta_nota_publica` (proceso de la etapa 5) | `GET /api/v1/import-export/resultados/landing/` y su exportación |
| `config_consulta_otorg_publico` (proceso de la etapa 6) | `GET /api/v1/import-export/otorgamiento/landing/`, `cortes/landing/` y sus exportaciones |

Se activan con `PATCH /api/v1/gestion-provincial/procesos/{id}/` (solo Jefe de Comisión), que acepta
únicamente esos dos campos:

```json
{ "config_consulta_otorg_publico": true }
```

Mientras estén en `false`, las consultas responden `200` con `publicacion_habilitada: false` y una
lista vacía, y las exportaciones responden `403`.

## Ciclos anuales de etapas

Las fechas y el estado de cada etapa se guardan en su `Proceso` anual; `Etapa` queda como catálogo
de nombres. `GET /api/v1/gestion-provincial/etapas/?anio=YYYY` consulta una cohorte específica y, si aún
no tiene registros, prepara sus seis etapas. Activar una etapa la habilita inmediatamente, aunque
`fecha_inicio` sea posterior a hoy.
El año identifica la cohorte: si el proceso cruza el 31 de diciembre, las etapas siguientes siguen
asociadas a la cohorte original.

`POST /api/v1/gestion-provincial/etapas/reiniciar/` prepara el año siguiente cuando todas las etapas
del ciclo vigente están completadas. Acepta `{ "anio": YYYY }` para indicar el próximo año de cohorte y conserva
intactos los ciclos anteriores; no reinicia ni borra sus fechas/estados.

Al migrar desde el modelo anterior, el estado compartido de las etapas se conserva solo en el año
más reciente con procesos. Los años anteriores quedan sin fechas/estado independiente porque el
sistema previo no almacenaba ese historial.

Los listados públicos están paginados (`page`, `page_size`; 50 filas por defecto, 200 como
máximo) y devuelven `count`, `page`, `page_size` y `total_pages` junto a `results`.

En esos listados los datos del estudiante van enmascarados salvo para el propio estudiante
autenticado: el nombre se reduce a iniciales y del CI solo se ven los **últimos 4 dígitos** (los 6
primeros son la fecha de nacimiento). El filtro por CI exige los 11 dígitos completos y coincidencia
exacta, para que no se pueda enumerar por prefijos.

## Importación de resultados

La importación de notas se encola con `POST /api/v1/import-export/import/resultados/`. La respuesta
`202` incluye un `task_id`; consulta `GET /api/v1/import-export/tareas/{task_id}/` para conocer el
resultado. Si una nota corresponde a un estudiante que no confirmó asistencia o indicó que no
asistiría, la nota se importa igualmente y el resultado incluye una entrada en `advertencias`.

## Seguridad y límites

- La autenticación es obligatoria por defecto (`IsAuthenticated`); los endpoints públicos son
  excepciones explícitas y declaradas vista por vista: login, registro, verificación y
  restablecimiento de contraseña, CSRF, las consultas de la landing y la lectura de los
  nomencladores de provincia/municipio/escuela que necesita el registro anónimo.
- Conocer una ruta no concede acceso: cada vista protegida valida rol y alcance (provincia,
  municipio o escuela del usuario) en el backend.
- El escalafón que recibe un estudiante es el ranking de su escuela (nombre, posición e índice
  general); el CI, la dirección, el sexo y los índices por grado solo salen en su propia fila.
- Límites de peticiones vigentes: 60/min para clientes anónimos, 120/min para usuarios
  autenticados, 10/min en las rutas de autenticación y 30/min en las importaciones masivas.

## Mantener la documentación alineada

El esquema se genera del código, por lo que rutas, métodos y cuerpos de petición no pueden
desalinearse. Lo que sí hay que declarar a mano es lo que drf-spectacular no puede inferir:

- Los **parámetros de consulta** que una vista lee con `request.query_params` deben declararse con
  `OpenApiParameter` en su `@extend_schema`; los que vienen de `SearchFilter` o de una clase de
  paginación se documentan solos.
- Los **ViewSet** necesitan `@extend_schema_view` con `tags` y `summary` por acción; sin eso sus
  operaciones acaban en la etiqueta automática `api` y sin resumen en Swagger UI.
- Las **`APIView` sin `serializer_class`** necesitan `responses=` explícito, o la vista se omite
  del esquema (se ve como `Error [...]: unable to guess serializer` al generar).

Comprueba que el esquema sigue generándose sin errores con:

```bash
cd backend
python manage.py spectacular --format openapi-json --file schema.json
```

La página de API del panel de Jefe de Comisión (`frontend/src/pages/JefeComision/ApiPage.jsx`)
es un inventario curado de las rutas de interés institucional, no el catálogo completo: el
catálogo completo y siempre al día es Swagger UI.
