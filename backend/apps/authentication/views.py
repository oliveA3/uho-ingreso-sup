from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from apps.core.audit import record_audit


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]
        user = authenticate(request, username=username, password=password)
        if user is None:
            return JsonResponse(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        login(request, user)
        record_audit(user, "Inicio de sesión", "authentication/login", request=request)
        return JsonResponse({"user": UserSerializer(user).data}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa

        registro_abierto = Etapa.objects.filter(
            nombre__in=[ETAPAS_NOMBRES[1], ETAPAS_NOMBRES[2]],
            estado="en_curso",
        ).exists()
        if not registro_abierto:
            return JsonResponse(
                {"detail": "El registro estudiantil solo está disponible durante las etapas 1 y 2."},
                status=status.HTTP_403_FORBIDDEN,
            )
        user = serializer.save()
        record_audit(user, "Registro estudiantil", "authentication/register", request=request)
        return JsonResponse({"user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name="dispatch")
class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return JsonResponse({"user": UserSerializer(request.user).data}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        record_audit(request.user, "Cierre de sesión", "authentication/logout", request=request)
        logout(request)
        return JsonResponse({"detail": "Sesión cerrada."}, status=status.HTTP_200_OK)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfCookieView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return JsonResponse({"detail": "Cookie CSRF disponible."}, status=status.HTTP_200_OK)
