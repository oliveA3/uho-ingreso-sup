import io
import importlib
from datetime import date
from unittest.mock import Mock, patch

from django.test import TestCase
from openpyxl import Workbook
from rest_framework.test import APIClient

from apps.authentication.models import EmailVerificationCode, Estudiante, Usuario
from apps.gestion_escuela.models import Escalafon, EscalafonItem
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, Proceso
from apps.import_export.services.escalafon_service import EscalafonExcelService
from apps.superadmin.models import Escuela, Municipio, Provincia


class EscalafonMigrationTests(TestCase):
    def test_existing_escalafon_year_is_migrated_to_a_process(self):
        migration = importlib.import_module(
            "apps.gestion_escuela.migrations.0003_escalafon_proceso"
        )
        escalafon = Mock(anio=2024)
        escalafon_model = Mock()
        escalafon_model.objects.all.return_value.iterator.return_value = [escalafon]
        proceso_model = Mock()
        proceso_model.objects.get_or_create.return_value = (Mock(id=42), True)
        app_registry = Mock()
        app_registry.get_model.side_effect = [escalafon_model, proceso_model]

        migration.migrate_years_to_processes(app_registry, None)

        proceso_model.objects.get_or_create.assert_called_once_with(
            anio=date(2024, 1, 1)
        )
        self.assertEqual(escalafon.proceso_id, 42)
        escalafon.save.assert_called_once_with(update_fields=["proceso"])


