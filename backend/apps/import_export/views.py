from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from rest_framework import status, permissions
from .services.excel_service import ExcelService
from .services.mappers import PLAN_PLAZA_MAP, PLAN_PLAZA_FK, OTORGAMIENTO_MAP, OTORGAMIENTO_FK
from .services.validators import validate_plan_plaza
from apps.gestion_provincial.models import PlanPlaza, Otorgamiento
from apps.gestion_provincial.permissions import IsCareerManager
from apps.superadmin.models import Carrera
from .services.carreras_service import CareerExcelService

class ImportPlanPlazaView(APIView):
    permission_classes = [permissions.IsAuthenticated]  # ajustar roles
    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        service = ExcelService(
            model=PlanPlaza,
            column_map=PLAN_PLAZA_MAP,
            fk_resolvers=PLAN_PLAZA_FK,
            validator=validate_plan_plaza,
            update_on_conflict=None
        )
        result = service.import_file(file)
        return Response({
            "inserted": result.inserted,
            "updated": result.updated,
            "errors": result.errors
        })

class ImportOtorgamientoView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        file = request.FILES.get("file")
        service = ExcelService(
            model=Otorgamiento,
            column_map=OTORGAMIENTO_MAP,
            fk_resolvers=OTORGAMIENTO_FK,
            validator=None
        )
        result = service.import_file(file)
        return Response({"inserted": result.inserted, "errors": result.errors})


class ImportCarrerasView(APIView):
    permission_classes = [IsCareerManager]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Debe adjuntar un archivo Excel."}, status=status.HTTP_400_BAD_REQUEST)
        result = CareerExcelService().import_file(file)
        if result.errors:
            return Response({"inserted": 0, "errors": result.errors}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"inserted": result.inserted, "errors": []})


class ExportCarrerasView(APIView):
    permission_classes = [IsCareerManager]

    def get(self, request):
        data = CareerExcelService().export_file(Carrera.objects.all().order_by("nombre"))
        response = HttpResponse(
            data,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="carreras.xlsx"'
        return response
