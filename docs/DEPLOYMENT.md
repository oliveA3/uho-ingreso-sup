# Despliegue y operación en producción

Esta guía reúne los pasos necesarios para desplegar IngresoSUP. Compleméntala con [SECURITY.md](SECURITY.md) antes de publicar el sistema.

## Requisitos

- Python compatible con las dependencias de `backend/requirements.txt`.
- Una base de datos respaldada y accesible por el backend.
- Redis accesible desde el backend y el worker Celery.
- Un servidor SMTP institucional o proveedor transaccional.
- Un proxy HTTPS y un servidor WSGI/ASGI para el backend.
- Un servidor web para los archivos compilados del frontend.

## Variables de entorno

Define los secretos en el gestor de configuración de la plataforma, nunca en el repositorio:

```env
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=<clave-larga-y-aleatoria>
DJANGO_ALLOWED_HOSTS=api.ingresosup.cu

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.institucion.cu
EMAIL_PORT=587
EMAIL_HOST_USER=<usuario-smtp>
EMAIL_HOST_PASSWORD=<secreto-smtp>
EMAIL_USE_TLS=true
DEFAULT_FROM_EMAIL=no-reply@ingresosup.cu

CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
```

Configura los dominios reales del frontend en `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS` de `backend/backend/settings.py`. Si frontend y backend están separados, crea `frontend/.env.production` con:

```env
VITE_API_ORIGIN=https://api.ingresosup.cu
```

## Preparar y publicar

```bash
cd backend
python -m pip install -r requirements.txt
python manage.py check --deploy
python manage.py migrate --noinput
python manage.py collectstatic --noinput
```

Sirve el backend con Gunicorn, Uvicorn o el servidor WSGI/ASGI equivalente de la plataforma. No uses `python manage.py runserver` en producción. Compila el frontend y publica `frontend/dist` detrás de HTTPS:

```bash
cd frontend
npm ci
npm run build
```

El proxy debe reenviar `X-Forwarded-Proto: https`. En modo producción Django activa HTTPS y cookies seguras.

## Redis y Celery

Las notificaciones masivas de `apps/core` se escriben primero en `NotificationOutbox` y se procesan en segundo plano. Redis debe estar disponible antes del worker. Mantén ambos procesos supervisados y con reinicio automático:

```bash
redis-server
cd backend
celery -A backend worker --loglevel=INFO
```

El proceso web, Redis y el worker deben ejecutarse como servicios separados en systemd, Docker, Supervisor o el mecanismo equivalente de la plataforma.

Si Redis o el worker estuvieron detenidos, las notificaciones permanecen en la base de datos. Cuando el servicio vuelva a estar disponible, reencólalas:

```bash
cd backend
python manage.py enqueue_notifications --limit 500
```

Programa este comando periódicamente como mecanismo de recuperación y supervisa los estados `failed`, `intentos` y `ultimo_error` de `core_notificationoutbox`. Revisa también los logs del worker y del proveedor SMTP.

## Datos iniciales

No ejecutes la semilla de `test_data/` en producción sin revisar su contenido y sus credenciales. Realiza una copia de seguridad antes de cada migración y conserva un procedimiento probado de restauración.

## Validación posterior

Comprueba como mínimo:

- `https://api.ingresosup.cu/api/v1/health/` responde correctamente.
- La documentación API no expone información sensible.
- El login, la verificación de correo y el envío SMTP funcionan.
- Redis acepta conexiones y el worker responde a tareas.
- Las notificaciones masivas pasan de `pending` a `sent`.
- El frontend carga desde HTTPS y puede comunicarse con el API.
- Los logs, las copias de seguridad y las alertas están activos.

## Servicios externos