class EscalafonTests(TestCase):
	def setUp(self):
		self.provincia = Provincia.objects.create(nombre="Villa Clara")
		self.municipio = Municipio.objects.create(nombre="Santa Clara", provincia=self.provincia)
		self.escuela = Escuela.objects.create(nombre="IPVCE", municipio=self.municipio)
		self.etapa = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
		self.proceso = Proceso.objects.create(anio=date(2026, 1, 1), etapa=self.etapa)

	def make_workbook(self, rows):
		workbook = Workbook()
		worksheet = workbook.active
		worksheet.append([
			"CI", "Nombre", "Apellidos", "Sexo", "Dirección",
			"Índice_10mo", "Índice_11mo", "Índice_12mo", "Índice_General",
		])
		for row in rows:
			worksheet.append(row)
		output = io.BytesIO()
		workbook.save(output)
		output.seek(0)
		return output

	def test_import_creates_escalafon_and_student_profile(self):
		result = EscalafonExcelService().import_file(
			self.make_workbook([["12345678901", "Ana", "Pérez", "F", "Calle 1", 90, 91.25, 92, 91.5]]),
			self.escuela,
			self.proceso,
		)

		self.assertEqual(result.errors, [])
		self.assertEqual(result.inserted, 1)
		student = Estudiante.objects.get(ci="12345678901")
		self.assertEqual(student.nombre, "Ana")
		self.assertIsNone(student.usuario_id)

	def test_import_rejects_invalid_ci_and_duplicate_ci(self):
		result = EscalafonExcelService().import_file(
			self.make_workbook([
				["123", "Ana", "Pérez", "F", "Calle 1", 90, 91, 92, 91],
				["12345678901", "Luis", "Díaz", "M", "Calle 2", 90, 91, 92, 91],
				["12345678901", "Otra", "Persona", "F", "Calle 3", 90, 91, 92, 91],
			]),
			self.escuela,
			self.proceso,
		)

		self.assertEqual(result.inserted, 0)
		self.assertEqual(len(result.errors), 2)
		self.assertEqual(Escalafon.objects.count(), 0)
		self.assertEqual(Estudiante.objects.count(), 0)

	def test_registration_requires_current_year_escalafon_and_links_student(self):
		EscalafonExcelService().import_file(
			self.make_workbook([["12345678901", "Ana", "Pérez", "F", "Calle 1", 90, 91, 92, 91]]),
			self.escuela,
			self.proceso,
		)
		from apps.authentication.models import EmailVerificationCode
		from apps.authentication.serializers import RegisterSerializer

		serializer = RegisterSerializer(data={
			"ci": "12345678901", "escuela": self.escuela.pk,
			"email": "ana@example.com", "username": "ana2026", "password": "secret1234",
			"politica_privacidad_aceptada": True,
		})
		self.assertTrue(serializer.is_valid(), serializer.errors)
		user = serializer.save()
		self.assertFalse(user.is_active)

		# El registro deja la cuenta pendiente; el vínculo con el estudiante
		# solo se confirma al verificar el correo con el código enviado.
		verification = EmailVerificationCode.objects.get(user=user)
		client = APIClient()
		verify_response = client.post(
			"/api/v1/authentication/verify-email/",
			{"username": user.username, "code": verification.code},
			format="json",
		)
		self.assertEqual(verify_response.status_code, 200, verify_response.content)

		student = Estudiante.objects.get(ci="12345678901")
		user.refresh_from_db()
		self.assertEqual(student.usuario_id, user.id)
		self.assertEqual(user.first_name, "Ana")
		self.assertEqual(user.last_name, "Pérez")

	def test_students_without_account_are_scoped_to_secretary_school(self):
		other_school = Escuela.objects.create(nombre="ESBU", municipio=self.municipio)
		secretary = Usuario.objects.create_user(
			username="secretaria", email="secretaria@example.com", password="secret1234",
			rol="secretario_escuela", escuela=self.escuela,
			municipio=self.municipio, provincia=self.provincia,
		)
		student = Estudiante.objects.create(
			ci="12345678901", nombre="Ana", apellidos="Pérez", sexo="F",
			direccion="Calle 1", escuela=self.escuela, indice_general=91.5,
		)
		escalafon = Escalafon.objects.create(proceso=self.proceso, escuela=self.escuela)
		EscalafonItem.objects.create(
			escalafon=escalafon, estudiante=student,
			indice_10=90, indice_11=91, indice_12=92, indice_general=91.5,
		)
		registered_user = Usuario.objects.create_user(
			username="registrado", email="registrado@example.com", password="secret1234",
		)
		Estudiante.objects.create(
			ci="12345678902", nombre="Luis", apellidos="Díaz", sexo="M",
			direccion="Calle 2", escuela=self.escuela, usuario=registered_user,
		)
		Estudiante.objects.create(
			ci="12345678903", nombre="Marta", apellidos="Gómez", sexo="F",
			direccion="Calle 3", escuela=other_school,
		)

		client = APIClient()
		client.force_authenticate(user=secretary)
		response = client.get("/api/v1/gestion-escuela/estudiantes/sin-cuenta/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.json()["data"]["students"], [{
			"id": student.id,
			"ci": "12345678901",
			"nombre": "Ana",
			"apellidos": "Pérez",
			"indice_general": 91.5,
		}])

	def test_secretary_created_student_account_uses_student_school_scope(self):
		secretary = Usuario.objects.create_user(
			username="secretaria", email="secretaria@example.com", password="test-password",
			rol="secretario_escuela", escuela=self.escuela,
			municipio=self.municipio, provincia=self.provincia,
		)
		student = Estudiante.objects.create(
			ci="12345678901", nombre="Ana", apellidos="Pérez", sexo="F",
			direccion="Calle 1", escuela=self.escuela,
		)
		client = APIClient()
		client.force_authenticate(user=secretary)

		with patch("apps.gestion_escuela.views.send_email_async"):
			response = client.post(
				f"/api/v1/gestion-escuela/estudiantes/{student.id}/crear-cuenta/",
				{
					"username": "ana.perez",
					"email": "ana@example.com",
					"password": "temporary-password",
				},
				format="json",
			)

		self.assertEqual(response.status_code, 200, response.content)
		user = Usuario.objects.get(username="ana.perez")
		self.assertEqual(user.rol, "estudiante")
		self.assertEqual(user.escuela_id, self.escuela.id)
		self.assertEqual(user.municipio_id, self.municipio.id)
		self.assertEqual(user.provincia_id, self.provincia.id)
		self.assertEqual(user.pending_student_id, student.id)
		self.assertFalse(user.is_active)
		self.assertTrue(user.debe_cambiar_password)
		self.assertFalse(EmailVerificationCode.objects.filter(user=user).exists())
from django.test import TestCase

# Create your tests here.


