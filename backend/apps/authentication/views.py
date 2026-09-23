from django.contrib.auth import authenticate, login, logout
from apps.core.emailing import send_email_async
from datetime import timedelta
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import OpenApiExample, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .cookies import REFRESH_COOKIE_NAME, clear_auth_cookies, set_auth_cookies
from .models import EmailVerificationCode, LoginAttempt, PRIVACY_POLICY_VERSION, Usuario
from .serializers import ChangePasswordSerializer, LoginSerializer, RegisterSerializer, UserSerializer
from apps.core.audit import record_audit
from apps.core.responses import api_error, api_success
from apps.core.throttling import AuthenticationRateThrottle


@extend_schema(
    tags=["Autenticación"],
    summary="Iniciar sesión",
    description=(
        "Autentica un usuario con `username` y `password`, y establece los tokens JWT "
        "de acceso y refresco en cookies HttpOnly. Aplica bloqueo temporal tras 5 intentos "
        "fallidos consecutivos (15 minutos) mediante `AuthenticationRateThrottle`."
    ),
    request=LoginSerializer,
    responses={
        200: inline_serializer(
            name="LoginResponse",
            fields={"user": UserSerializer()},
        ),
        401: inline_serializer(name="LoginInvalidCredentialsResponse", fields={"detail": serializers.CharField()}),
        403: inline_serializer(name="LoginPendingVerificationResponse", fields={"detail": serializers.CharField()}),
        429: inline_serializer(name="LoginLockedResponse", fields={"detail": serializers.CharField()}),
    },
    examples=[
        OpenApiExample(
            "Login válido",
            value={"username": "jefe.comision", "password": "MiClaveSegura123"},
            request_only=True,
        ),
        OpenApiExample(
            "Sesión iniciada",
            value={
                "success": True,
                "data": {"user": {"id": 3, "username": "jefe.comision", "rol": "jefe_comision"}},
                "error": None,
            },
            response_only=True,
        ),
        OpenApiExample(
            "Credenciales inválidas",
            value={"success": False, "data": None, "error": {"detail": "Credenciales inválidas."}},
            response_only=True,
            status_codes=["401"],
        ),
    ],
)
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


