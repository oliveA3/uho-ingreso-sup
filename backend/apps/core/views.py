from django.views import View
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, filters, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from apps.authentication.models import Usuario
from .permissions import IsSuperAdmin


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return JsonResponse({"status": "ok", "service": "IngresoSUP backend"})


class RoleAdminView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return JsonResponse({"roles": []}, status=status.HTTP_200_OK)


class RoleListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return JsonResponse({"roles": []}, status=status.HTTP_200_OK)


class AuditLogListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        logs = AuditLog.objects.all().order_by("-timestamp")[:100]
        return JsonResponse({"logs": AuditLogSerializer(logs, many=True).data}, status=status.HTTP_200_OK)


