from django.core import mail
from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch
from celery.exceptions import Retry

from apps.authentication.models import Usuario

from rest_framework.test import APIClient

from .models import LogAuditoria, NotificationOutbox, Notificacion
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


class BackupServiceTests(TestCase):
    def test_sqlite_backup_creates_verifiable_copy(self):
        import tempfile
        from pathlib import Path
        from django.test import override_settings
        from apps.core.services import backups

        with tempfile.TemporaryDirectory() as tmp, override_settings(BACKUP_DIR=Path(tmp)):
            target = backups.create_backup()
            self.assertTrue(target.exists())
            self.assertTrue(Path(str(target) + ".sha256").exists())
            counts = backups.verify_backup(target)
            self.assertGreater(counts["django_migrations"], 0)

    def test_corrupted_backup_is_detected(self):
        import tempfile
        from pathlib import Path
        from django.test import override_settings
        from apps.core.services import backups

        with tempfile.TemporaryDirectory() as tmp, override_settings(BACKUP_DIR=Path(tmp)):
            target = backups.create_backup()
            target.write_bytes(target.read_bytes() + b"corrupto")
            with self.assertRaises(backups.BackupError):
                backups.verify_backup(target)

    def test_retention_keeps_recent_weekly_and_monthly(self):
        from pathlib import Path
        from apps.core.services.backups import select_backups_to_keep

        names = [f"ingresosup-2026{month:02d}{day:02d}-020000.dump" for month in (7, 8, 9) for day in (1, 8, 15, 22, 28)]
        paths = [Path(name) for name in names]
        kept = {p.name for p in select_backups_to_keep(paths, daily=3, weekly=2, monthly=2)}
        self.assertIn("ingresosup-20260928-020000.dump", kept)
        self.assertLess(len(kept), len(paths))
        self.assertNotIn("ingresosup-20260701-020000.dump", kept)


class AuditNoDuplicateTests(TestCase):
    """El middleware ya no añade una fila genérica cuando la vista registró la
    acción con su nombre concreto, y `entidad` guarda el recurso afectado."""

    def setUp(self):
        from apps.superadmin.models import Escuela, Municipio, Provincia

        province = Provincia.objects.create(nombre="Provincia auditada")
        municipality = Municipio.objects.create(nombre="Municipio auditado", provincia=province)
        school = Escuela.objects.create(nombre="Escuela auditada", municipio=municipality)
        self.user = Usuario.objects.create_user(
            username="audit.user", email="audit.user@example.com", password="Secreta1234",
            rol="estudiante", escuela=school, municipio=municipality, provincia=province,
            email_verificado=True,
        )

    def test_el_login_deja_una_sola_fila(self):
        LogAuditoria.objects.all().delete()
        client = APIClient()
        response = client.post(
            "/api/v1/authentication/login/",
            {"username": "audit.user", "password": "Secreta1234"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        acciones = list(LogAuditoria.objects.values_list("accion", flat=True))
        self.assertEqual(acciones, ["Inicio de sesión"], acciones)

    def test_las_consultas_se_siguen_auditando(self):
        LogAuditoria.objects.all().delete()
        client = APIClient()
        client.force_authenticate(self.user)
        for _ in range(2):
            client.get("/api/v1/authentication/me/")
        self.assertEqual(LogAuditoria.objects.count(), 2)

    def test_entidad_guarda_el_recurso_no_el_rol(self):
        from apps.core.audit import record_audit

        record_audit(self.user, "Prueba", "/api/v1/superadmin/usuarios/")
        entry = LogAuditoria.objects.latest("created_at")
        self.assertEqual(entry.entidad, "usuario")
        self.assertEqual(entry.rol, "estudiante")
