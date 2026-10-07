from .models import NotificationOutbox
from django.conf import settings
from django.db import transaction
from django.utils import timezone
import logging
import threading


logger = logging.getLogger(__name__)


def notify_users(users, title, content, filter_students=True):
    from apps.gestion_escuela.models import EscalafonItem
    from apps.gestion_provincial.models import ETAPAS_NOMBRES

    current_year = timezone.now().year
    valid_users = []
    for user in users:
        if not user or not user.id:
            continue
        if filter_students and user.rol == "estudiante" and not EscalafonItem.objects.filter(
            estudiante__usuario=user,
            escalafon__proceso__anio__year=current_year,
            escalafon__proceso__etapa__nombre=ETAPAS_NOMBRES[1],
        ).exists():
            continue
        valid_users.append(user)

    user_ids = {user.id for user in valid_users}
    if not user_ids:
        return 0

    entries = NotificationOutbox.objects.bulk_create([
        NotificationOutbox(
            usuario_id=user_id,
            titulo=title,
            contenido=content,
            disponible_en=timezone.now(),
        )
        for user_id in user_ids
    ])
    entry_ids = [entry.id for entry in entries]

    def publish():
        from .tasks import process_notification_batch
        try:
            process_notification_batch.delay(entry_ids)
        except Exception:
            logger.exception("No se pudo encolar el lote de notificaciones %s", entry_ids)

    def enqueue_notifications():
        # Se despacha en un hilo aparte (salvo en modo eager, usado en los tests) para que la
        # petición HTTP que disparó la notificación no quede bloqueada si el broker no responde.
        if settings.CELERY_TASK_ALWAYS_EAGER:
            publish()
        else:
            threading.Thread(target=publish, daemon=True).start()

    transaction.on_commit(enqueue_notifications)
    return len(entry_ids)