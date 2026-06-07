from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from .models import AuditLog, Role, User
from .permissions import IsSuperAdmin
from .serializers import (
    AuditLogSerializer,
    LoginSerializer,
    RegisterSerializer,
    RoleAssignSerializer,
    RoleSerializer,
    UserSerializer,
)


class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        return JsonResponse({"status": "ok", "service": "IngresoSUP backend"})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]
        user = authenticate(request, username=username, password=password)
        if user is None:
            return JsonResponse(
                {"detail": "Credenciales inválidas."}, status=status.HTTP_401_UNAUTHORIZED
            )
        login(request, user)
        data = UserSerializer(user).data
        return JsonResponse({"user": data}, status=status.HTTP_200_OK)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return JsonResponse({"user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return JsonResponse({"detail": "Sesión cerrada."}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return JsonResponse({"user": UserSerializer(request.user).data}, status=status.HTTP_200_OK)


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
        return JsonResponse({"user": UserSerializer(user).data}, status=status.HTTP_200_OK)


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
