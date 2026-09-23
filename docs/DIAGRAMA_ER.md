# Diagrama entidad-relación (ER)

Modelo de datos de IngresoSUP, generado a partir de los modelos reales de Django (`backend/apps/*/models.py`). Está en formato [Mermaid](https://mermaid.js.org/): GitHub y VS Code (con la extensión "Markdown Preview Mermaid Support") lo dibujan directamente.

**Cómo leerlo**

- Cada caja es una tabla y lista sus campos con su tipo. `PK` es la clave primaria, `FK` una clave foránea y `UK` un valor único.
- Las líneas son relaciones. En `A ||--o{ B` una fila de A se relaciona con muchas de B (por ejemplo, una escuela tiene muchos estudiantes). `|o` indica que la relación es opcional (el campo admite nulo) y `o|` que como mucho hay una fila relacionada (relación uno a uno).
- El diagrama está dividido por módulos para que sea legible. Una entidad de otro módulo que aparece vacía es solo una referencia: sus campos están en el módulo al que pertenece.
- Los campos con `FK` se guardan en la tabla como `<nombre>_id`.

## Vista general

```mermaid
erDiagram
    Provincia ||--o{ Municipio : "tiene"
    Municipio ||--o{ Escuela : "tiene"
    Escuela ||--o{ Estudiante : "matricula"
    Usuario ||--o| Estudiante : "cuenta de"
    Escuela ||--o{ Escalafon : "publica"
    Etapa ||--o{ Proceso : "define"
    Proceso ||--o{ Escalafon : "agrupa"
    Escalafon ||--o{ EscalafonItem : "lista"
    Estudiante ||--o{ EscalafonItem : "aparece en"
    Proceso ||--o{ PlanPlaza : "ofrece"
    Carrera ||--o{ PlanPlaza : "en"
    Estudiante ||--o{ BoletaSolicitud : "presenta"
    BoletaSolicitud ||--o{ BoletaSolicitudItem : "prioriza"
    PlanPlaza ||--o{ BoletaSolicitudItem : "elegida en"
    Estudiante ||--o{ ResultadoExamen : "obtiene"
    Estudiante ||--o{ Reclamacion : "presenta"
    Proceso ||--o{ Otorgamiento : "asigna"
```

Flujo principal: el territorio (provincia, municipio, escuela) organiza a los estudiantes y usuarios; cada **proceso** de ingreso pertenece a una **etapa** (escalafón, boleta de interés, plan de plazas y solicitud, confirmación de pruebas, resultados, otorgamiento); sobre cada proceso se publican escalafones, planes de plaza, boletas, resultados y otorgamientos.

## Cuentas y seguridad

App Django: `authentication`.

```mermaid
erDiagram
    Usuario {
        int id PK
        string password
        datetime last_login
        bool is_superuser
        string first_name
        string last_name
        bool is_staff
        bool is_active
        datetime date_joined
        string username UK
        string email UK
        bool email_verificado
        bool debe_cambiar_password
        bool politica_privacidad_aceptada
        datetime politica_privacidad_fecha_aceptacion
        string politica_privacidad_version
        string rol
        int provincia FK
        int municipio FK
        int escuela FK
        int pending_student FK
    }
    LoginAttempt {
        int id PK
        string identifier
        string ip
        int failed_attempts
        datetime locked_until
        datetime updated_at
    }
    EmailVerificationCode {
        int id PK
        int user FK
        string code
        datetime created_at
        datetime expires_at
        datetime used_at
    }
    Estudiante {
        int id PK
        int usuario FK,UK
        string ci UK
        string nombre
        string apellidos
        string sexo
        string direccion
        int escuela FK
        string whatsapp
        float indice_10
        float indice_11
        float indice_12
        float indice_general
        string tutor_nombre
        string tutor_email
        string tutor_telefono
    }
    RolPermiso {
        int id PK
        string rol
        string permiso
        string alcance
    }
    Escuela |o--o{ Usuario : "escuela"
    Escuela ||--o{ Estudiante : "escuela"
    Estudiante |o--o{ Usuario : "pending_student"
    Municipio |o--o{ Usuario : "municipio"
    Provincia |o--o{ Usuario : "provincia"
    Usuario ||--o{ EmailVerificationCode : "user"
    Usuario ||--o| Estudiante : "usuario"
```

## Territorio, catálogos e identidad visual

App Django: `superadmin`.

```mermaid
erDiagram
    Provincia {
        int id PK
        string nombre UK
        text descripcion
        bool activa
        datetime fecha_ultima_modificacion
    }
    Municipio {
        int id PK
        string nombre
        text descripcion
        int provincia FK
        bool activo
        datetime fecha_ultima_modificacion
    }
    Escuela {
        int id PK
        string nombre
        string codigo
        string descripcion
        int municipio FK
        bool activa
        datetime fecha_ultima_modificacion
    }
    Ces {
        int id PK
        string nombre
        text descripcion
        bool activa
        datetime fecha_ultima_modificacion
    }
    Carrera {
        int id PK
        string codigo UK
        string nombre
        text descripcion
        int ces FK
        int provincia FK
        bool activa
        datetime fecha_ultima_modificacion
    }
    Asignatura {
        int id PK
        string nombre
        text descripcion
        bool activa
        datetime fecha_ultima_modificacion
    }
    TipoOtorgamiento {
        int id PK
        string nombre UK
        text descripcion
        bool activa
        datetime fecha_ultima_modificacion
    }
    IdentidadVisual {
        int id PK
        text logo_url
        string nombre_sistema
        string tipografia
        string color_primario
        string color_secundario
        string color_acento
        string color_fondo
        string color_exito
        string color_error
        datetime fecha_creado
    }
    Ces ||--o{ Carrera : "ces"
    Municipio ||--o{ Escuela : "municipio"
    Provincia ||--o{ Carrera : "provincia"
    Provincia ||--o{ Municipio : "provincia"
```

## Proceso de ingreso: etapas, planes de plaza y otorgamiento

App Django: `gestion_provincial`.

```mermaid
erDiagram
    Etapa {
        int id PK
        string nombre UK
        date fecha_inicio
        date fecha_fin
        date fecha_matematica
        date fecha_espanol
        date fecha_historia
        string estado
    }
    Proceso {
        int id PK
        date anio
        int etapa FK
        bool config_consulta_nota_publica
        bool config_consulta_otorg_publico
    }
    PlanPlaza {
        int id PK
        int proceso FK
        int carrera FK
        int cantidad_plazas
        int otorgamiento_tipo FK
        int ces FK
        int provincia FK
        string sexo
    }
    Otorgamiento {
        int id PK
        int estudiante FK
        int proceso FK
        int carrera FK
        float indice_otorgamiento
    }
    CorteCarrera {
        int id PK
        int proceso FK
        int carrera FK
        float indice_corte
    }
    Carrera ||--o{ CorteCarrera : "carrera"
    Carrera ||--o{ Otorgamiento : "carrera"
    Carrera ||--o{ PlanPlaza : "carrera"
    Ces ||--o{ PlanPlaza : "ces"
    Estudiante ||--o{ Otorgamiento : "estudiante"
    Etapa ||--o{ Proceso : "etapa"
    Proceso ||--o{ CorteCarrera : "proceso"
    Proceso ||--o{ Otorgamiento : "proceso"
    Proceso ||--o{ PlanPlaza : "proceso"
    Provincia ||--o{ PlanPlaza : "provincia"
    TipoOtorgamiento ||--o{ PlanPlaza : "otorgamiento_tipo"
```

## Escalafón por escuela

App Django: `gestion_escuela`.

```mermaid
erDiagram
    Escalafon {
        int id PK
        int proceso FK
        int escuela FK
        date fecha_publicacion
        string estado
    }
    EscalafonItem {
        int id PK
        int escalafon FK
        int estudiante FK
        decimal indice_10
        decimal indice_11
        decimal indice_12
        decimal indice_general
        bool indices_bloqueados
        string estado
        text causa_revision
        datetime fecha_revision
    }
    Escalafon ||--o{ EscalafonItem : "escalafon"
    Escuela ||--o{ Escalafon : "escuela"
    Estudiante ||--o{ EscalafonItem : "estudiante"
    Proceso ||--o{ Escalafon : "proceso"
```

## Boletas, confirmaciones y resultados del estudiante

App Django: `gestion_personal`.

```mermaid
erDiagram
    BoletaInteres {
        int id PK
        int estudiante FK
        int proceso FK
        bool enviada
        date fecha_enviada
    }
    BoletaInteresItem {
        int id PK
        int boleta_interes FK
        int carrera FK
        int prioridad
    }
    BoletaSolicitud {
        int id PK
        int estudiante FK
        int proceso FK
        string estado
        date fecha_enviada
        string aprobada_por
        date fecha_aprobada
    }
    BoletaSolicitudItem {
        int id PK
        int boleta_solicitud FK
        int plan_plaza FK
        int prioridad
    }
    BoletaSolicitudItemAnterior {
        int id PK
        int boleta_solicitud FK
        int plan_plaza FK
        int prioridad
    }
    ConfirmacionPrueba {
        int id PK
        int estudiante FK
        int proceso FK
        int asignatura FK
        bool confirmada
        datetime fecha_prueba
    }
    ResultadoExamen {
        int id PK
        int estudiante FK
        int proceso FK
        int asignatura FK
        float nota
        date fecha_limite_reclamo
    }
    Reclamacion {
        int id PK
        int estudiante FK
        int resultado FK
        string descripcion
        string estado
        date fecha_solicitud
        date fecha_respuesta
        string lugar_presentacion
        datetime fecha_presentacion
    }
    Asignatura ||--o{ ConfirmacionPrueba : "asignatura"
    Asignatura ||--o{ ResultadoExamen : "asignatura"
    BoletaInteres ||--o{ BoletaInteresItem : "boleta_interes"
    BoletaSolicitud ||--o{ BoletaSolicitudItem : "boleta_solicitud"
    BoletaSolicitud ||--o{ BoletaSolicitudItemAnterior : "boleta_solicitud"
    Carrera ||--o{ BoletaInteresItem : "carrera"
    Estudiante ||--o{ BoletaInteres : "estudiante"
    Estudiante ||--o{ BoletaSolicitud : "estudiante"
    Estudiante ||--o{ ConfirmacionPrueba : "estudiante"
    Estudiante ||--o{ Reclamacion : "estudiante"
    Estudiante ||--o{ ResultadoExamen : "estudiante"
    PlanPlaza ||--o{ BoletaSolicitudItem : "plan_plaza"
    PlanPlaza ||--o{ BoletaSolicitudItemAnterior : "plan_plaza"
    Proceso ||--o{ BoletaInteres : "proceso"
    Proceso ||--o{ BoletaSolicitud : "proceso"
    Proceso ||--o{ ConfirmacionPrueba : "proceso"
    Proceso ||--o{ ResultadoExamen : "proceso"
    ResultadoExamen ||--o{ Reclamacion : "resultado"
```

## Auditoría y notificaciones

App Django: `core`.

```mermaid
erDiagram
    LogAuditoria {
        int id PK
        int usuario FK
        string usuario_nombre
        string rol
        string accion
        string modulo
        string entidad
        text datos_anteriores
        text datos_nuevos
        string ip
        datetime created_at
    }
    Notificacion {
        int id PK
        int usuario FK
        string titulo
        text contenido
        datetime fecha
        bool leida
    }
    NotificationOutbox {
        int id PK
        int usuario FK
        string titulo
        text contenido
        string estado
        int intentos
        text ultimo_error
        datetime disponible_en
        int notificacion FK,UK
        datetime creado_en
        datetime enviado_en
    }
    Notificacion ||--o| NotificationOutbox : "notificacion"
    Usuario |o--o{ LogAuditoria : "usuario"
    Usuario ||--o{ Notificacion : "usuario"
    Usuario ||--o{ NotificationOutbox : "usuario"
```

## Cómo mantener este documento actualizado

El diagrama se generó leyendo los modelos con la introspección de Django (`apps.get_models()`, campos y relaciones reales). Cuando cambien los modelos, hay que regenerarlo o editar a mano las cajas afectadas. Si en algún momento se prefiere una imagen, se puede exportar con `python manage.py graph_models` (paquete `django-extensions`) o pegando estos bloques en el editor de <https://mermaid.live>.
