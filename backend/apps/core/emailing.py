import logging

from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_email_async(subject, message, recipient_list):
    """Encola el envío del correo en Celery; si el broker no responde, lo envía en el momento.

    No se usa un hilo por correo: `broker_transport_options.socket_timeout` (ver
    settings) hace que `.delay()` falle rápido cuando Redis no está disponible, así
    que la petición HTTP no se queda esperando. Un hilo por envío creaba hilos sin
    límite y perdía los correos en vuelo al apagar el proceso.
    """
    from .tasks import send_email_task

    try:
        send_email_task.delay(subject, message, list(recipient_list))
    except Exception:
        logger.exception("No se pudo encolar el correo '%s'; se envía de forma síncrona.", subject)
        try:
            send_mail(subject, message, None, list(recipient_list), fail_silently=False)
        except Exception:
            logger.exception("Tampoco se pudo enviar el correo '%s' de forma síncrona.", subject)
