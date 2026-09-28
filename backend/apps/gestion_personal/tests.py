from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.authentication.models import Estudiante, Usuario
from apps.gestion_personal.models import BoletaSolicitud, BoletaSolicitudItemAnterior
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, Proceso
from apps.gestion_provincial.models import PlanPlaza
from apps.superadmin.models import Carrera, Ces, Escuela, Municipio, Provincia, TipoOtorgamiento


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


class StudentSolicitudAtomicModificationTests(StudentSolicitudStageEditPermissionTests):
    test_student_cannot_request_modification_during_stage_4 = None
    test_student_cannot_request_modification_during_stage_5 = None
    test_student_can_request_modification_during_stage_3 = None

    def setUp(self):
        super().setUp()
        self.stage_3.estado = "en_curso"
        self.stage_3.save(update_fields=["estado"])
        self.stage_4.estado = "completada"
        self.stage_4.save(update_fields=["estado"])
        ces = Ces.objects.create(nombre="UH")
        tipo = TipoOtorgamiento.objects.create(nombre="Regular")
        self.plans = []
        for i in range(11):
            carrera = Carrera.objects.create(codigo=f"C{i}", nombre=f"Carrera {i}", ces=ces, provincia=self.provincia)
            self.plans.append(PlanPlaza.objects.create(
                proceso=self.process_3, carrera=carrera, cantidad_plazas=5,
                otorgamiento_tipo=tipo, ces=ces, provincia=self.provincia, sexo="A"))
        self.url = reverse("student-solicitud")

    def ids(self, n=10):
        return [p.id for p in self.plans[:n]]

    def test_get_exposes_flags_and_max_items(self):
        data = self.client.get(self.url).json()
        data = data.get("data", data)
        self.assertEqual(data["max_items"], 10)
        self.assertTrue(data["puede_solicitar_modificacion"])
        self.assertFalse(data["puede_editar"])

    def test_atomic_modification_success(self):
        response = self.client.post(self.url, {"plan_plazas": self.ids(), "confirmar": True, "modificacion": True}, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.ballot.refresh_from_db()
        self.assertEqual(self.ballot.estado, "modificada")
        self.assertEqual(self.ballot.boleta_solicitud.count(), 10)

    def test_preview_does_not_change_state(self):
        response = self.client.post(self.url, {"plan_plazas": self.ids(), "modificacion": True}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        self.ballot.refresh_from_db()
        self.assertEqual(self.ballot.estado, "aprobada")

    def test_invalid_plans_leave_ballot_approved(self):
        response = self.client.post(self.url, {"plan_plazas": self.ids(9), "confirmar": True, "modificacion": True}, format="json")
        self.assertEqual(response.status_code, 400, response.content)
        self.ballot.refresh_from_db()
        self.assertEqual(self.ballot.estado, "aprobada")
        self.assertFalse(BoletaSolicitudItemAnterior.objects.filter(boleta_solicitud=self.ballot).exists())

    def test_approved_without_modification_flag_conflicts(self):
        response = self.client.post(self.url, {"plan_plazas": self.ids(), "confirmar": True}, format="json")
        self.assertEqual(response.status_code, 409, response.content)


class StudentReadOnlyWhenStageCompletedTests(APITestCase):
    """Etapa completada: los GET devuelven datos con flags en False y los POST se rechazan."""

    def setUp(self):
        from apps.gestion_personal.models import BoletaInteres, ConfirmacionPrueba, ResultadoExamen
        from apps.superadmin.models import Asignatura
        provincia = Provincia.objects.create(nombre="La Habana")
        municipio = Municipio.objects.create(nombre="Plaza", provincia=provincia)
        escuela = Escuela.objects.create(nombre="Escuela 1", municipio=municipio)
        self.user = Usuario.objects.create_user(username="ro1", email="ro1@example.com", password="password123", rol="estudiante", escuela=escuela)
        self.student = Estudiante.objects.create(
            usuario=self.user, ci="99999999999", nombre="Ana", apellidos="Pérez", sexo="F",
            direccion="Calle 1", escuela=escuela, indice_general=5.0)
        year = date(date.today().year, 1, 1)
        self.processes = {}
        for number in range(1, 7):
            stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[number])
            stage.estado = "completada"
            stage.save(update_fields=["estado"])
            self.processes[number] = Proceso.objects.create(anio=year, etapa=stage)
        BoletaInteres.objects.create(estudiante=self.student, proceso=self.processes[2])
        BoletaSolicitud.objects.create(estudiante=self.student, proceso=self.processes[3], estado="aprobada")
        subject = Asignatura.objects.create(nombre="Matemática")
        self.confirmation = ConfirmacionPrueba.objects.create(
            estudiante=self.student, proceso=self.processes[4], asignatura=subject,
            confirmada=True, fecha_prueba="2026-07-01T09:00:00Z")
        self.result = ResultadoExamen.objects.create(
            estudiante=self.student, proceso=self.processes[5], asignatura=subject,
            nota=90, fecha_limite_reclamo=date(date.today().year + 1, 1, 1))
        self.client.force_authenticate(self.user)

    def data(self, response):
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        return body.get("data", body)

    def test_solicitud_get_readonly(self):
        data = self.data(self.client.get(reverse("student-solicitud")))
        self.assertFalse(data["puede_editar"])
        self.assertFalse(data["puede_solicitar_modificacion"])
        self.assertEqual(self.client.post(reverse("student-solicitud-edit")).status_code, 403)

    def test_interest_get_readonly(self):
        data = self.data(self.client.get(reverse("student-interest")))
        self.assertFalse(data["puede_editar"])
        self.assertEqual(self.client.post(reverse("student-interest-send")).status_code, 403)

    def test_exam_confirmation_get_readonly(self):
        data = self.data(self.client.get(reverse("student-exam-confirmation")))
        self.assertFalse(data["puede_confirmar"])
        self.assertEqual(len(data["exams"]), 1)
        response = self.client.post(reverse("student-exam-confirmation"), {"id": self.confirmation.id, "confirmada": False}, format="json")
        self.assertEqual(response.status_code, 403)
        self.confirmation.refresh_from_db()
        self.assertTrue(self.confirmation.confirmada)

    def test_results_get_readonly(self):
        data = self.data(self.client.get(reverse("resultados-list")))
        self.assertFalse(data["puede_reclamar"])
        graded = [r for r in data["results"] if r["grade"] is not None]
        self.assertEqual(len(graded), 1)
        self.assertFalse(graded[0]["puede_reclamar"])
        response = self.client.post(reverse("student-result-claim", args=[self.result.id]), {"descripcion": "x"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_otorgamiento_get_ok(self):
        data = self.data(self.client.get(reverse("student-otorgamiento")))
        self.assertFalse(data["published"])

    def test_escalafon_get_readonly_and_action_rejected(self):
        from apps.gestion_escuela.models import Escalafon, EscalafonItem
        escalafon = Escalafon.objects.create(proceso=self.processes[1], escuela=self.student.escuela)
        item = EscalafonItem.objects.create(
            escalafon=escalafon, estudiante=self.student, indice_10=90, indice_11=90, indice_12=90, indice_general=90)
        data = self.data(self.client.get(reverse("escalafon-list")))
        self.assertEqual(len(data["entries"]), 1)
        self.assertFalse(data["puede_responder"])
        response = self.client.post(reverse("student-escalafon-action", args=["aceptar"]), {}, format="json")
        self.assertEqual(response.status_code, 403, response.content)
        item.refresh_from_db()
        self.assertNotEqual(item.estado, "aceptado")
