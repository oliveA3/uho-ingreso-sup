from django.views import View
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, filters, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from openpyxl import Workbook
from rest_framework.views import APIView

from apps.authentication.models import Usuario
from .models import LogAuditoria, Notificacion
from .permissions import CanViewAuditLogs
from .serializers import AuditLogSerializer, NotificationSerializer
from .permissions import IsSuperAdmin


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return JsonResponse({"status": "ok", "service": "IngresoSUP backend"})


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notificacion.objects.filter(usuario=request.user).order_by("-fecha")[:30]
        return Response({"notifications": NotificationSerializer(notifications, many=True).data})


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notification = get_object_or_404(Notificacion, pk=pk, usuario=request.user)
        notification.leida = True
        notification.save(update_fields=["leida"])
        return Response(NotificationSerializer(notification).data)


class RoleAdminView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return JsonResponse({"roles": []}, status=status.HTTP_200_OK)


class RoleListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return JsonResponse({"roles": []}, status=status.HTTP_200_OK)


class AuditLogListView(APIView):
    permission_classes = [CanViewAuditLogs]

    def get(self, request):
        logs = LogAuditoria.objects.select_related("usuario").all()
        if request.query_params.get("usuario"):
            logs = logs.filter(usuario__username__icontains=request.query_params["usuario"])
        if request.query_params.get("accion"):
            logs = logs.filter(accion__icontains=request.query_params["accion"])
        if request.query_params.get("modulo"):
            logs = logs.filter(modulo__icontains=request.query_params["modulo"])
        if request.query_params.get("fecha_desde"):
            logs = logs.filter(created_at__date__gte=request.query_params["fecha_desde"])
        if request.query_params.get("fecha_hasta"):
            logs = logs.filter(created_at__date__lte=request.query_params["fecha_hasta"])
        return JsonResponse({"logs": AuditLogSerializer(logs.order_by("-created_at")[:500], many=True).data})


class AuditLogExportView(APIView):
    permission_classes = [CanViewAuditLogs]

    def get(self, request):
        logs = LogAuditoria.objects.select_related("usuario").order_by("-created_at")[:500]
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["Fecha", "Usuario", "Rol", "IP", "Módulo", "Acción", "Datos anteriores", "Datos nuevos"])
        for log in logs:
            sheet.append([log.created_at.isoformat(), log.usuario.username, log.usuario.rol, log.ip, log.modulo, log.accion, log.datos_anteriores, log.datos_nuevos])
        import io
        output = io.BytesIO()
        workbook.save(output)
        response = HttpResponse(output.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = 'attachment; filename="logs-auditoria.xlsx"'
        return response


class AuditLogPdfView(APIView):
    permission_classes = [CanViewAuditLogs]

    def get(self, request):
        logs = LogAuditoria.objects.select_related("usuario").order_by("-created_at")[:500]
        lines = ["Logs de auditoria", ""] + [
            f"{log.created_at:%Y-%m-%d %H:%M} | {log.usuario.username} | {log.usuario.rol} | {log.modulo} | {log.accion} | {log.ip}"
            for log in logs
        ]
        content = "BT /F1 8 Tf 40 800 Td " + " ".join(
            f"({line.replace('(', '[').replace(')', ']')}) Tj 0 -12 Td" for line in lines
        ) + " ET"
        objects = [
            b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
            b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
            b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj",
            b"4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Courier>>endobj",
            f"5 0 obj<</Length {len(content.encode())}>>stream\n{content}\nendstream endobj".encode(),
        ]
        pdf = b"%PDF-1.4\n" + b"\n".join(objects) + b"\ntrailer<</Root 1 0 R>>\n%%EOF"
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="logs-auditoria.pdf"'
        return response