- **Redis 7+**: define `REDIS_URL` (p. ej. `redis://localhost:6379`). Se usa como caché (base 1, rate limiting) y como broker de Celery (base 0). En desarrollo, si `DJANGO_DEBUG=true` y no hay `REDIS_URL`, se usa caché local en memoria.
- **Correo de notificaciones** (`EMAIL_PROVIDER`): `mailtrap` (desarrollo, con `MAILTRAP_USER` y `MAILTRAP_PASSWORD`), `sendgrid` (producción, con `SENDGRID_API_KEY`), `smtp` (SMTP institucional, con `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`) o `console`. Ajusta también `DEFAULT_FROM_EMAIL`.
- **PDF (WeasyPrint)**: requiere las librerías nativas Pango/GTK. En Debian/Ubuntu: `apt install libpango-1.0-0 libpangoft2-1.0-0`. En Windows, instala el runtime GTK3 (ver la guía de instalación de WeasyPrint). Si no están disponibles, el sistema cae a un generador PDF básico y registra un aviso.
- **Documentación API**: Swagger UI en `/api/v1/docs/` y esquema OpenAPI 3.0 en `/api/v1/schema/`.
- **Base de datos**: SQLite por defecto en desarrollo. Para PostgreSQL define `DB_ENGINE=postgresql`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.
- **Archivos**: `STATIC_ROOT` (por defecto `backend/staticfiles`) y `MEDIA_ROOT` (por defecto `backend/media`) son configurables por entorno.
- **Cola de tareas (Celery + Redis)**: las notificaciones y los correos de autenticación (verificación, bienvenida, política de privacidad) se envían de forma asíncrona. Arranca el worker con `celery -A backend worker -l info`.
- **Importaciones Excel asíncronas**: las 6 importaciones (plan de plazas, otorgamientos, cortes, carreras, escalafón, resultados) se encolan en Celery y el cliente consulta `GET /api/v1/import-export/tareas/<task_id>/`; sin `celery -A backend worker -l info` en ejecución permanecen en estado `pendiente`. Los archivos temporales se guardan en `MEDIA_ROOT/imports/` y se eliminan al terminar.

## Copias de seguridad de la base de datos

**Estado: el mecanismo está implementado pero NO está programado.** Las copias no se harán solas hasta que se active una de las opciones de "Programación" más abajo. Requisito del sistema: copia automática con frecuencia mínima diaria y procedimientos de restauración documentados y verificados.

### Qué hay implementado

| Pieza | Ubicación |
|---|---|
| Lógica (copia, suma, retención, verificación) | `backend/apps/core/services/backups.py` |
| Comando de copia | `python manage.py backup_database` |
| Comando de verificación de restauración | `python manage.py verify_backup [ruta]` |
| Tareas Celery (para programarlas) | `backup_database_task` y `verify_backup_task` en `backend/apps/core/tasks.py` |

- **PostgreSQL (producción):** `pg_dump -Fc` (formato comprimido personalizado), archivo `ingresosup-AAAAMMDD-HHMMSS.dump`.
- **SQLite (desarrollo):** copia consistente con la API de copia de SQLite, comprimida en `ingresosup-AAAAMMDD-HHMMSS.sqlite3.gz`.
- Cada copia genera un archivo `.sha256` con su suma de verificación.
- Si se define `BACKUP_REMOTE_DIR`, la copia y su suma se duplican allí (ver "Copia fuera del servidor").
- Tras cada copia se aplica la retención (borra las que sobran).

### Variables de entorno

| Variable | Por defecto | Descripción |
|---|---|---|
| `BACKUP_DIR` | `backend/backups` | Carpeta local de copias (ignorada por Git). |
| `BACKUP_REMOTE_DIR` | vacío | Ruta de un destino externo ya montado (disco de red, NFS, unidad remota). |
| `BACKUP_KEEP_DAILY` | 7 | Cuántas copias recientes conservar. |
| `BACKUP_KEEP_WEEKLY` | 4 | Se conserva la última copia de cada una de las últimas N semanas. |
| `BACKUP_KEEP_MONTHLY` | 12 | Se conserva la última copia de cada uno de los últimos N meses. |

### Requisitos en el servidor de producción

1. Cliente de PostgreSQL con `pg_dump`, `pg_restore`, `createdb`, `dropdb` y `psql` en el `PATH` (paquete `postgresql-client`, misma versión mayor que el servidor).
2. El usuario de base de datos (`DB_USER`) debe poder leer todas las tablas y, para la verificación, tener el permiso `CREATEDB` (se crea y elimina una base temporal `verify_restore_*`).
3. La carpeta `BACKUP_DIR` debe pertenecer al usuario que ejecuta la aplicación, con permisos `700` (las copias contienen datos personales y contraseñas cifradas).

### Ejecución manual (prueba inicial, hazla antes de programar nada)

```bash
cd backend
python manage.py backup_database      # crea la copia y aplica la retención
python manage.py verify_backup        # restaura la más reciente en una base temporal y valida
```

