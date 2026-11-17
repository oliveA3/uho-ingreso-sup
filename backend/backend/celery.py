import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

app = Celery("backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Tareas periodicas. Requiere un proceso de Celery Beat aparte del worker:
#   celery -A backend beat -l info
# Ver docs/DEPLOYMENT.md. Sin Beat el sistema sigue funcionando, pero las etapas
# vencidas no se cierran en la base (las vistas ya las tratan como cerradas), las
# notificaciones atascadas no se reencolan y no se hacen copias de seguridad.
app.conf.beat_schedule = {
    "cerrar-etapas-vencidas": {
        "task": "apps.gestion_provincial.tasks.close_expired_stages_task",
        "schedule": crontab(hour=0, minute=10),
    },
    "reencolar-notificaciones-atascadas": {
        "task": "apps.core.tasks.sweep_pending_notifications",
        "schedule": crontab(minute="*/15"),
    },
    "copia-de-seguridad-diaria": {
        "task": "apps.core.tasks.backup_database_task",
        "schedule": crontab(hour=2, minute=0),
    },
}
