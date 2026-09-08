# IngresoSUP

IngresoSUP es la base arquitectónica del sistema de ingreso a la Educación Superior en Cuba. El proyecto se diseña como una solución modular con backend Django REST y frontend React + Vite + Tailwind.

## Alcance inicial

- Backend Django en `backend/` con una aplicación central `core`.
- Autenticación basada en sesiones y roles (RBAC) según el ERS.
- Registro de estudiantes y login real contra la API de Django.
- Administración mínima de roles y auditoría de cambios en asignación de roles.
- Modelo de datos con usuario extendido, roles, provincias, municipios, escuelas, carreras y nomencladores básicos.
- Frontend React + Vite en `frontend/` con una landing page responsive y accesible.
- Documentación inicial en `docs/README.md`.

## Arquitectura

- `backend/`: API REST, modelo de dominio, autenticación y permisos intermedios.
- `frontend/`: SPA React que consumirá exclusivamente endpoints JSON.
- `docs/`: guías de despliegue y roadmap.

## Dependencias clave

- Backend: Django, Django REST framework, django-cors-headers.
- Frontend: React, Vite, TailwindCSS, Axios.

## Guía de despliegue local

1. Instalar Python 3.10+.
2. Crear un entorno virtual:

   ```bash
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```

3. Instalar dependencias frontend y levantar la app:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Acceder al frontend en la URL que devuelva Vite y al backend en `http://127.0.0.1:8000/api/`.

5. La carpeta `test_data` en la raíz del proyecto contiene datos de prueba para importar: catálogo de carreras de ejemplo, escalafón de una escuela, plan de plazas de una provincia, resultados en las Pruebas de Ingreso de matematica, español e historia (separados), ejemplo de otorgamientos y cortes de carreras.

### Configuración del correo de verificación

El registro estudiantil y el cambio de correo mientras se espera el código utilizan `send_mail` de Django. En desarrollo, como `DEBUG=True`, el proyecto usa por defecto el backend de consola: el código aparece en la terminal donde se ejecuta Django.

Para enviar los códigos a correos reales, configura estas variables de entorno antes de iniciar el backend:

```powershell
$env:EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend"
$env:EMAIL_HOST="smtp.example.com"
$env:EMAIL_PORT="587"
$env:EMAIL_HOST_USER="tu-correo@example.com"
$env:EMAIL_HOST_PASSWORD="tu-contraseña-o-clave-de-aplicacion"
$env:EMAIL_USE_TLS="true"
$env:DEFAULT_FROM_EMAIL="tu-correo@example.com"
python manage.py runserver
```

Sustituye los valores por los proporcionados por tu servidor de correo. Estas variables deben configurarse en la misma terminal desde la que se ejecuta Django; en producción también debes cambiar `SECRET_KEY`, desactivar `DEBUG` y revisar la configuración de seguridad.

El endpoint `POST /api/authentication/change-pending-email/` permite cambiar el correo de una cuenta que todavía no fue verificada. Recibe `username` y `email`, invalida el código anterior y envía un código nuevo al correo actualizado.

## Rutas de autenticación

- `POST /api/authentication/login/` — iniciar sesión.
- `POST /api/authentication/register/` — registro de estudiante.
- `POST /api/authentication/logout/` — cerrar sesión.
- `GET /api/authentication/me/` — obtener usuario autenticado.
- `GET /api/roles/admin/` — administración de roles para Super Administrador.
- `GET /api/audit/logs/` — consultar logs de cambios de rol (Super Administrador).

## Roadmap de módulos

- [x] Estructura base de backend Django
- [x] Conexión de datos reales con APIs REST y backend
- [ ] Implementar JWT y Single Page App auth completa
- [x] Modelo de usuario extendido y roles RBAC
- [x] Endpoints de login/logout y sesión
- [x] Estructura base del frontend React
- [x] Landing page con secciones de noticias, plazas, cortes y oferta académica
- [x] Dashboards según roles
- [x] Módulo de gestión de admisión por etapas
- [x] Módulo de escalafón
- [x] Módulo de boletas
- [x] Módulo de confirmación de pruebas
- [x] Módulo de resultados
- [x] Módulo de otorgamiento y corte
- [x] Módulo de reportes