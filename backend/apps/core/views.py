from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from openpyxl import Workbook
from rest_framework.views import APIView
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    extend_schema,
    inline_serializer,
)
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers as drf_serializers

from .models import LogAuditoria, Notificacion
from .permissions import CanViewAuditLogs
from .responses import api_success
from .serializers import AuditLogSerializer, NotificationSerializer
from .audit import record_audit
from .pdf import render_pdf


AUDIT_LOG_FILTER_PARAMETERS = [
    OpenApiParameter(
        name="usuario",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
        required=False,
        description="Filtra por nombre de usuario (coincidencia parcial, insensible a mayúsculas).",
    ),
    OpenApiParameter(
        name="accion",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
        required=False,
        description="Filtra por acción registrada (coincidencia parcial, insensible a mayúsculas).",
    ),
    OpenApiParameter(
        name="modulo",
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
        required=False,
        description="Filtra por módulo del sistema (coincidencia parcial, insensible a mayúsculas).",
    ),
    OpenApiParameter(
        name="fecha_desde",
        type=OpenApiTypes.DATE,
        location=OpenApiParameter.QUERY,
        required=False,
        description="Fecha mínima (inclusive) del log, formato ISO 8601 (YYYY-MM-DD).",
    ),
    OpenApiParameter(
        name="fecha_hasta",
        type=OpenApiTypes.DATE,
        location=OpenApiParameter.QUERY,
        required=False,
        description="Fecha máxima (inclusive) del log, formato ISO 8601 (YYYY-MM-DD).",
    ),
]


@extend_schema(
    tags=["Core"],
    summary="Verificar el estado del servicio",
    description=(
        "Devuelve un estado simple para confirmar que el backend está en funcionamiento. "
        "Requiere un usuario autenticado."
    ),
    responses={
        200: inline_serializer(
            name="HealthCheckResponse",
            fields={
                "status": drf_serializers.CharField(),
                "service": drf_serializers.CharField(),
            },
        ),
    },
    examples=[
        OpenApiExample(
            "Servicio saludable",
            value={
                "success": True,
                "data": {"status": "ok", "service": "IngresoSUP backend"},
                "error": None,
            },
            response_only=True,
        ),
    ],
)
class HealthCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return api_success({"status": "ok", "service": "IngresoSUP backend"})


@extend_schema(
    tags=["Core"],
    summary="Listar notificaciones del usuario",
    description=(
        "Devuelve hasta 30 notificaciones del usuario autenticado, ordenadas de la más "
        "reciente a la más antigua."
    ),
    responses={
        200: inline_serializer(
            name="NotificationListResponse",
            fields={"notifications": NotificationSerializer(many=True)},
        ),
    },
    examples=[
        OpenApiExample(
            "Listado de notificaciones",
            value={
                "notifications": [
                    {
                        "id": 1,
                        "usuario": 3,
                        "fecha": "2026-09-20T14:30:00Z",
                        "titulo": "Nueva asignación",
                        "contenido": "Se te asignó un nuevo establecimiento.",
                        "leida": False,
                    }
                ]
            },
            response_only=True,
        ),
    ],
)
class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notificacion.objects.filter(usuario=request.user).order_by("-fecha")[:30]
        return Response({"notifications": NotificationSerializer(notifications, many=True).data})


@extend_schema(
    tags=["Core"],
    summary="Marcar una notificación como leída",
    description=(
        "Marca como leída la notificación indicada por `pk`, siempre que pertenezca al "
        "usuario autenticado. No requiere cuerpo de petición. Registra un evento de "
        "auditoría con el estado anterior y el nuevo."
    ),
    parameters=[
        OpenApiParameter(
            name="pk",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.PATH,
            required=True,
            description="Identificador de la notificación a marcar como leída.",
        ),
    ],
    request=None,
    responses={200: NotificationSerializer},
    examples=[
        OpenApiExample(
            "Notificación marcada como leída",
            value={
                "id": 1,
                "usuario": 3,
                "fecha": "2026-09-20T14:30:00Z",
                "titulo": "Nueva asignación",
                "contenido": "Se te asignó un nuevo establecimiento.",
                "leida": True,
            },
            response_only=True,
        ),
    ],
)
class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notification = get_object_or_404(Notificacion, pk=pk, usuario=request.user)
        notification.leida = True
        notification.save(update_fields=["leida"])
        record_audit(request.user, "Lectura de notificación", request.path, request=request, previous={"leida": False}, new={"leida": True, "notificacion_id": notification.id})
        return Response(NotificationSerializer(notification).data)


