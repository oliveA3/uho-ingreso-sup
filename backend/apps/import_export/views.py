from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Count, Q
from rest_framework import status, permissions
from django.db import IntegrityError
from django.db import transaction
from .services.excel_service import ExcelService
from .services.mappers import PLAN_PLAZA_MAP, PLAN_PLAZA_FK, OTORGAMIENTO_MAP, OTORGAMIENTO_FK
from .services.validators import validate_plan_plaza
from apps.gestion_provincial.models import PlanPlaza, Otorgamiento, Proceso
from apps.authentication.models import Usuario
from apps.gestion_provincial.permissions import IsCareerManager
from apps.superadmin.models import Carrera, Escuela
from .services.carreras_service import CareerExcelService
from .services.escalafon_service import EscalafonExcelService, resolve_school
from apps.gestion_escuela.models import Escalafon, EscalafonItem
from apps.gestion_escuela.serializers import EscalafonItemSerializer, StudentEscalafonActionSerializer
from apps.gestion_escuela.permissions import CanManageEscalafon
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa
from django.utils import timezone
from django.core.mail import send_mail
from openpyxl import Workbook

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


class ImportEscalafonView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.rol not in {"secretario_escuela", "jefe_comision", "superadmin"}:
            return Response({"detail": "Solo el Secretario puede importar el escalafón."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.rol == "secretario_escuela" and request.data.get("escuela") not in {None, "", str(request.user.escuela_id), request.user.escuela_id}:
            return Response({"detail": "Solo puedes importar el escalafón de tu escuela."}, status=status.HTTP_403_FORBIDDEN)
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Debe adjuntar un archivo Excel."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            escuela = resolve_school(request.data.get("escuela") or request.user.escuela_id)
            anio = int(request.data.get("anio", request.data.get("año", timezone.now().year)))
            proceso = Proceso.objects.filter(anio__year=anio).order_by("-id").first()
            if not proceso:
                raise ValueError("No existe un proceso para el año indicado.")
        except (TypeError, ValueError, Escuela.DoesNotExist):
            return Response({"detail": "Debe indicar una escuela válida y el año del escalafón."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = EscalafonExcelService().import_file(file, escuela, proceso)
        except (IntegrityError, ValueError) as error:
            if isinstance(error, IntegrityError):
                error = "Ya existe un escalafón para esa escuela y año."
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        if result.errors:
            return Response({"inserted": 0, "errors": result.errors}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"inserted": result.inserted, "errors": []}, status=status.HTTP_201_CREATED)


class ExportEscalafonView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            escuela = resolve_school(request.query_params.get("escuela") or request.user.escuela_id)
            if request.user.rol in {"secretario_escuela", "director_escuela"} and escuela.id != request.user.escuela_id:
                return Response({"detail": "Solo puedes exportar el escalafón de tu escuela."}, status=status.HTTP_403_FORBIDDEN)
            if request.user.rol == "jefe_comision" and escuela.municipio.provincia_id != request.user.provincia_id:
                return Response({"detail": "Solo puedes exportar escalafones de tu provincia."}, status=status.HTTP_403_FORBIDDEN)
            anio = int(request.query_params.get("anio", request.query_params.get("año", timezone.now().year)))
            proceso = Proceso.objects.filter(anio__year=anio).order_by("-id").first()
            if not proceso:
                raise Escalafon.DoesNotExist
            escalafon = Escalafon.objects.get(escuela=escuela, proceso=proceso)
        except (TypeError, ValueError, Escuela.DoesNotExist, Escalafon.DoesNotExist):
            return Response({"detail": "No existe un escalafón para la escuela y año indicados."}, status=status.HTTP_404_NOT_FOUND)
        data = EscalafonExcelService().export_file(EscalafonItem.objects.filter(escalafon=escalafon).order_by("estudiante__apellidos", "estudiante__nombre"))
        response = HttpResponse(data, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = f'attachment; filename="escalafon-{anio}.xlsx"'
        return response


def escalafon_stage_active():
    stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[1]).first()
    today = timezone.localdate()
    return bool(stage and stage.fecha_inicio and stage.fecha_fin and stage.fecha_inicio <= today <= stage.fecha_fin), stage


def visible_entries(request):
    entries = EscalafonItem.objects.select_related("estudiante", "escalafon__escuela")
    user = request.user
    if user.rol == "estudiante":
        return entries.filter(escalafon__escuela_id=user.escuela_id)
    if user.rol in {"secretario_escuela", "director_escuela"}:
        return entries.filter(escalafon__escuela_id=user.escuela_id)
    if user.rol == "jefe_comision":
        return entries.filter(escalafon__escuela__municipio__provincia_id=user.provincia_id)
    return entries


class EscalafonListView(APIView):
    permission_classes = [CanManageEscalafon]

    def get(self, request):
        entries = visible_entries(request).order_by("-escalafon__proceso__anio", "-indice_general", "estudiante__apellidos")
        active, _ = escalafon_stage_active()
        serialized = EscalafonItemSerializer(entries, many=True, context={"request": request}).data
        current = entries.filter(estudiante__usuario=request.user).first() if request.user.rol == "estudiante" else None
        return Response({"entries": serialized, "stage_active": active, "actual_id": current.id if current else None})


class ProvincialEscalafonSummaryView(APIView):
    permission_classes = [CanManageEscalafon]

    def get(self, request):
        if request.user.rol != "jefe_comision" and not request.user.is_superuser and request.user.rol != "superadmin":
            return Response({"detail": "Solo el Jefe de Comisión puede consultar este resumen."}, status=403)
        process = Proceso.objects.filter(anio__year=timezone.now().year).order_by("-id").first()
        municipalities = Escuela.objects.filter(
            municipio__provincia_id=request.user.provincia_id
        ).values("municipio_id", "municipio__nombre").annotate(
            schools_count=Count("id"),
            sent_count=Count("escalafones", filter=Q(escalafones__proceso=process, escalafones__estado="enviado"), distinct=True),
            students_count=Count("escalafones__estudiantes", filter=Q(escalafones__proceso=process, escalafones__estado="enviado"), distinct=True),
        ).order_by("municipio__nombre")
        data = []
        for municipality in municipalities:
            sent = municipality["sent_count"]
            schools = municipality["schools_count"]
            municipality_schools = Escuela.objects.filter(
                municipio_id=municipality["municipio_id"]
            ).values("id", "nombre")
            school_statuses = dict(Escalafon.objects.filter(
                proceso=process,
                escuela_id__in=municipality_schools.values("id"),
            ).values_list("escuela_id", "estado")) if process else {}
            data.append({
                "id": municipality["municipio_id"],
                "nombre": municipality["municipio__nombre"],
                "escuelas": schools,
                "escuelas_enviaron": sent,
                "estudiantes": municipality["students_count"],
                "estado": "Completo" if sent == schools and schools else "Parcial" if sent else "Pendiente",
                "escuelas_lista": [
                    {"id": school["id"], "nombre": school["nombre"], "estado": school_statuses.get(school["id"], "pendiente")}
                    for school in municipality_schools
                ],
            })
        return Response({
            "escuelas_enviaron": sum(item["escuelas_enviaron"] for item in data),
            "escuelas_pendientes": sum(item["escuelas"] - item["escuelas_enviaron"] for item in data),
            "total_estudiantes": sum(item["estudiantes"] for item in data),
            "municipios": data,
        })


class ProvincialEscalafonExportView(APIView):
    permission_classes = [CanManageEscalafon]

    def get(self, request):
        if request.user.rol != "jefe_comision" and not request.user.is_superuser and request.user.rol != "superadmin":
            return Response({"detail": "Solo el Jefe de Comisión puede exportar este resumen."}, status=403)
        process = Proceso.objects.filter(anio__year=timezone.now().year).order_by("-id").first()
        entries = EscalafonItem.objects.filter(
            escalafon__proceso=process,
            escalafon__escuela__municipio__provincia_id=request.user.provincia_id,
        ).order_by("escalafon__escuela__municipio__nombre", "estudiante__apellidos", "estudiante__nombre")
        data = EscalafonExcelService().export_file(entries)
        response = HttpResponse(data, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = 'attachment; filename="escalafones-provinciales.xlsx"'
        return response


class EscalafonTemplateView(APIView):
    permission_classes = [CanManageEscalafon]

    def get(self, request):
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.append(["CI", "Nombre", "Apellidos", "Sexo", "Dirección", "Índice_10mo", "Índice_11mo", "Índice_12mo", "Índice_General"])
        output = io.BytesIO()
        workbook.save(output)
        response = HttpResponse(output.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = 'attachment; filename="plantilla-escalafon.xlsx"'
        return response


class EscalafonEntryView(APIView):
    permission_classes = [CanManageEscalafon]

    def patch(self, request, pk):
        try:
            entry = visible_entries(request).get(pk=pk)
        except EscalafonItem.DoesNotExist:
            return Response({"detail": "Registro no encontrado."}, status=404)
        if entry.escalafon.estado == "enviado":
            return Response({"detail": "El escalafón ya fue enviado y no puede modificarse."}, status=403)
        active, _ = escalafon_stage_active()
        serializer = EscalafonItemSerializer(entry, data=request.data, partial=True, context={"request": request, "stage_active": active})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


class EscalafonSendView(APIView):
    permission_classes = [CanManageEscalafon]

    def post(self, request):
        if request.user.rol != "secretario_escuela":
            return Response({"detail": "Solo el Secretario puede enviar índices a la Comisión."}, status=403)
        entries = visible_entries(request).filter(escalafon__proceso__anio__year=timezone.now().year)
        if entries.filter(estado="por_revisar").exists():
            return Response({"detail": "No puedes enviar el escalafón mientras existan reclamaciones pendientes."}, status=400)
        escalafones = Escalafon.objects.filter(
            id__in=entries.values("escalafon_id"),
            escuela=request.user.escuela,
        )
        with transaction.atomic():
            escalafones.update(estado="enviado")
            entries.update(indices_bloqueados=True)
        return Response({"updated": entries.count()})


class StudentEscalafonActionView(APIView):
    permission_classes = [CanManageEscalafon]

    def post(self, request, action):
        if request.user.rol != "estudiante":
            return Response({"detail": "Solo un estudiante puede realizar esta acción."}, status=403)
        try:
            entry = EscalafonItem.objects.get(estudiante__usuario=request.user, escalafon__proceso__anio__year=timezone.now().year)
        except EscalafonItem.DoesNotExist:
            return Response({"detail": "No tienes un escalafón vigente."}, status=404)
        serializer = StudentEscalafonActionSerializer(data=request.data, context={"action": action})
        serializer.is_valid(raise_exception=True)
        if action not in {"aceptar", "revision"}:
            return Response({"detail": "Acción no válida."}, status=400)
        if entry.escalafon.estado == "enviado":
            return Response({"detail": "El escalafón ya fue enviado y solo puede consultarse."}, status=403)
        entry.estado = "aceptado" if action == "aceptar" else "por_revisar"
        entry.causa_revision = serializer.validated_data.get("causa", "") if action == "revision" else ""
        entry.fecha_revision = timezone.now() if action == "revision" else None
        entry.save(update_fields=["estado", "causa_revision", "fecha_revision"])
        from apps.core.models import Notificacion
        secretaries = Usuario.objects.filter(rol="secretario_escuela", escuela=entry.escalafon.escuela)
        message = f"El estudiante {entry.estudiante.nombre} {entry.estudiante.apellidos} {'solicitó revisión' if action == 'revision' else 'aceptó sus índices'}."
        for secretary in secretaries:
            Notificacion.objects.create(usuario=secretary, mensaje=message)
            if secretary.email:
                send_mail("Actualización de escalafón", message, None, [secretary.email], fail_silently=True)
        return Response(EscalafonItemSerializer(entry, context={"request": request}).data)


class EscalafonReviewView(APIView):
    permission_classes = [CanManageEscalafon]

    def post(self, request, pk):
        if request.user.rol != "secretario_escuela":
            return Response({"detail": "Solo el Secretario puede revisar solicitudes."}, status=403)
        try:
            entry = visible_entries(request).get(pk=pk)
        except EscalafonItem.DoesNotExist:
            return Response({"detail": "Registro no encontrado."}, status=404)
        if entry.estado != "por_revisar":
            return Response({"detail": "Esta reclamación no está pendiente."}, status=400)
        entry.estado = "sin_respuesta"
        entry.save(update_fields=["estado"])
        return Response(EscalafonItemSerializer(entry, context={"request": request}).data)
