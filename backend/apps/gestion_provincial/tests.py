from datetime import date, timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.authentication.models import Estudiante, Usuario
from apps.gestion_escuela.models import Escalafon, EscalafonItem
from apps.gestion_personal.models import BoletaInteres, BoletaInteresItem, BoletaSolicitud, BoletaSolicitudItem
from apps.superadmin.models import Carrera, Ces, Escuela, Municipio, Provincia, TipoOtorgamiento

from .models import ETAPAS_NOMBRES, Etapa, PlanPlaza, Proceso


class EtapaActivationTests(APITestCase):
    def setUp(self):
        self.user = Usuario.objects.create_user(
            username="jefe_comision",
            email="jefe@example.com",
            password="password123",
            rol="jefe_comision",
        )
        self.client.force_authenticate(self.user)
        self.stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
        self.proceso = Proceso.objects.create(
            anio=date(2025, 1, 1),
            etapa=self.stage,
        )

    def test_creates_six_stages_for_a_process(self):
        self.assertEqual(Etapa.objects.count(), 6)
        self.assertEqual(Etapa.objects.values_list("nombre", flat=True).count(), 6)
        self.assertEqual(set(Etapa.objects.values_list("nombre", flat=True)), set(ETAPAS_NOMBRES.values()))

    def test_rejects_stage_names_outside_catalog(self):
        with self.assertRaises(Exception):
            Etapa.objects.create(nombre="Etapa inventada")

    def test_cannot_activate_stage_out_of_sequence(self):
        stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[2])

        response = self.client.post(
            reverse("provincial-etapa-activar", args=[stage.pk]),
            {"fecha_inicio": "2025-01-02", "fecha_fin": "2025-01-10"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("secuencia", response.data["detail"])

    def test_activation_returns_current_status(self):
        stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
        today = date.today()
        response = self.client.post(
            reverse("provincial-etapa-activar", args=[stage.pk]),
            {
                "fecha_inicio": today.isoformat(),
                "fecha_fin": (today + timedelta(days=5)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["estado"], "en_curso")

    def test_activation_does_not_require_a_process(self):
        self.proceso.delete()
        stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
        today = date.today()

        response = self.client.post(
            reverse("provincial-etapa-activar", args=[stage.pk]),
            {
                "fecha_inicio": today.isoformat(),
                "fecha_fin": (today + timedelta(days=5)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

    def test_can_close_stage_before_planned_end_date(self):
        stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
        today = date.today()
        self.client.post(
            reverse("provincial-etapa-activar", args=[stage.pk]),
            {"fecha_inicio": today.isoformat(), "fecha_fin": (today + timedelta(days=30)).isoformat()},
            format="json",
        )

        response = self.client.post(reverse("provincial-etapa-cerrar", args=[stage.pk]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["estado"], "completada")

    def test_can_close_stage_before_its_start_date(self):
        stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
        today = date.today()
        planned_start = today + timedelta(days=1)
        planned_end = today + timedelta(days=10)
        self.client.post(
            reverse("provincial-etapa-activar", args=[stage.pk]),
            {"fecha_inicio": planned_start.isoformat(), "fecha_fin": planned_end.isoformat()},
            format="json",
        )

        response = self.client.post(reverse("provincial-etapa-cerrar", args=[stage.pk]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["estado"], "completada")
        self.assertEqual(response.data["fecha_fin"], planned_end.isoformat())

    def test_closing_stage_auto_sends_pending_escalafones(self):
        stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
        today = date.today()
        self.client.post(
            reverse("provincial-etapa-activar", args=[stage.pk]),
            {"fecha_inicio": today.isoformat(), "fecha_fin": (today + timedelta(days=10)).isoformat()},
            format="json",
        )

        provincia = Provincia.objects.create(nombre="Provincia cerrada")
        municipio = Municipio.objects.create(nombre="Municipio cerrado", provincia=provincia)
        escuela_pending = Escuela.objects.create(nombre="Escuela pendiente", municipio=municipio)
        escuela_sent = Escuela.objects.create(nombre="Escuela enviada", municipio=municipio)

        escalafon_pending = Escalafon.objects.create(proceso=self.proceso, escuela=escuela_pending, estado="pendiente")
        escalafon_sent = Escalafon.objects.create(proceso=self.proceso, escuela=escuela_sent, estado="enviado")

        estudiante_pending = Estudiante.objects.create(
            ci="10000000001", nombre="Ana", apellidos="Pendiente", sexo="F",
            direccion="Calle 1", escuela=escuela_pending,
        )
        estudiante_sent = Estudiante.objects.create(
            ci="10000000002", nombre="Luis", apellidos="Enviado", sexo="M",
            direccion="Calle 2", escuela=escuela_sent,
        )

        item_pending = EscalafonItem.objects.create(
            escalafon=escalafon_pending, estudiante=estudiante_pending,
            indice_10=80, indice_11=82, indice_12=84, indice_general=82,
        )
        item_sent = EscalafonItem.objects.create(
            escalafon=escalafon_sent, estudiante=estudiante_sent,
            indice_10=90, indice_11=92, indice_12=93, indice_general=92,
        )

        response = self.client.post(reverse("provincial-etapa-cerrar", args=[stage.pk]))

        self.assertEqual(response.status_code, 200)
        escalafon_pending.refresh_from_db()
        escalafon_sent.refresh_from_db()
        item_pending.refresh_from_db()
        item_sent.refresh_from_db()
        self.assertEqual(escalafon_pending.estado, "enviado")
        self.assertEqual(escalafon_sent.estado, "enviado")
        self.assertTrue(item_pending.indices_bloqueados)
        self.assertFalse(item_sent.indices_bloqueados)

    def test_rejects_end_date_before_start_date(self):
        stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
        response = self.client.post(
            reverse("provincial-etapa-activar", args=[stage.pk]),
            {"fecha_inicio": "2026-02-10", "fecha_fin": "2026-02-01"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("fecha", str(response.data).lower())

    def test_expired_stage_is_closed_when_stages_are_listed(self):
        stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
        stage.fecha_inicio = date.today() - timedelta(days=5)
        stage.fecha_fin = date.today() - timedelta(days=1)
        stage.estado = "en_curso"
        stage.save()

        response = self.client.get(reverse("provincial-etapas"))

        self.assertEqual(response.status_code, 200)
        stage.refresh_from_db()
        self.assertEqual(stage.estado, "completada")

    def test_cannot_reset_until_all_stages_are_completed(self):
        response = self.client.post(reverse("provincial-etapas-reiniciar"))

        self.assertEqual(response.status_code, 400)

    def test_reset_clears_dates_and_states_after_all_stages_complete(self):
        Etapa.objects.update(
            fecha_inicio=date.today(), fecha_fin=date.today(), estado="completada"
        )

        response = self.client.post(reverse("provincial-etapas-reiniciar"))

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Etapa.objects.exclude(fecha_inicio=None).exists())
        self.assertFalse(Etapa.objects.exclude(fecha_fin=None).exists())
        self.assertFalse(Etapa.objects.exclude(estado="no_iniciada").exists())

    def test_provincial_representative_cannot_manage_stages(self):
        provincial = Usuario.objects.create_user(
            username="provincial",
            email="provincial@example.com",
            password="password123",
            rol="ingreso_provincial",
        )
        self.client.force_authenticate(provincial)
        response = self.client.get(reverse("provincial-etapas"))

        self.assertEqual(response.status_code, 403)

    def test_secretary_can_read_stage_status(self):
        secretary = Usuario.objects.create_user(
            username="secretario",
            email="secretario@example.com",
            password="password123",
            rol="secretario_escuela",
        )
        self.client.force_authenticate(secretary)
        response = self.client.get(reverse("provincial-etapas"))

        self.assertEqual(response.status_code, 200)

    def test_student_can_read_stage_status(self):
        student = Usuario.objects.create_user(
            username="estudiante",
            email="estudiante@example.com",
            password="password123",
            rol="estudiante",
        )
        self.client.force_authenticate(student)
        response = self.client.get(reverse("provincial-etapas"))

        self.assertEqual(response.status_code, 200)

    def test_commission_chief_can_read_real_dashboard_metrics(self):
        response = self.client.get(reverse("provincial-dashboard"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["municipios"], 0)
        self.assertEqual(response.data["estudiantes"], 0)
        self.assertIn("etapa_activa", response.data)
        self.assertIn("top_carreras", response.data)

    def test_commission_chief_dashboard_is_limited_to_own_province(self):
        own_province = Provincia.objects.create(nombre="Provincia propia")
        other_province = Provincia.objects.create(nombre="Otra provincia")
        own_municipality = Municipio.objects.create(nombre="Municipio propio", provincia=own_province)
        other_municipality = Municipio.objects.create(nombre="Otro municipio", provincia=other_province)
        Escuela.objects.create(nombre="Escuela propia", municipio=own_municipality)
        Escuela.objects.create(nombre="Escuela ajena", municipio=other_municipality)
        self.user.provincia = own_province
        self.user.save(update_fields=["provincia"])

        response = self.client.get(reverse("provincial-dashboard"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["municipios"], 1)
        self.assertEqual(response.data["escuelas"], 1)
        self.assertEqual(response.data["municipios_lista"][0]["nombre"], "Municipio propio")

    def test_dashboard_top_careers_uses_active_stage_and_own_province(self):
        own_province = Provincia.objects.create(nombre="Provincia del jefe")
        other_province = Provincia.objects.create(nombre="Otra provincia")
        own_school = Escuela.objects.create(
            nombre="Escuela propia",
            municipio=Municipio.objects.create(nombre="Municipio propio", provincia=own_province),
        )
        other_school = Escuela.objects.create(
            nombre="Escuela ajena",
            municipio=Municipio.objects.create(nombre="Municipio ajeno", provincia=other_province),
        )
        self.user.provincia = own_province
        self.user.save(update_fields=["provincia"])

        own_student = Estudiante.objects.create(
            ci="10000000001", nombre="Estudiante", apellidos="Propio", sexo="F",
            direccion="Calle 1", escuela=own_school,
        )
        other_student = Estudiante.objects.create(
            ci="10000000002", nombre="Estudiante", apellidos="Ajeno", sexo="M",
            direccion="Calle 2", escuela=other_school,
        )
        ces = Ces.objects.create(nombre="CES de prueba")
        interest_career = Carrera.objects.create(
            codigo="INT-1", nombre="Carrera de interés", ces=ces, provincia=own_province,
        )
        request_career = Carrera.objects.create(
            codigo="SOL-1", nombre="Carrera de solicitud", ces=ces, provincia=own_province,
        )
        interest_process = Proceso.objects.create(
            anio=date(timezone.now().year, 1, 1), etapa=Etapa.objects.get(nombre=ETAPAS_NOMBRES[2]),
        )
        own_interest = BoletaInteres.objects.create(
            estudiante=own_student, proceso=interest_process, enviada=True,
        )
        other_interest = BoletaInteres.objects.create(
            estudiante=other_student, proceso=interest_process, enviada=True,
        )
        BoletaInteresItem.objects.create(boleta_interes=own_interest, carrera=interest_career, prioridad=1)
        BoletaInteresItem.objects.create(boleta_interes=other_interest, carrera=request_career, prioridad=1)

        stage_2 = Etapa.objects.get(nombre=ETAPAS_NOMBRES[2])
        stage_2.estado = "en_curso"
        stage_2.save(update_fields=["estado"])
        interest_response = self.client.get(reverse("provincial-dashboard"))

        self.assertEqual(interest_response.status_code, 200)
        self.assertEqual(interest_response.data["top_carreras"], [{"carrera__nombre": "Carrera de interés", "total": 1}])

        stage_2.estado = "completada"
        stage_2.save(update_fields=["estado"])
        stage_3 = Etapa.objects.get(nombre=ETAPAS_NOMBRES[3])
        stage_3.estado = "en_curso"
        stage_3.save(update_fields=["estado"])
        request_process = Proceso.objects.create(
            anio=date(timezone.now().year, 1, 1), etapa=stage_3,
        )
        tipo_provincial, _ = TipoOtorgamiento.objects.get_or_create(nombre="Provincial")
        plan = PlanPlaza.objects.create(
            proceso=request_process, carrera=request_career, cantidad_plazas=1,
            otorgamiento_tipo=tipo_provincial, ces=ces, provincia=own_province, sexo="A",
        )
        request_ballot = BoletaSolicitud.objects.create(
            estudiante=own_student, proceso=request_process, estado="pendiente",
        )
        BoletaSolicitudItem.objects.create(boleta_solicitud=request_ballot, plan_plaza=plan, prioridad=1)
        other_plan = PlanPlaza.objects.create(
            proceso=request_process, carrera=interest_career, cantidad_plazas=1,
            otorgamiento_tipo=tipo_provincial, ces=ces, provincia=other_province, sexo="A",
        )
        other_request = BoletaSolicitud.objects.create(
            estudiante=other_student, proceso=request_process, estado="aprobada",
        )
        BoletaSolicitudItem.objects.create(boleta_solicitud=other_request, plan_plaza=other_plan, prioridad=1)

        request_response = self.client.get(reverse("provincial-dashboard"))

        self.assertEqual(request_response.status_code, 200)
        self.assertEqual(request_response.data["top_carreras"], [{"carrera__nombre": "Carrera de solicitud", "total": 1}])

    def test_director_can_read_stage_status(self):
        director = Usuario.objects.create_user(
            username="director",
            email="director@example.com",
            password="password123",
            rol="director_escuela",
        )
        self.client.force_authenticate(director)
        response = self.client.get(reverse("provincial-etapas"))

        self.assertEqual(response.status_code, 200)

    def test_landing_can_read_stage_availability_without_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("etapas-disponibilidad"))

        self.assertEqual(response.status_code, 200)
        self.assertIn("etapas", response.data)
        self.assertIn("registro_estudiantil", response.data)


class PlanPlazaImportTests(APITestCase):
    def setUp(self):
        self.user = Usuario.objects.create_user(
            username="jefe",
            email="jefe@example.com",
            password="password123",
            rol="jefe_comision",
        )
        self.client.force_authenticate(self.user)
        self.provincia = Provincia.objects.create(nombre="La Habana")
        self.ces = self._create_ces("Universidad de La Habana")
        self.carrera = self._create_carrera("CS-101", "Ingeniería en Informática")
        self.active_stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
        self.active_stage.estado = "en_curso"
        self.active_stage.save(update_fields=["estado"])
        self.proceso = Proceso.objects.create(anio=date(2025, 1, 1), etapa=self.active_stage)

    def _create_ces(self, nombre):
        from apps.superadmin.models import Ces
        return Ces.objects.create(nombre=nombre, activa=True)

    def _create_carrera(self, codigo, nombre):
        from apps.superadmin.models import Carrera
        return Carrera.objects.create(
            codigo=codigo,
            nombre=nombre,
            ces=self.ces,
            provincia=self.provincia,
            activa=True,
        )

    def _import_plan_plaza(self, file):
        """Encola la importación (202) y devuelve la respuesta de /tareas/<id>/ ya resuelta (modo eager)."""
        accepted = self.client.post(reverse("import-plan-plaza"), {"file": file}, format="multipart")
        self.assertEqual(accepted.status_code, 202, accepted.content)
        task_id = accepted.data["task_id"]
        status_response = self.client.get(reverse("import-task-status", args=[task_id]))
        self.assertEqual(status_response.status_code, 200)
        data = status_response.data
        self.assertIn(data["estado"], {"completada", "fallida"})
        response = type("R", (), {})()
        response.status_code = data["http_status"]
        response.data = data["resultado"]
        response.content = str(data).encode()
        return response

    def test_imports_plan_plaza_using_career_pk_and_active_process(self):
        from io import BytesIO
        from openpyxl import Workbook
        from django.core.files.uploadedfile import SimpleUploadedFile

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Plan de Plazas"
        sheet.append(["Código_Carrera", "Nombre_Carrera", "Cantidad_Plazas", "Tipo_Otorgamiento", "CES", "Provincia", "Sexo"])
        sheet.append([self.carrera.codigo, self.carrera.nombre, 12, "Municipal", self.ces.nombre, self.provincia.nombre, "A"])

        file = SimpleUploadedFile(
            "plan-plazas.xlsx",
            BytesIO().getvalue() if False else b"",
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

        buffer = BytesIO()
        workbook.save(buffer)
        file = SimpleUploadedFile("plan-plazas.xlsx", buffer.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

        response = self._import_plan_plaza(file)

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["inserted"], 1)

        plan = self.carrera.plan_plaza.order_by("-id").first()
        self.assertIsNotNone(plan)
        self.assertEqual(plan.carrera_id, self.carrera.id)
        self.assertEqual(plan.otorgamiento_tipo.nombre, "Municipal")
        plan_stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[3])
        self.assertEqual(plan.proceso.etapa_id, plan_stage.id)
        self.assertEqual(plan.cantidad_plazas, 12)
        self.assertEqual(plan.sexo, "A")

    def test_import_uses_user_province_and_creates_process_automatically(self):
        from io import BytesIO
        from openpyxl import Workbook
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.user.provincia = self.provincia
        self.user.save(update_fields=["provincia"])

        plan_stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[3])
        plan_stage.estado = "en_curso"
        plan_stage.save(update_fields=["estado"])
        Proceso.objects.filter(etapa=plan_stage).delete()

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Plan de Plazas"
        sheet.append(["Código_Carrera", "Nombre_Carrera", "Cantidad_Plazas", "Tipo_Otorgamiento", "CES", "Provincia", "Sexo"])
        sheet.append([self.carrera.codigo, self.carrera.nombre, 18, "Municipal", self.ces.nombre, "", "A"])

        buffer = BytesIO()
        workbook.save(buffer)
        file = SimpleUploadedFile("plan-plazas-province.xlsx", buffer.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

        response = self._import_plan_plaza(file)

        self.assertEqual(response.status_code, 201, response.content)
        plan = self.carrera.plan_plaza.order_by("-id").first()
        self.assertIsNotNone(plan)
        self.assertEqual(plan.provincia_id, self.provincia.id)
        self.assertEqual(plan.proceso.etapa_id, plan_stage.id)
        self.assertEqual(plan.proceso.anio.year, 2026)

    def test_import_rejects_invalid_type_values(self):
        from io import BytesIO
        from openpyxl import Workbook
        from django.core.files.uploadedfile import SimpleUploadedFile

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Plan de Plazas"
        sheet.append(["Código_Carrera", "Nombre_Carrera", "Cantidad_Plazas", "Tipo_Otorgamiento", "CES", "Provincia", "Sexo"])
        sheet.append([self.carrera.codigo, self.carrera.nombre, 5, "Preuniversitario", self.ces.nombre, self.provincia.nombre, "F"])

        buffer = BytesIO()
        workbook.save(buffer)
        file = SimpleUploadedFile("plan-plazas-invalid.xlsx", buffer.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

        response = self._import_plan_plaza(file)

        self.assertEqual(response.status_code, 400)
        self.assertIn("Tipo_Otorgamiento", str(response.data))

    def test_list_remains_empty_when_no_current_year_process_exists(self):
        self.user.provincia = self.provincia
        self.user.save(update_fields=["provincia"])

        plan_stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[3])
        Proceso.objects.filter(etapa=plan_stage, anio__year=timezone.now().year).delete()

        response = self.client.get(reverse("plan-plazas"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_landing_returns_active_year_and_user_province_plan(self):
        self.user.provincia = self.provincia
        self.user.save(update_fields=["provincia"])

        plan_stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[3])
        plan_stage.estado = "en_curso"
        plan_stage.save(update_fields=["estado"])

        active_process = Proceso.objects.create(anio=date(timezone.now().year, 1, 1), etapa=plan_stage)
        PlanPlaza.objects.create(
            proceso=active_process,
            carrera=self.carrera,
            cantidad_plazas=20,
            otorgamiento_tipo=TipoOtorgamiento.objects.get(nombre="Municipal"),
            ces=self.ces,
            provincia=self.provincia,
            sexo="A",
        )

        response = self.client.get(reverse("plan-plazas-landing"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["year"], timezone.now().year)
        self.assertEqual(response.data["provincia_nombre"], self.provincia.nombre)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["cantidad_plazas"], 20)
