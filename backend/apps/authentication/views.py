from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.core.mail import send_mail
from datetime import timedelta
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .cookies import REFRESH_COOKIE_NAME, clear_auth_cookies, set_auth_cookies
from .models import EmailVerificationCode, LoginAttempt, Usuario
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from apps.core.audit import record_audit
from apps.core.responses import api_error, api_success
from apps.core.throttling import AuthenticationRateThrottle


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthenticationRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]
        ip = request.META.get("REMOTE_ADDR", "0.0.0.0")
        attempt, _ = LoginAttempt.objects.get_or_create(identifier=username, ip=ip)
        if attempt.locked_until and attempt.locked_until > timezone.now():
            return api_error({"detail": "Cuenta temporalmente bloqueada. Intenta nuevamente en 15 minutos."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        user = authenticate(request, username=username, password=password)
        if user is None:
            attempt.failed_attempts += 1
            if attempt.failed_attempts >= 5:
                attempt.failed_attempts = 0
                attempt.locked_until = timezone.now() + timedelta(minutes=15)
            attempt.save(update_fields=["failed_attempts", "locked_until", "updated_at"])
            pending_user = Usuario.objects.filter(username=username).first()
            if pending_user and pending_user.check_password(password) and not pending_user.is_active:
                return api_error(
                    {"detail": "Debes verificar tu correo antes de iniciar sesión."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return api_error(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        attempt.failed_attempts = 0
        attempt.locked_until = None
        attempt.save(update_fields=["failed_attempts", "locked_until", "updated_at"])
        login(request, user)
        record_audit(user, "Inicio de sesión", "authentication/login", request=request)
        refresh = RefreshToken.for_user(user)
        response = api_success({"user": UserSerializer(user).data}, status=status.HTTP_200_OK)
        set_auth_cookies(response, access=str(refresh.access_token), refresh=str(refresh))
        return response


class VerifyEmailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthenticationRateThrottle]

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
            return api_error(
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
        record_audit(user, "Verificación de correo electrónico", request.path, request=request, new={"email_verificado": True, "is_active": True})
        return api_success({"detail": "Correo verificado correctamente."}, status=status.HTTP_200_OK)


class ChangePendingEmailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthenticationRateThrottle]

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        email = str(request.data.get("email", "")).strip().lower()
        user = Usuario.objects.filter(username=username, is_active=False, email_verificado=False).first()
        if not user:
            return api_error({"detail": "No existe una cuenta pendiente de verificación para ese usuario."}, status=status.HTTP_404_NOT_FOUND)
        if not email:
            return api_error({"detail": "El correo es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from django.core.validators import validate_email
            validate_email(email)
        except ValidationError:
            return api_error({"detail": "Introduce un correo electrónico válido."}, status=status.HTTP_400_BAD_REQUEST)
        if Usuario.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            return api_error({"detail": "Este correo ya está registrado."}, status=status.HTTP_400_BAD_REQUEST)

        previous_email = user.email
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
        record_audit(user, "Cambio de correo pendiente", request.path, request=request, previous={"email": previous_email}, new={"email": email})
        return api_success({"detail": "Correo actualizado. Enviamos un nuevo código de verificación."}, status=status.HTTP_200_OK)


class CookieTokenRefreshView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthenticationRateThrottle]

    def post(self, request):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if not refresh_token:
            return api_error({"detail": "No hay una sesión activa."}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken):
            response = api_error({"detail": "La sesión expiró, inicia sesión nuevamente."}, status=status.HTTP_401_UNAUTHORIZED)
            clear_auth_cookies(response)
            return response

        response = api_success({"detail": "Token renovado."}, status=status.HTTP_200_OK)
        set_auth_cookies(
            response,
            access=serializer.validated_data["access"],
            refresh=serializer.validated_data.get("refresh"),
        )
        return response


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthenticationRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa

        registro_abierto = Etapa.objects.filter(
            nombre=ETAPAS_NOMBRES[1],
            estado="en_curso",
        ).exists()
        if not registro_abierto:
            return api_error(
                {"detail": "El registro estudiantil solo está disponible durante la etapa 1."},
                status=status.HTTP_403_FORBIDDEN,
            )
        user = serializer.save()
        record_audit(user, "Registro estudiantil", "authentication/register", request=request)
        return api_success({"user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return api_success({"user": UserSerializer(request.user).data}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        record_audit(request.user, "Cierre de sesión", "authentication/logout", request=request)
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except Exception:
                pass
        logout(request)
        response = api_success({"detail": "Sesión cerrada."}, status=status.HTTP_200_OK)
        clear_auth_cookies(response)
        return response


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfCookieView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return api_success({"detail": "Cookie CSRF disponible."}, status=status.HTTP_200_OK)
