from datetime import date, timedelta

from django.urls import reverse
from rest_framework.test import APITestCase

from apps.authentication.models import Usuario
from apps.superadmin.models import Escuela, Municipio, Provincia

from .models import ETAPAS_NOMBRES, Etapa, Proceso


class EtapaActivationTests(APITestCase):
    def setUp(self):
        self.user = Usuario.objects.create_user(
            username="jefe_comision",
            email="jefe@example.com",
            password="password123",
            rol="jefe_comision",
        )
        self.client.force_authenticate(self.user)
        self.proceso = Proceso.objects.create(
            anio=date(2025, 1, 1),
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
