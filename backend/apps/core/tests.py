from django.core import mail
from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch
from celery.exceptions import Retry

from apps.authentication.models import Usuario

from .models import NotificationOutbox, Notificacion
from .notifications import notify_users
from .tasks import process_notification_batch


class NotificationQueueTests(TestCase):
    def setUp(self):
        self.user = Usuario.objects.create_user(
            username="queued.notification",
            email="queued@example.com",
            password="secret1234",
            rol="superadmin",
        )

    def test_notify_users_processes_delivery_in_background_task(self):
        created = notify_users(
            [self.user],
            "Aviso de prueba",
            "Contenido de prueba",
            filter_students=False,
        )

        self.assertEqual(created, 1)
        entry = NotificationOutbox.objects.get(usuario=self.user)
        self.assertEqual(entry.estado, NotificationOutbox.PENDING)
        self.assertEqual(Notificacion.objects.count(), 0)

        result = process_notification_batch([entry.id])

        entry.refresh_from_db()
        self.assertEqual(result["processed"], 1)
        self.assertEqual(entry.estado, NotificationOutbox.SENT)
        self.assertEqual(Notificacion.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)

    def test_failed_email_keeps_outbox_for_retry(self):
        entry = NotificationOutbox.objects.create(
            usuario=self.user,
            titulo="Aviso fallido",
            contenido="Contenido",
            disponible_en=timezone.now(),
        )

        with patch("apps.core.tasks.send_mail", side_effect=RuntimeError("SMTP caído")):
            with self.assertRaises(Retry):
                process_notification_batch([entry.id])

        entry.refresh_from_db()
        self.assertEqual(entry.estado, NotificationOutbox.FAILED)
        self.assertTrue(entry.ultimo_error)
