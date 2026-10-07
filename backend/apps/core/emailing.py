import logging
import threading

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_email_async(subject, message, recipient_list):
    """Encola el envío del correo en Celery (Redis); si el broker no responde, lo envía en el momento.

    El despacho ocurre en un hilo aparte (salvo en modo eager, usado en los tests) para que una
    petición HTTP nunca quede bloqueada esperando a Celery o al servidor SMTP: si el broker no
    responde, `.delay()` puede tardar mucho en fallar, y el fallback síncrono de `send_mail` no
    tiene timeout por defecto.
    """
    from .tasks import send_email_task

    def deliver():
        try:
            send_email_task.delay(subject, message, list(recipient_list))
        except Exception:
            logger.exception("No se pudo encolar el correo '%s'; se envía de forma síncrona.", subject)
            send_mail(subject, message, None, list(recipient_list), fail_silently=False)

    if settings.CELERY_TASK_ALWAYS_EAGER:
        deliver()
    else:
        threading.Thread(target=deliver, daemon=True).start()
