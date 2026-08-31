from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.authentication.models import Estudiante, Usuario
from apps.gestion_personal.models import BoletaSolicitud
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, Proceso
from apps.superadmin.models import Escuela, Municipio, Provincia


class StudentSolicitudStageEditPermissionTests(APITestCase):
    def setUp(self):
        self.provincia = Provincia.objects.create(nombre="La Habana")
        self.municipio = Municipio.objects.create(nombre="Plaza de la Revolución", provincia=self.provincia)
        self.escuela = Escuela.objects.create(nombre="Escuela 1", municipio=self.municipio)

        self.user = Usuario.objects.create_user(
            username="student1",
            email="student1@example.com",
            password="password123",
            rol="estudiante",
        )
        self.student = Estudiante.objects.create(
            usuario=self.user,
            ci="12345678901",
            nombre="Ana",
            apellidos="Pérez",
            sexo="F",
            direccion="Calle 1",
            escuela=self.escuela,
            indice_general=5.0,
        )

        self.stage_3 = Etapa.objects.get(nombre=ETAPAS_NOMBRES[3])
        self.stage_3.estado = "completada"
        self.stage_3.save(update_fields=["estado"])

        self.stage_4 = Etapa.objects.get(nombre=ETAPAS_NOMBRES[4])
        self.stage_4.estado = "en_curso"
        self.stage_4.save(update_fields=["estado"])

        self.process_3 = Proceso.objects.create(anio=date(date.today().year, 1, 1), etapa=self.stage_3)
        self.ballot = BoletaSolicitud.objects.create(
            estudiante=self.student,
            proceso=self.process_3,
            estado="aprobada",
        )

        self.client.force_authenticate(self.user)

    def test_student_can_request_modification_during_stage_3(self):
        self.stage_3.estado = "en_curso"
        self.stage_3.save(update_fields=["estado"])
        self.stage_4.estado = "completada"
        self.stage_4.save(update_fields=["estado"])

        response = self.client.post(reverse("student-solicitud-edit"))

        self.assertEqual(response.status_code, 200, response.content)
        self.ballot.refresh_from_db()
        self.assertEqual(self.ballot.estado, "modificada")

    def test_student_cannot_request_modification_during_stage_4(self):
        response = self.client.post(reverse("student-solicitud-edit"))

        self.assertEqual(response.status_code, 403, response.content)
        self.ballot.refresh_from_db()
        self.assertEqual(self.ballot.estado, "aprobada")

    def test_student_cannot_request_modification_during_stage_5(self):
        self.stage_4.estado = "completada"
        self.stage_4.save(update_fields=["estado"])

        stage_5 = Etapa.objects.get(nombre=ETAPAS_NOMBRES[5])
        stage_5.estado = "en_curso"
        stage_5.save(update_fields=["estado"])

        response = self.client.post(reverse("student-solicitud-edit"))

        self.assertEqual(response.status_code, 403, response.content)
        self.ballot.refresh_from_db()
        self.assertEqual(self.ballot.estado, "aprobada")
