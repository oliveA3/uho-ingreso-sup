from datetime import date

from rest_framework.test import APITestCase

from apps.authentication.models import Estudiante, Usuario
from apps.gestion_escuela.models import Escalafon, EscalafonItem
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, Proceso
from .models import Escuela, Municipio, Provincia


class SuperAdminStudentListTests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            username="superadmin.students",
            email="superadmin.students@example.com",
            password="secret1234",
            rol="superadmin",
        )
        self.province = Provincia.objects.create(nombre="Provincia estudiantil")
        self.other_province = Provincia.objects.create(nombre="Otra provincia")
        municipality = Municipio.objects.create(nombre="Municipio estudiantil", provincia=self.province)
        other_municipality = Municipio.objects.create(nombre="Otro municipio", provincia=self.other_province)
        self.school = Escuela.objects.create(nombre="Escuela estudiantil", municipio=municipality)
        self.other_school = Escuela.objects.create(nombre="Otra escuela", municipio=other_municipality)
        self.stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
        self.process = Proceso.objects.create(anio=date(2026, 1, 1), etapa=self.stage)
        self.student = Estudiante.objects.create(
            ci="26000000001",
            nombre="Ana",
            apellidos="Estudiante",
            sexo="F",
            direccion="Calle 1",
            escuela=self.school,
        )
        self.other_student = Estudiante.objects.create(
            ci="26000000002",
            nombre="Luis",
            apellidos="Otro",
            sexo="M",
            direccion="Calle 2",
            escuela=self.other_school,
        )
        escalafon = Escalafon.objects.create(proceso=self.process, escuela=self.school)
        EscalafonItem.objects.create(
            escalafon=escalafon,
            estudiante=self.student,
            indice_10=80,
            indice_11=85,
            indice_12=90,
            indice_general=85,
        )
        self.student_user = Usuario.objects.create_user(
            username="ana.student",
            email="ana@example.com",
            password="secret1234",
            rol="estudiante",
            provincia=self.province,
            municipio=municipality,
            escuela=self.school,
            is_active=True,
        )
        self.student.usuario = self.student_user
        self.student.save(update_fields=["usuario"])
        self.client.force_authenticate(self.admin)

    def test_lists_students_with_account_status_and_filters(self):
        response = self.client.get("/api/v1/superadmin/estudiantes/", {
            "anio": "2026",
            "provincia": self.province.id,
            "ci": "26000000001",
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["ci"], "26000000001")
        self.assertTrue(response.data[0]["has_account"])
        self.assertTrue(response.data[0]["is_active"])
        self.assertEqual(response.data[0]["anios"], [2026])

    def test_student_listing_requires_superadmin(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/v1/superadmin/estudiantes/")

        self.assertEqual(response.status_code, 401)
