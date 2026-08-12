from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .services.excel_service import ExcelService
from .services.mappers import PLAN_PLAZA_MAP, PLAN_PLAZA_FK, OTORGAMIENTO_MAP, OTORGAMIENTO_FK
from .services.validators import validate_plan_plaza
from apps.gestion_provincial.models import PlanPlaza, Otorgamiento

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
