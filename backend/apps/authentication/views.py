from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.core.mail import send_mail
from datetime import timedelta
from django.utils import timezone
from django.http import JsonResponse
from django.core.exceptions import ValidationError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from .models import EmailVerificationCode, Usuario
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
            pending_user = Usuario.objects.filter(username=username).first()
            if pending_user and pending_user.check_password(password) and not pending_user.is_active:
                return JsonResponse(
                    {"detail": "Debes verificar tu correo antes de iniciar sesión."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return JsonResponse(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        login(request, user)
        record_audit(user, "Inicio de sesión", "authentication/login", request=request)
        return JsonResponse({"user": UserSerializer(user).data}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class VerifyEmailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        code = str(request.data.get("code", "")).strip()
        user = Usuario.objects.filter(username=username).first()
        verification = (
            EmailVerificationCode.objects.filter(
                user=user, code=code, used_at__isnull=True, expires_at__gt=timezone.now()
            ).first()
            if user
            else None
        )
        if not verification:
            return JsonResponse(
                {"detail": "El código es inválido o ya venció."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verification.used_at = timezone.now()
        verification.save(update_fields=["used_at"])
        if user.pending_student_id:
            from .models import Estudiante
            Estudiante.objects.filter(pk=user.pending_student_id, usuario__isnull=True).update(usuario=user)
            user.pending_student = None
        user.email_verificado = True
        user.is_active = True
        user.save(update_fields=["email_verificado", "is_active", "pending_student"])
        return JsonResponse({"detail": "Correo verificado correctamente."}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class ChangePendingEmailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        email = str(request.data.get("email", "")).strip().lower()
        user = Usuario.objects.filter(username=username, is_active=False, email_verificado=False).first()
        if not user:
            return JsonResponse({"detail": "No existe una cuenta pendiente de verificación para ese usuario."}, status=status.HTTP_404_NOT_FOUND)
        if not email:
            return JsonResponse({"detail": "El correo es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from django.core.validators import validate_email
            validate_email(email)
        except ValidationError:
            return JsonResponse({"detail": "Introduce un correo electrónico válido."}, status=status.HTTP_400_BAD_REQUEST)
        if Usuario.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            return JsonResponse({"detail": "Este correo ya está registrado."}, status=status.HTTP_400_BAD_REQUEST)

        code = f"{__import__('secrets').randbelow(1000000):06d}"
        user.email = email
        user.save(update_fields=["email"])
        EmailVerificationCode.objects.filter(user=user, used_at__isnull=True).update(used_at=timezone.now())
        EmailVerificationCode.objects.create(user=user, code=code, expires_at=timezone.now() + timedelta(minutes=15))
        send_mail(
            subject="Código de verificación de IngresoSUP",
            message=f"Tu nuevo código de verificación es: {code}\n\nEste código vence en 15 minutos.",
            from_email=None,
            recipient_list=[email],
            fail_silently=False,
        )
        return JsonResponse({"detail": "Correo actualizado. Enviamos un nuevo código de verificación."}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa

        registro_abierto = Etapa.objects.filter(
            nombre=ETAPAS_NOMBRES[1],
            estado="en_curso",
        ).exists()
        if not registro_abierto:
            return JsonResponse(
                {"detail": "El registro estudiantil solo está disponible durante la etapa 1."},
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
