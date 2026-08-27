import io

from django.test import TestCase
from openpyxl import Workbook

from apps.authentication.models import Estudiante
from apps.gestion_escuela.models import Escalafon
from apps.gestion_provincial.models import Proceso
from apps.import_export.services.escalafon_service import EscalafonExcelService
from apps.superadmin.models import Escuela, Municipio, Provincia


class EscalafonTests(TestCase):
	def setUp(self):
		self.provincia = Provincia.objects.create(nombre="Villa Clara")
		self.municipio = Municipio.objects.create(nombre="Santa Clara", provincia=self.provincia)
		self.escuela = Escuela.objects.create(nombre="IPVCE", municipio=self.municipio)
		self.proceso = Proceso.objects.create(anio="2026-01-01")

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
		from apps.authentication.serializers import RegisterSerializer

		serializer = RegisterSerializer(data={
			"ci": "12345678901", "escuela": self.escuela.pk,
			"email": "ana@example.com", "username": "ana2026", "password": "secret1234",
		})
		self.assertTrue(serializer.is_valid(), serializer.errors)
		user = serializer.save()
		student = Estudiante.objects.get(ci="12345678901")
		self.assertEqual(student.usuario_id, user.id)
		self.assertEqual(user.first_name, "Ana")
		self.assertEqual(user.last_name, "Pérez")
from django.test import TestCase

# Create your tests here.