`verify_backup` comprueba (1) la suma SHA-256, (2) que la copia se restaura sin errores y (3) que contiene datos (tablas de usuarios, etapas y migraciones con filas). Si algo falla, el comando termina con error (código distinto de 0).

### Programación (para activarla cuando corresponda)

Opción A, con Celery Beat (ya se usa Celery + Redis). Añade en `backend/settings.py`:

```python
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    "copia-diaria-bd": {"task": "apps.core.tasks.backup_database_task", "schedule": crontab(hour=2, minute=0)},
    "verificar-restauracion-semanal": {"task": "apps.core.tasks.verify_backup_task", "schedule": crontab(hour=4, minute=0, day_of_week="sunday")},
}
```

y arranca, además del worker, el planificador: `celery -A backend beat -l info`.

Opción B, con `cron` (no depende de Celery):

```cron
0 2 * * *  cd /ruta/backend && /ruta/.venv/bin/python manage.py backup_database   >> /var/log/ingresosup-backup.log 2>&1
0 4 * * 0  cd /ruta/backend && /ruta/.venv/bin/python manage.py verify_backup     >> /var/log/ingresosup-backup.log 2>&1
```

Recomendación: copia diaria en horario de baja carga (02:00) y verificación de restauración semanal, además de una prueba completa manual al menos una vez al trimestre.

### Copia fuera del servidor (obligatoria en producción)

Una copia que solo existe en el mismo servidor no protege de un fallo de disco, un incendio o un ataque. Monta un destino externo y apunta `BACKUP_REMOTE_DIR` a él (disco de red/NFS, SMB, un volumen de otro servidor). Para SFTP o almacenamiento en la nube (S3, etc.) se puede sincronizar `BACKUP_DIR` con `rclone`/`rsync` tras la copia; el servicio ya deja el archivo y su `.sha256` listos. Si las copias salen de la institución, cífralas (por ejemplo con `gpg --symmetric`) antes de sacarlas.

### Procedimiento de restauración (runbook)

**Objetivos:** pérdida máxima de datos (RPO) de 24 horas; tiempo de recuperación (RTO) estimado de menos de 1 hora para una base de tamaño medio (confirmar en la primera prueba real y anotarlo).

1. **Avisar y detener la aplicación** (servidor web y workers de Celery) para que nadie escriba durante la restauración.
2. **Elegir la copia:** la más reciente en `BACKUP_DIR` o `BACKUP_REMOTE_DIR` (`ls -1t`). Comprobar la suma: `sha256sum -c ingresosup-AAAAMMDD-HHMMSS.dump.sha256`.
3. **Conservar el estado actual** por si hace falta volver atrás: `pg_dump -Fc -h HOST -U USUARIO NOMBRE_BD -f antes-de-restaurar.dump`.
4. **Recrear la base:**
   ```bash
   dropdb   -h HOST -U USUARIO NOMBRE_BD
   createdb -h HOST -U USUARIO NOMBRE_BD
   pg_restore --no-owner -h HOST -U USUARIO -d NOMBRE_BD ingresosup-AAAAMMDD-HHMMSS.dump
   ```
5. **Aplicar migraciones pendientes** (por si la copia es de una versión anterior): `python manage.py migrate`.
6. **Comprobar:** `python manage.py check`, iniciar sesión con un superadministrador y revisar el panel (etapas, usuarios y una escuela de prueba).
7. **Reiniciar** aplicación y workers, y comunicar que el servicio se restableció, indicando la fecha y hora de la copia usada (los datos posteriores se pierden).
8. **Registrar** la restauración en la tabla de abajo.

Para SQLite (solo desarrollo): descomprimir (`gunzip -k copia.sqlite3.gz`) y sustituir `backend/db.sqlite3` por el archivo obtenido con la aplicación detenida.

### Registro de pruebas de restauración

Anota cada verificación real (automática o manual) para demostrar que el procedimiento funciona:

| Fecha | Copia usada | Método (auto / manual) | Resultado | Duración | Responsable |
|---|---|---|---|---|---|
| _pendiente_ | | | | | |

### Monitorización

- Los comandos terminan con error si algo falla; en `cron` redirige la salida a un log y revísalo, o configura `MAILTO`. Con Celery, los fallos quedan en el log del worker.
- Los eventos se registran con el logger `backups`.
- Comprueba periódicamente que la copia más reciente no tenga más de 24-26 horas.
