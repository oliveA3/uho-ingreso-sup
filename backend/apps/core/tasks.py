from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import NotificationOutbox, Notificacion


# Una entrada marcada PROCESSING cuyo worker murio antes de terminar quedaria
# fuera del filtro de reintento para siempre: pasado este margen se reclama.
STALE_PROCESSING_MINUTES = 10


@shared_task(bind=True, max_retries=3)
def process_notification_batch(self, entry_ids):
    now = timezone.now()
    stale_before = now - timedelta(minutes=STALE_PROCESSING_MINUTES)
    pending_entries = NotificationOutbox.objects.filter(
        Q(estado__in=[NotificationOutbox.PENDING, NotificationOutbox.FAILED])
        | Q(estado=NotificationOutbox.PROCESSING, disponible_en__lte=stale_before),
        id__in=entry_ids,
        disponible_en__lte=now,
    )
    failed_ids = []
    processed = 0

    for entry_id in pending_entries.values_list("id", flat=True):
        try:
            with transaction.atomic():
                entry = NotificationOutbox.objects.select_for_update().select_related("usuario").get(pk=entry_id)
                reclaimable = (
                    entry.estado in {NotificationOutbox.PENDING, NotificationOutbox.FAILED}
                    or (entry.estado == NotificationOutbox.PROCESSING and entry.disponible_en <= stale_before)
                )
                if not reclaimable or entry.disponible_en > timezone.now():
                    continue
                entry.estado = NotificationOutbox.PROCESSING
                entry.intentos += 1
                entry.ultimo_error = ""
                entry.save(update_fields=["estado", "intentos", "ultimo_error"])
                if entry.notificacion_id is None:
                    notification = Notificacion.objects.create(
                        usuario=entry.usuario,
                        titulo=entry.titulo,
                        contenido=entry.contenido,
                    )
                    entry.notificacion = notification
                    entry.save(update_fields=["notificacion"])

            if entry.usuario.email:
                send_mail(
                    subject=entry.titulo,
                    message=entry.contenido,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[entry.usuario.email],
                    fail_silently=False,
                )
            entry.estado = NotificationOutbox.SENT
            entry.enviado_en = timezone.now()
            entry.save(update_fields=["estado", "enviado_en"])
            processed += 1
        except Exception as error:
            NotificationOutbox.objects.filter(pk=entry_id).update(
                estado=NotificationOutbox.FAILED,
                ultimo_error=str(error)[:4000],
                disponible_en=timezone.now() + timedelta(minutes=1),
            )
            failed_ids.append(entry_id)

    if failed_ids and self.request.retries < self.max_retries:
        raise self.retry(args=[failed_ids], countdown=60)

    return {"processed": processed, "failed": len(failed_ids)}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(self, subject, message, recipient_list):
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipient_list, fail_silently=False)
    except Exception as error:
        raise self.retry(exc=error)


@shared_task
def backup_database_task():
    """Copia de seguridad diaria. Programada en `backend/celery.py` (requiere Celery Beat)."""
    from .services.backups import create_backup

    return str(create_backup())


@shared_task
def verify_backup_task():
    """Restauración de prueba de la última copia. No programada: ejecútala a mano antes de un despliegue."""
    from .services.backups import verify_backup

    return verify_backup()


@shared_task
def sweep_pending_notifications():
    """Reencola notificaciones pendientes, fallidas o atascadas en PROCESSING.

    `process_notification_batch` solo mira los ids de su lote; si un worker muere
    esas entradas no vuelven a intentarse nunca. Esta pasada periódica las recoge.
    """
    now = timezone.now()
    stale_before = now - timedelta(minutes=STALE_PROCESSING_MINUTES)
    stuck = list(
        NotificationOutbox.objects.filter(
            Q(estado__in=[NotificationOutbox.PENDING, NotificationOutbox.FAILED])
            | Q(estado=NotificationOutbox.PROCESSING, disponible_en__lte=stale_before),
            disponible_en__lte=now,
        ).values_list("id", flat=True)[:500]
    )
    if stuck:
        process_notification_batch.delay(stuck)
    return len(stuck)