class EscalafonStudentPrivacyTests(TestCase):
    """Un estudiante ve el ranking completo de su escuela, pero los datos
    personales de sus companeros (CI, direccion, sexo, indices por grado y
    estado de revision) solo en su propia fila."""

    def setUp(self):
        from datetime import date

        from django.utils import timezone

        province = Provincia.objects.create(nombre="Provincia de privacidad")
        municipality = Municipio.objects.create(nombre="Municipio de privacidad", provincia=province)
        self.school = Escuela.objects.create(nombre="Escuela de privacidad", municipio=municipality)
        stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
        process, _ = Proceso.objects.get_or_create(
            anio=date(timezone.localdate().year, 1, 1), etapa=Etapa.objects.get(pk=stage.pk),
        )
        process.estado = "en_curso"
        process.fecha_inicio = date(timezone.localdate().year, 1, 1)
        process.fecha_fin = date(timezone.localdate().year, 12, 31)
        process.save(update_fields=["estado", "fecha_inicio", "fecha_fin"])
        escalafon = Escalafon.objects.create(proceso=process, escuela=self.school)

        def add(ci, nombre, direccion, indice):
            student = Estudiante.objects.create(
                ci=ci, nombre=nombre, apellidos="Apellido", sexo="F",
                direccion=direccion, escuela=self.school,
            )
            EscalafonItem.objects.create(
                escalafon=escalafon, estudiante=student, indice_10=indice,
                indice_11=indice, indice_12=indice, indice_general=indice,
            )
            return student

        self.me = add("70000000001", "Propia", "Mi casa 1", 90)
        self.other = add("70000000002", "Ajena", "Casa ajena 99", 95)
        self.user = Usuario.objects.create_user(
            username="privacidad.estudiante", email="privacidad@example.com",
            password="secret1234", rol="estudiante", escuela=self.school,
            municipio=municipality, provincia=province,
        )
        Estudiante.objects.filter(pk=self.me.pk).update(usuario=self.user)

    def test_el_estudiante_no_recibe_datos_personales_de_sus_companeros(self):
        client = APIClient()
        client.force_authenticate(self.user)
        response = client.get("/api/v1/import-export/escalafon/")

        self.assertEqual(response.status_code, 200)
        entries = response.json()["data"]["entries"]
        self.assertEqual(len(entries), 2, "debe seguir viendo el ranking completo")

        own = [e for e in entries if e.get("ci") == self.me.ci]
        self.assertEqual(len(own), 1, "su propia fila llega completa")
        self.assertEqual(own[0]["direccion"], "Mi casa 1")
        self.assertIsNotNone(own[0]["indice_10"])

        others = [e for e in entries if e.get("ci") != self.me.ci]
        self.assertEqual(len(others), 1)
        foreign = others[0]
        for field in ("ci", "direccion", "sexo", "indice_10", "indice_11", "indice_12",
                      "estado", "causa_revision", "fecha_revision", "tiene_cuenta"):
            self.assertNotIn(field, foreign, f"{field} no debe salir de otro estudiante")
        # El ranking sigue siendo util: nombre, posicion e indice general.
        self.assertEqual(foreign["nombre"], "Ajena")
        self.assertEqual(foreign["posicion"], 1)
        self.assertIsNotNone(foreign["indice_general"])

    def test_el_secretario_sigue_viendo_los_datos_completos(self):
        secretary = Usuario.objects.create_user(
            username="privacidad.secretario", email="secretario.privacidad@example.com",
            password="secret1234", rol="secretario_escuela", escuela=self.school,
            municipio=self.school.municipio, provincia=self.school.municipio.provincia,
        )
        client = APIClient()
        client.force_authenticate(secretary)
        response = client.get("/api/v1/import-export/escalafon/")

        self.assertEqual(response.status_code, 200)
        entries = response.json()["data"]["entries"]
        self.assertEqual(len(entries), 2)
        for entry in entries:
            self.assertIn("ci", entry)
            self.assertIn("direccion", entry)
            self.assertIn("indice_10", entry)