def filtered_audit_logs(request):
    logs = LogAuditoria.objects.select_related("usuario").all()
    if request.query_params.get("usuario"):
        logs = logs.filter(usuario_nombre__icontains=request.query_params["usuario"])
    if request.query_params.get("accion"):
        logs = logs.filter(accion__icontains=request.query_params["accion"])
    if request.query_params.get("modulo"):
        logs = logs.filter(modulo__icontains=request.query_params["modulo"])
    if request.query_params.get("fecha_desde"):
        logs = logs.filter(created_at__date__gte=request.query_params["fecha_desde"])
    if request.query_params.get("fecha_hasta"):
        logs = logs.filter(created_at__date__lte=request.query_params["fecha_hasta"])
    return logs.order_by("-created_at")


@extend_schema(
    tags=["Auditoría"],
    summary="Listar logs de auditoría",
    description=(
        "Devuelve hasta 500 registros de la traza de auditoría del sistema, ordenados del "
        "más reciente al más antiguo, junto con el total de registros que cumplen los "
        "filtros aplicados. Solo pueden acceder usuarios superadministradores o con rol "
        "'jefe_comision' (ver `CanViewAuditLogs`)."
    ),
    parameters=AUDIT_LOG_FILTER_PARAMETERS,
    responses={
        200: inline_serializer(
            name="AuditLogListResponse",
            fields={
                "logs": AuditLogSerializer(many=True),
                "total": drf_serializers.IntegerField(),
            },
        ),
    },
    examples=[
        OpenApiExample(
            "Listado de logs de auditoría",
            value={
                "success": True,
                "data": {
                    "logs": [
                        {
                            "id": 10,
                            "created_at": "2026-09-20T14:30:00Z",
                            "usuario": 3,
                            "usuario_nombre": "jperez",
                            "rol": "jefe_comision",
                            "ip": "192.168.1.10",
                            "modulo": "gestion_escuela",
                            "accion": "Actualización de establecimiento",
                            "datos_anteriores": {"nombre": "Escuela A"},
                            "datos_nuevos": {"nombre": "Escuela B"},
                        }
                    ],
                    "total": 1,
                },
                "error": None,
            },
            response_only=True,
        ),
    ],
)
class AuditLogListView(APIView):
    permission_classes = [CanViewAuditLogs]

    def get(self, request):
        logs = filtered_audit_logs(request)
        return api_success({"logs": AuditLogSerializer(logs[:500], many=True).data, "total": logs.count()})


@extend_schema(
    tags=["Auditoría"],
    summary="Exportar logs de auditoría a Excel",
    description=(
        "Genera y descarga un archivo Excel (.xlsx) con hasta 500 registros de la traza de "
        "auditoría que cumplen los filtros aplicados. Solo pueden acceder usuarios "
        "superadministradores o con rol 'jefe_comision' (ver `CanViewAuditLogs`)."
    ),
    parameters=AUDIT_LOG_FILTER_PARAMETERS,
    responses={
        (200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"): OpenApiTypes.BINARY,
    },
)
class AuditLogExportView(APIView):
    permission_classes = [CanViewAuditLogs]

    def get(self, request):
        logs = filtered_audit_logs(request)
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["Fecha", "Usuario", "Rol", "IP", "Módulo", "Acción", "Datos anteriores", "Datos nuevos"])
        for log in logs[:500]:
            sheet.append([timezone.localtime(log.created_at).strftime("%Y-%m-%d %H:%M:%S"), log.usuario_nombre, log.rol, log.ip, log.modulo, log.accion, log.datos_anteriores, log.datos_nuevos])
        import io
        output = io.BytesIO()
        workbook.save(output)
        response = HttpResponse(output.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = 'attachment; filename="logs-auditoria.xlsx"'
        return response


@extend_schema(
    tags=["Auditoría"],
    summary="Exportar logs de auditoría a PDF",
    description=(
        "Genera y descarga un archivo PDF con hasta 500 registros de la traza de auditoría "
        "que cumplen los filtros aplicados. Solo pueden acceder usuarios superadministradores "
        "o con rol 'jefe_comision' (ver `CanViewAuditLogs`)."
    ),
    parameters=AUDIT_LOG_FILTER_PARAMETERS,
    responses={(200, "application/pdf"): OpenApiTypes.BINARY},
)
class AuditLogPdfView(APIView):
    permission_classes = [CanViewAuditLogs]

    def get(self, request):
        logs = filtered_audit_logs(request)
        lines = [
            f"{timezone.localtime(log.created_at):%Y-%m-%d %H:%M} | {log.usuario_nombre} | {log.rol} | {log.modulo} | {log.accion} | {log.ip}"
            for log in logs[:500]
        ]
        pdf = render_pdf("Logs de auditoría", lines)
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="logs-auditoria.pdf"'
        return response


