from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from .models import LogAuditoria, Rol, Usuario
from .permissions import IsSuperAdmin
from .serializers import (
    AuditLogSerializer,
    RoleAssignSerializer,
    RoleSerializer,
)


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return JsonResponse({"status": "ok", "service": "IngresoSUP backend"})


class RoleListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        roles = Role.objects.all().order_by("-level")
        return JsonResponse({"roles": RoleSerializer(roles, many=True).data}, status=status.HTTP_200_OK)


class RoleAdminView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        roles = Role.objects.all().order_by("-level")
        return JsonResponse({"roles": RoleSerializer(roles, many=True).data}, status=status.HTTP_200_OK)


class UserRoleUpdateView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        serializer = RoleAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = get_object_or_404(Role, pk=serializer.validated_data["rol_id"])
        previous_role = user.rol
        user.rol = role
        user.save()
        AuditLog.objects.create(
            actor=request.user,
            target_user=user,
            action="Cambio de rol",
            detail=f"Rol modificado de {previous_role.name if previous_role else 'N/A'} a {role.name}.",
        )
        return JsonResponse({"user": {"id": user.id, "rol": role.name}}, status=status.HTTP_200_OK)


class AuditLogListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        logs = AuditLog.objects.all().order_by("-timestamp")[:100]
        return JsonResponse({"logs": AuditLogSerializer(logs, many=True).data}, status=status.HTTP_200_OK)


# Placeholder de futuras APIs REST de módulos:
# - BoletasView
# - EscalafonView
# - ReportesView
# - PlanPlazasView
# - IndicesCorteView