class SchoolCreatedAccountPolicyTests(TestCase):
    """La escuela ya no acepta la política en nombre del estudiante: la acepta él
    al verificar el correo. Y una cuenta no puede activarse sin perfil (#17)."""

    def setUp(self):
        province = Provincia.objects.create(nombre="Provincia de política")
        municipality = Municipio.objects.create(nombre="Municipio de política", provincia=province)
        self.school = Escuela.objects.create(nombre="Escuela de política", municipio=municipality)
        self.student = Estudiante.objects.create(
            ci="77010100001", nombre="Ana", apellidos="Pérez", sexo="F",
            direccion="Dir", escuela=self.school,
        )
        self.secretary = Usuario.objects.create_user(
            username="sec.politica", email="sec.politica@example.com", password="secret1234",
            rol="secretario_escuela", escuela=self.school, municipio=municipality, provincia=province,
        )

    def _create_account(self, username="ana.politica", email="ana.politica@example.com"):
        client = APIClient()
        client.force_authenticate(self.secretary)
        response = client.post(
            f"/api/v1/gestion-escuela/estudiantes/{self.student.id}/crear-cuenta/",
            {"username": username, "email": email, "password": "Temporal1234"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        return Usuario.objects.get(username=username)

    def test_la_escuela_no_acepta_la_politica_por_el_estudiante(self):
        user = self._create_account()
        self.assertFalse(user.politica_privacidad_aceptada)
        self.assertIsNone(user.politica_privacidad_fecha_aceptacion)

    def test_verificar_sin_aceptar_la_politica_falla(self):
        user = self._create_account()
        code = EmailVerificationCode.objects.filter(user=user).first()
        self.assertIsNone(code, "el código se envía al iniciar sesión, no al crear la cuenta")

        # Se simula el código que genera el primer inicio de sesión.
        from datetime import timedelta

        from django.utils import timezone

        verification = EmailVerificationCode.objects.create(
            user=user, code="123456", expires_at=timezone.now() + timedelta(minutes=15),
        )
        client = APIClient()
        sin_aceptar = client.post(
            "/api/v1/authentication/verify-email/",
            {"username": user.username, "code": verification.code},
            format="json",
        )
        self.assertEqual(sin_aceptar.status_code, 400, sin_aceptar.content)
        user.refresh_from_db()
        self.assertFalse(user.is_active, "no debe activarse sin aceptar la política")

        aceptando = client.post(
            "/api/v1/authentication/verify-email/",
            {"username": user.username, "code": verification.code, "politica_privacidad_aceptada": True},
            format="json",
        )
        self.assertEqual(aceptando.status_code, 200, aceptando.content)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(user.politica_privacidad_aceptada)
        self.assertIsNotNone(user.politica_privacidad_fecha_aceptacion)
        self.student.refresh_from_db()
        self.assertEqual(self.student.usuario_id, user.id)

    def test_una_segunda_cuenta_pendiente_no_se_activa_sin_perfil(self):
        from datetime import timedelta

        from django.utils import timezone

        primera = self._create_account("ana.uno", "ana.uno@example.com")
        # Segunda cuenta pendiente apuntando al mismo estudiante.
        segunda = Usuario.objects.create_user(
            username="ana.dos", email="ana.dos@example.com", password="Temporal1234",
            rol="estudiante", escuela=self.school,
        )
        segunda.is_active = False
        segunda.pending_student = self.student
        segunda.save(update_fields=["is_active", "pending_student"])

        client = APIClient()
        for user in (primera, segunda):
            EmailVerificationCode.objects.create(
                user=user, code="654321", expires_at=timezone.now() + timedelta(minutes=15),
            )

        ok = client.post(
            "/api/v1/authentication/verify-email/",
            {"username": primera.username, "code": "654321", "politica_privacidad_aceptada": True},
            format="json",
        )
        self.assertEqual(ok.status_code, 200, ok.content)

        conflicto = client.post(
            "/api/v1/authentication/verify-email/",
            {"username": segunda.username, "code": "654321", "politica_privacidad_aceptada": True},
            format="json",
        )
        self.assertEqual(conflicto.status_code, 409, conflicto.content)
        segunda.refresh_from_db()
        self.assertFalse(segunda.is_active, "no debe quedar una cuenta activa sin perfil")
        self.assertEqual(segunda.pending_student_id, self.student.id, "no debe perder el vínculo pendiente")
