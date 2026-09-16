from datetime import date
from io import BytesIO

from openpyxl import load_workbook
from rest_framework.test import APIRequestFactory, APITestCase
from django.contrib.auth.models import AnonymousUser

from apps.gestion_provincial.models import ETAPAS_NOMBRES, CorteCarrera, Etapa, PlanPlaza, Proceso
from apps.superadmin.models import Carrera, Ces, Provincia, TipoOtorgamiento


class PublicLandingCortesTests(APITestCase):
    def setUp(self):
        self.province = Provincia.objects.create(nombre="Provincia de cortes")
        self.other_province = Provincia.objects.create(nombre="Otra provincia de cortes")
        ces = Ces.objects.create(nombre="CES de cortes")
        award_type, _ = TipoOtorgamiento.objects.get_or_create(nombre="Provincial")
        self.career = Carrera.objects.create(
            codigo="COR-1", nombre="Carrera con corte", ces=ces, provincia=self.province,
        )
        other_career = Carrera.objects.create(
            codigo="COR-2", nombre="Carrera de otra provincia", ces=ces, provincia=self.other_province,
        )
        stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[6])
        process = Proceso.objects.create(anio=date(2025, 1, 1), etapa=stage)
        PlanPlaza.objects.create(
            proceso=process, carrera=self.career, cantidad_plazas=1,
            otorgamiento_tipo=award_type, ces=ces, provincia=self.province, sexo="A",
        )
        PlanPlaza.objects.create(
            proceso=process, carrera=other_career, cantidad_plazas=1,
            otorgamiento_tipo=award_type, ces=ces, provincia=self.other_province, sexo="A",
        )
        CorteCarrera.objects.create(proceso=process, carrera=self.career, indice_corte=92.5)
        CorteCarrera.objects.create(proceso=process, carrera=other_career, indice_corte=88.0)

    def test_anonymous_user_can_read_historical_cuts(self):
        from .views import LandingCortesView

        request = APIRequestFactory().get("/api/import-export/cortes/landing/", {"anio": 2025})
        view = LandingCortesView()
        drf_request = view.initialize_request(request)
        drf_request.user = AnonymousUser()
        response = view.get(drf_request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["year"], 2025)
        self.assertEqual(len(response.data["items"]), 2)

    def test_anonymous_user_can_download_filtered_historical_cuts(self):
        from .views import LandingExcelExportView

        request = APIRequestFactory().get(
            "/api/import-export/landing/export/cortes/",
            {"anio": 2025, "provincia": self.province.nombre},
        )
        request.user = AnonymousUser()
        view = LandingExcelExportView()
        response = view.get(view.initialize_request(request), "cortes")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        workbook = load_workbook(BytesIO(response.content), read_only=True)
        rows = list(workbook.active.values)
        self.assertEqual(rows[1][0], "COR-1")
        self.assertEqual(len(rows), 2)