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

## Datos iniciales y secretos

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