@extend_schema(
    tags=["Autenticación"],
    summary="Verificar correo electrónico",
    description=(
        "Confirma el código de verificación enviado por correo a un usuario recién registrado "
        "(`username` + `code`). Requiere que el usuario ya haya aceptado la política de privacidad "
        "en el registro. Al verificarse, activa la cuenta (`is_active=True`), asocia el estudiante "
        "pendiente si corresponde, y envía por correo una copia de la política de privacidad aceptada."
    ),
    request=inline_serializer(
        name="VerifyEmailRequest",
        fields={
            "username": serializers.CharField(),
            "code": serializers.CharField(),
        },
    ),
    responses={
        200: inline_serializer(name="VerifyEmailResponse", fields={"detail": serializers.CharField()}),
        400: inline_serializer(name="VerifyEmailErrorResponse", fields={"detail": serializers.CharField()}),
    },
    examples=[
        OpenApiExample(
            "Código de verificación",
            value={"username": "juan.perez", "code": "123456"},
            request_only=True,
        ),
        OpenApiExample(
            "Correo verificado",
            value={"success": True, "data": {"detail": "Correo verificado correctamente."}, "error": None},
            response_only=True,
        ),
        OpenApiExample(
            "Código inválido o vencido",
            value={"success": False, "data": None, "error": {"detail": "El código es inválido o ya venció."}},
            response_only=True,
            status_codes=["400"],
        ),
    ],
)
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
        if not user.politica_privacidad_aceptada or not user.politica_privacidad_fecha_aceptacion:
            return api_error(
                {"detail": "Debes aceptar la política de privacidad antes de verificar el correo."},
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

        policy_text = (
            "Política de privacidad de IngresoSUP\n\n"
            "Este sistema recopila y procesa los datos necesarios para gestionar su inscripción, identificación y seguimiento académico.\n"
            "Los datos personales que se incorporan incluyen: nombre completo, CI, correo electrónico, teléfonos, provincia, municipio, escuela y datos relativos al proceso de ingreso.\n\n"
            "La información se utiliza únicamente para la administración del proceso de ingreso, comunicación con el estudiante y cumplimiento de la normativa institucional.\n"
            "Se conservarán únicamente durante el tiempo necesario para la gestión del proceso y la normativa aplicable.\n\n"
            "El estudiante puede solicitar acceso, corrección o eliminación de sus datos conforme a la normativa vigente.\n"
            f"Aceptó la política de privacidad (versión {user.politica_privacidad_version}) el "
            + user.politica_privacidad_fecha_aceptacion.strftime("%d/%m/%Y a las %H:%M") + "."
        )
        send_email_async(
            subject="Política de privacidad - IngresoSUP",
            message=(
                f"Estimado/a {user.get_full_name() or user.username},\n\n"
                f"Su correo ha sido verificado correctamente.\n\n{policy_text}\n\n"
                "Si necesita más información, puede contactar con la institución."
            ),
            recipient_list=[user.email],
        )
        record_audit(user, "Verificación de correo electrónico", request.path, request=request, new={"email_verificado": True, "is_active": True, "politica_privacidad_aceptada": True, "politica_privacidad_version": PRIVACY_POLICY_VERSION})
        return api_success({"detail": "Correo verificado correctamente."}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Autenticación"],
    summary="Cambiar correo de una cuenta pendiente de verificación",
    description=(
        "Permite corregir el correo electrónico de una cuenta que aún no ha sido verificada "
        "(`is_active=False`, `email_verificado=False`), identificada por `username`. Invalida "
        "cualquier código de verificación previo sin usar, genera y envía por correo un nuevo "
        "código de verificación de 6 dígitos válido por 15 minutos."
    ),
    request=inline_serializer(
        name="ChangePendingEmailRequest",
        fields={
            "username": serializers.CharField(),
            "email": serializers.EmailField(),
        },
    ),
    responses={
        200: inline_serializer(name="ChangePendingEmailResponse", fields={"detail": serializers.CharField()}),
        400: inline_serializer(name="ChangePendingEmailErrorResponse", fields={"detail": serializers.CharField()}),
        404: inline_serializer(name="ChangePendingEmailNotFoundResponse", fields={"detail": serializers.CharField()}),
    },
    examples=[
        OpenApiExample(
            "Cambio de correo pendiente",
            value={"username": "juan.perez", "email": "nuevo.correo@example.com"},
            request_only=True,
        ),
        OpenApiExample(
            "Correo actualizado",
            value={
                "success": True,
                "data": {"detail": "Correo actualizado. Enviamos un nuevo código de verificación."},
                "error": None,
            },
            response_only=True,
        ),
        OpenApiExample(
            "Correo ya registrado",
            value={"success": False, "data": None, "error": {"detail": "Este correo ya está registrado."}},
            response_only=True,
            status_codes=["400"],
        ),
        OpenApiExample(
            "Cuenta pendiente no encontrada",
            value={
                "success": False,
                "data": None,
                "error": {"detail": "No existe una cuenta pendiente de verificación para ese usuario."},
            },
            response_only=True,
            status_codes=["404"],
        ),
    ],
)
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
        send_email_async(
            subject="Código de verificación de IngresoSUP",
            message=f"Tu nuevo código de verificación es: {code}\n\nEste código vence en 15 minutos.",
            recipient_list=[email],
        )
        record_audit(user, "Cambio de correo pendiente", request.path, request=request, previous={"email": previous_email}, new={"email": email})
        return api_success({"detail": "Correo actualizado. Enviamos un nuevo código de verificación."}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Autenticación"],
    summary="Renovar token de acceso",
    description=(
        "Renueva el token de acceso JWT a partir del refresh token almacenado en la cookie "
        "HttpOnly `refresh_token` (no se envía en el body). Si el refresh token es inválido o "
        "expiró, limpia las cookies de autenticación. Establece las nuevas cookies `access_token` "
        "y, si corresponde, `refresh_token` en la respuesta."
    ),
    request=None,
    responses={
        200: inline_serializer(name="TokenRefreshResponse", fields={"detail": serializers.CharField()}),
        401: inline_serializer(name="TokenRefreshErrorResponse", fields={"detail": serializers.CharField()}),
    },
    examples=[
        OpenApiExample(
            "Token renovado",
            value={"success": True, "data": {"detail": "Token renovado."}, "error": None},
            response_only=True,
        ),
        OpenApiExample(
            "Sin sesión activa",
            value={"success": False, "data": None, "error": {"detail": "No hay una sesión activa."}},
            response_only=True,
            status_codes=["401"],
        ),
        OpenApiExample(
            "Sesión expirada",
            value={"success": False, "data": None, "error": {"detail": "La sesión expiró, inicia sesión nuevamente."}},
            response_only=True,
            status_codes=["401"],
        ),
    ],
)
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


@extend_schema(
    tags=["Autenticación"],
    summary="Registrar estudiante",
    description=(
        "Registra una nueva cuenta de estudiante validando que el CI y la escuela aparezcan en el "
        "escalafón del año en curso, y que el registro esté habilitado (Etapa 1 en curso). La cuenta "
        "se crea inactiva y sin verificar hasta completar la verificación de correo; envía un código "
        "de verificación por correo electrónico."
    ),
    request=RegisterSerializer,
    responses={
        201: inline_serializer(name="RegisterResponse", fields={"user": UserSerializer()}),
        400: inline_serializer(name="RegisterErrorResponse", fields={"detail": serializers.CharField()}),
        403: inline_serializer(name="RegisterClosedResponse", fields={"detail": serializers.CharField()}),
    },
    examples=[
        OpenApiExample(
            "Registro de estudiante",
            value={
                "ci": "01234567890",
                "escuela": 5,
                "email": "estudiante@example.com",
                "username": "juan.perez",
                "password": "ClaveSegura123",
                "whatsapp": "+5355555555",
                "tutor_nombre": "María Pérez",
                "tutor_email": "tutor@example.com",
                "tutor_telefono": "+5355555556",
                "politica_privacidad_aceptada": True,
            },
            request_only=True,
        ),
        OpenApiExample(
            "Cuenta creada, pendiente de verificación",
            value={
                "success": True,
                "data": {"user": {"id": 10, "username": "juan.perez", "rol": "estudiante"}},
                "error": None,
            },
            response_only=True,
            status_codes=["201"],
        ),
        OpenApiExample(
            "Registro cerrado",
            value={
                "success": False,
                "data": None,
                "error": {"detail": "El registro estudiantil solo está disponible durante la etapa 1."},
            },
            response_only=True,
            status_codes=["403"],
        ),
    ],
)
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


@extend_schema(
    tags=["Autenticación"],
    summary="Obtener usuario autenticado",
    description="Devuelve los datos del usuario actualmente autenticado según las cookies de sesión JWT.",
    responses={
        200: inline_serializer(name="CurrentUserResponse", fields={"user": UserSerializer()}),
        401: inline_serializer(name="CurrentUserUnauthorizedResponse", fields={"detail": serializers.CharField()}),
    },
    examples=[
        OpenApiExample(
            "Usuario actual",
            value={
                "success": True,
                "data": {"user": {"id": 3, "username": "jefe.comision", "rol": "jefe_comision"}},
                "error": None,
            },
            response_only=True,
        ),
    ],
)
class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return api_success({"user": UserSerializer(request.user).data}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Autenticación"],
    summary="Cerrar sesión",
    description=(
        "Cierra la sesión del usuario autenticado, invalida (blacklist) el refresh token vigente "
        "si existe, y limpia las cookies HttpOnly de autenticación."
    ),
    request=None,
    responses={
        200: inline_serializer(name="LogoutResponse", fields={"detail": serializers.CharField()}),
        401: inline_serializer(name="LogoutUnauthorizedResponse", fields={"detail": serializers.CharField()}),
    },
    examples=[
        OpenApiExample(
            "Sesión cerrada",
            value={"success": True, "data": {"detail": "Sesión cerrada."}, "error": None},
            response_only=True,
        ),
    ],
)
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


@extend_schema(
    tags=["Autenticación"],
    summary="Obtener cookie CSRF",
    description=(
        "Establece la cookie CSRF (`csrftoken`) en el cliente. Debe llamarse antes de enviar "
        "peticiones que requieran el header `X-CSRFToken` (p. ej. login, registro)."
    ),
    responses={
        200: inline_serializer(name="CsrfCookieResponse", fields={"detail": serializers.CharField()}),
    },
    examples=[
        OpenApiExample(
            "Cookie CSRF establecida",
            value={"success": True, "data": {"detail": "Cookie CSRF disponible."}, "error": None},
            response_only=True,
        ),
    ],
)
@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfCookieView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return api_success({"detail": "Cookie CSRF disponible."}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Autenticación"],
    summary="Cambiar contraseña",
    description=(
        "Cambia la contraseña del usuario autenticado. Es obligatorio en el primer inicio de sesión de las cuentas "
        "creadas por un administrador (contraseña temporal): mientras `debe_cambiar_password` sea verdadero, el resto "
        "de la API responde 403. La nueva contraseña debe cumplir las políticas de seguridad y ser distinta de la actual."
    ),
    request=ChangePasswordSerializer,
    responses={
        200: inline_serializer(name="ChangePasswordResponse", fields={"detail": serializers.CharField()}),
        400: inline_serializer(name="ChangePasswordError", fields={"new_password": serializers.ListField(child=serializers.CharField())}),
        401: inline_serializer(name="ChangePasswordUnauthorized", fields={"detail": serializers.CharField()}),
    },
    examples=[
        OpenApiExample("Cambio de contraseña", value={"current_password": "TempPass123", "new_password": "MiNuevaClave#2026"}, request_only=True),
    ],
)
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthenticationRateThrottle]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.debe_cambiar_password = False
        user.save(update_fields=["password", "debe_cambiar_password"])
        record_audit(user, "Cambio de contraseña", request.path, request=request)
        return api_success({"detail": "Contraseña actualizada correctamente."}, status=status.HTTP_200_OK)
