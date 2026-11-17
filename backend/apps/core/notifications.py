from .models import NotificationOutbox
from django.db import transaction
from django.utils import timezone
import logging


logger = logging.getLogger(__name__)


def notify_users(users, title, content, filter_students=True):
    from apps.gestion_escuela.models import EscalafonItem
    from apps.gestion_provincial.models import ETAPAS_NOMBRES
    from apps.gestion_provincial.services.etapas import get_current_cycle_year

    current_year = get_current_cycle_year()
    candidates = [user for user in users if user and user.id]

    # Una sola consulta para saber que estudiantes estan en el escalafon del ano,
    # en vez de un `exists()` por usuario: `activate_stage` notifica a todo el
    # sistema y esto eran miles de consultas.
    students_in_escalafon = set()
    if filter_students and any(user.rol == "estudiante" for user in candidates):
        students_in_escalafon = set(
            EscalafonItem.objects.filter(
                escalafon__proceso__anio__year=current_year,
                escalafon__proceso__etapa__nombre=ETAPAS_NOMBRES[1],
                estudiante__usuario__isnull=False,
            ).values_list("estudiante__usuario_id", flat=True)
        )

    user_ids = {
        user.id
        for user in candidates
        if not (filter_students and user.rol == "estudiante" and user.id not in students_in_escalafon)
    }
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
        # Sin hilo propio: el timeout del broker (ver CELERY_BROKER_TRANSPORT_OPTIONS)
        # hace que `.delay()` falle rapido si Redis no responde. Las entradas quedan
        # en el outbox y `sweep_pending_notifications` las reencola.
        from .tasks import process_notification_batch
        try:
            process_notification_batch.delay(entry_ids)
        except Exception:
            logger.exception("No se pudo encolar el lote de notificaciones %s", entry_ids)

    transaction.on_commit(publish)
    return len(entry_ids)