import logging

from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_email_async(subject, message, recipient_list):
    """Encola el envío del correo en Celery (Redis); si el broker no responde, lo envía en el momento."""
    from .tasks import send_email_task

    try:
        send_email_task.delay(subject, message, list(recipient_list))
    except Exception:
        logger.exception("No se pudo encolar el correo '%s'; se envía de forma síncrona.", subject)
        send_mail(subject, message, None, list(recipient_list), fail_silently=False)
