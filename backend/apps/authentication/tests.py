from django.test import TestCase
from django.test import override_settings
from django.core import mail
from django.core.cache import cache
from django.utils import timezone
from django.contrib.auth.tokens import default_token_generator
from datetime import timedelta
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from unittest.mock import patch
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import EmailVerificationCode, LoginAttempt, Usuario
from apps.authentication.serializers import SuperAdminUserSerializer, UserSerializer
from apps.gestion_personal.models import Estudiante
from apps.superadmin.models import Escuela, Municipio, Provincia


class AutheticationSmokeTests(TestCase):
    def setUp(self):
        # El throttling de los endpoints de autenticación se guarda en el
        # caché de proceso, no en la base de datos de pruebas, así que un
        # contador de una prueba anterior puede filtrarse a la siguiente.
        cache.clear()

    def test_unverified_user_cannot_login(self):
        user = Usuario.objects.create_user(
            username="pending.student",
            email="pending@example.com",
            password="secret1234",
            is_active=False,
        )

        response = self.client.post(
            "/api/v1/authentication/login/",
            data={"username": user.username, "password": "secret1234"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("verificar tu correo", response.json()["error"]["detail"])

    @patch("apps.authentication.views.send_email_async")
    def test_pending_student_login_sends_a_fresh_verification_code_only_with_correct_password(self, send_email):
        province = Provincia.objects.create(nombre="Provincia pendiente")
        municipality = Municipio.objects.create(nombre="Municipio pendiente", provincia=province)
        school = Escuela.objects.create(nombre="Escuela pendiente", municipio=municipality)
        student = Estudiante.objects.create(
            ci="00000000002",
            nombre="Estudiante",
            apellidos="Pendiente",
            sexo="F",
            direccion="Calle",
            escuela=school,
        )
        user = Usuario.objects.create_user(
            username="pending.secretary",
            email="pending.secretary@example.com",
            password="secret1234",
            is_active=False,
            pending_student=student,
        )
        expired_code = EmailVerificationCode.objects.create(
            user=user,
            code="111111",
            expires_at=timezone.now() - timedelta(minutes=1),
        )

        invalid_response = self.client.post(
            "/api/v1/authentication/login/",
            data={"username": user.username, "password": "wrong-password"},
        )
        self.assertEqual(invalid_response.status_code, 401)
        self.assertFalse(send_email.called)

        response = self.client.post(
            "/api/v1/authentication/login/",
            data={"username": user.username, "password": "secret1234"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("Te enviamos un código", response.json()["error"]["detail"])
        expired_code.refresh_from_db()
        self.assertIsNotNone(expired_code.used_at)
        new_code = EmailVerificationCode.objects.filter(user=user, used_at__isnull=True).get()
        self.assertGreater(new_code.expires_at, timezone.now())
        self.assertEqual(send_email.call_args.kwargs["recipient_list"], [user.email])

    @patch("apps.authentication.views.send_email_async")
    def test_resend_verification_code_has_generic_response_for_unknown_user(self, send_email):
        response = self.client.post(
            "/api/v1/authentication/resend-verification-code/",
            data={"username": "no-such-user"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("Si la cuenta puede verificarse", response.json()["data"]["detail"])
        self.assertFalse(send_email.called)

    @patch("apps.authentication.views.send_email_async")
    @override_settings(FRONTEND_URL="https://frontend.example")
    def test_password_reset_request_is_generic_and_sends_frontend_link(self, send_email):
        user = Usuario.objects.create_user(
            username="reset.request",
            email="reset.request@example.com",
            password="secret1234",
            email_verificado=True,
        )
        response = self.client.post(
            "/api/v1/authentication/password-reset/",
            data={"email": user.email},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("Si existe una cuenta", response.json()["data"]["detail"])
        message = send_email.call_args.kwargs["message"]
        self.assertIn("https://frontend.example/restablecer-contrasena?uid=", message)
        unknown_response = self.client.post(
            "/api/v1/authentication/password-reset/",
            data={"email": "unknown@example.com"},
        )
        self.assertEqual(unknown_response.status_code, 200)
        self.assertEqual(
            unknown_response.json()["data"]["detail"],
            response.json()["data"]["detail"],
        )
        self.assertEqual(send_email.call_count, 1)

    def test_password_reset_token_changes_password_and_cannot_be_reused(self):
        user = Usuario.objects.create_user(
            username="reset.confirm",
            email="reset.confirm@example.com",
            password="secret1234",
            email_verificado=True,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        payload = {
            "uid": uid,
            "token": token,
            "new_password": "StrongReset#927abc",
        }
        response = self.client.post(
            "/api/v1/authentication/password-reset/confirm/",
            data=payload,
        )
        self.assertEqual(response.status_code, 200, response.content)
        user.refresh_from_db()
        self.assertTrue(user.check_password(payload["new_password"]))
        reused_response = self.client.post(
            "/api/v1/authentication/password-reset/confirm/",
            data=payload,
        )
        self.assertEqual(reused_response.status_code, 400)

    def test_deactivated_verified_user_cannot_login(self):
        user = Usuario.objects.create_user(
            username="deactivated.user",
            email="deactivated@example.com",
            password="secret1234",
            is_active=False,
            email_verificado=True,
        )

        response = self.client.post(
            "/api/v1/authentication/login/",
            data={"username": user.username, "password": "secret1234"},
        )

        self.assertEqual(response.status_code, 403)
        detail = response.json()["error"]["detail"]
        self.assertIn("desactivada", detail)
        self.assertNotIn("verificar tu correo", detail)

    def test_verification_code_activates_user(self):
        user = Usuario.objects.create_user(
            username="verify.student",
            email="verify@example.com",
            password="secret1234",
            is_active=False,
            politica_privacidad_aceptada=True,
            politica_privacidad_fecha_aceptacion=timezone.now(),
        )
        EmailVerificationCode.objects.create(
            user=user,
            code="123456",
            expires_at=timezone.now() + timedelta(minutes=15),
        )

        response = self.client.post(
            "/api/v1/authentication/verify-email/",
            data={"username": user.username, "code": "123456"},
        )

        user.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(user.is_active)
        self.assertTrue(user.email_verificado)

    def test_verification_code_updates_privacy_consent_and_sends_policy_email(self):
        user = Usuario.objects.create_user(
            username="privacy.student",
            email="privacy@example.com",
            password="secret1234",
            is_active=False,
            rol="estudiante",
            politica_privacidad_aceptada=True,
            politica_privacidad_fecha_aceptacion=timezone.now(),
        )
        EmailVerificationCode.objects.create(
            user=user,
            code="654321",
            expires_at=timezone.now() + timedelta(minutes=15),
        )

        response = self.client.post(
            "/api/v1/authentication/verify-email/",
            data={"username": user.username, "code": "654321"},
        )

        user.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(user.politica_privacidad_aceptada)
        self.assertIsNotNone(user.politica_privacidad_fecha_aceptacion)
        self.assertEqual(user.politica_privacidad_version, "2025.1")
        self.assertTrue(any("Política de privacidad" in message.subject for message in mail.outbox))
        self.assertTrue(any("CI" in message.body for message in mail.outbox))

    def test_login_endpoint_returns_400_for_missing_credentials(self):
        response = self.client.post("/api/v1/authentication/login/", data={})
        self.assertEqual(response.status_code, 400)

    def test_register_endpoint_returns_400_for_missing_fields(self):
        response = self.client.post("/api/v1/authentication/register/", data={})
        self.assertEqual(response.status_code, 400)

    def test_login_endpoint_returns_role_details_for_authenticated_user(self):
        user = Usuario.objects.create_user(
            username="superadmin.test",
            email="superadmin@example.com",
            password="secret1234",
            first_name="Ada",
            last_name="Lovelace",
        )
        user.rol = "superadmin"
        user.save(update_fields=["rol"])

        response = self.client.post(
            "/api/v1/authentication/login/",
            data={"username": "superadmin.test", "password": "secret1234"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["user"]["rol"], "superadmin")
        self.assertEqual(response.json()["data"]["user"]["rol_label"], "Super Administrador")

    def test_login_serializes_student_tutor_telefono_as_string(self):
        """tutor_telefono es un PhoneNumberField; UserSerializer debe convertirlo a str
        antes de serializarlo a JSON (regresion: devolvia el objeto PhoneNumber y el
        login fallaba con 500 para cualquier estudiante con tutor_telefono definido)."""
        province = Provincia.objects.create(nombre="Provincia de prueba tutor")
        municipality = Municipio.objects.create(nombre="Municipio de prueba tutor", provincia=province)
        school = Escuela.objects.create(nombre="Escuela de prueba tutor", municipio=municipality)
        user = Usuario.objects.create_user(
            username="estudiante.tutor",
            email="estudiante.tutor@example.com",
            password="secret1234",
            rol="estudiante",
            provincia=province,
            municipio=municipality,
            escuela=school,
        )
        Estudiante.objects.create(
            usuario=user,
            ci="00000000001",
            nombre="Estudiante",
            apellidos="De Prueba",
            sexo="F",
            direccion="Calle de prueba",
            escuela=school,
            tutor_telefono="+5355550002",
        )

        response = self.client.post(
            "/api/v1/authentication/login/",
            data={"username": "estudiante.tutor", "password": "secret1234"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["user"]["tutor_telefono"], "+5355550002")

    def test_current_user_endpoint_keeps_auth_cookie_for_superadmin_on_safe_request(self):
        user = Usuario.objects.create_user(
            username="superadmin.cookie",
            email="superadmin.cookie@example.com",
            password="secret1234",
            rol="superadmin",
        )

        login_response = self.client.post(
            "/api/v1/authentication/login/",
            data={"username": user.username, "password": "secret1234"},
        )

        self.assertEqual(login_response.status_code, 200)

        response = self.client.get("/api/v1/authentication/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["user"]["rol"], "superadmin")

    def test_current_user_endpoint_accepts_safe_cookie_request_without_csrf_token(self):
        user = Usuario.objects.create_user(
            username="superadmin.nocsrf",
            email="superadmin.nocsrf@example.com",
            password="secret1234",
            rol="superadmin",
        )

        login_response = self.client.post(
            "/api/v1/authentication/login/",
            data={"username": user.username, "password": "secret1234"},
        )

        self.assertEqual(login_response.status_code, 200)

        response = self.client.get("/api/v1/authentication/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["user"]["rol"], "superadmin")

    def test_login_blocks_after_five_failed_attempts(self):
        user = Usuario.objects.create_user(
            username="locked.test",
            email="locked@example.com",
            password="secret1234",
        )

        for _ in range(4):
            response = self.client.post(
                "/api/v1/authentication/login/",
                data={"username": user.username, "password": "wrong-password"},
            )
            self.assertEqual(response.status_code, 401)

        response = self.client.post(
            "/api/v1/authentication/login/",
            data={"username": user.username, "password": "wrong-password"},
        )
        attempt = LoginAttempt.objects.get(identifier=user.username, ip="127.0.0.1")

        self.assertEqual(response.status_code, 401)
        self.assertIsNotNone(attempt.locked_until)
        self.assertGreater(attempt.locked_until, timezone.now())
        self.assertEqual(
            self.client.post(
                "/api/v1/authentication/login/",
                data={"username": user.username, "password": "secret1234"},
            ).status_code,
            429,
        )

    def test_user_serializer_allows_users_without_student_profile(self):
        user = Usuario.objects.create_user(
            username="director.test",
            email="director@example.com",
            password="secret1234",
            rol="director_escuela",
        )

        data = UserSerializer(user).data

        self.assertIsNone(data["tutor_nombre"])
        self.assertIsNone(data["tutor_email"])
        self.assertIsNone(data["tutor_telefono"])

    def test_schema_exposes_jwt_security_scheme(self):
        response = self.client.get("/api/v1/schema/", data={"format": "json"})

        self.assertEqual(response.status_code, 200)
        security_schemes = response.json().get("components", {}).get("securitySchemes", {})
        self.assertIn("BearerAuth", security_schemes)
        self.assertEqual(security_schemes["BearerAuth"]["type"], "http")
        self.assertEqual(security_schemes["BearerAuth"]["scheme"], "bearer")

    def test_public_plan_plaza_landing_is_accessible_without_authentication(self):
        response = self.client.get("/api/v1/gestion-provincial/plan-plazas/landing/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("items", response.json()["data"])


class ForcedPasswordChangeTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = Usuario.objects.create_user(
            username="temp.user", email="temp@example.com", password="TempPass123", rol="superadmin",
        )
        self.user.debe_cambiar_password = True
        self.user.save(update_fields=["debe_cambiar_password"])
        self.client.post("/api/v1/authentication/login/", data={"username": "temp.user", "password": "TempPass123"})

    def test_other_endpoints_are_blocked_until_password_is_changed(self):
        self.assertEqual(self.client.get("/api/v1/superadmin/dashboard/").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/authentication/me/").status_code, 200)

    def test_change_password_clears_flag(self):
        csrf = self.client.cookies.get("csrftoken")
        response = self.client.post(
            "/api/v1/authentication/change-password/",
            data={"current_password": "TempPass123", "new_password": "MuyDificil#2026x"},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf.value if csrf else "",
        )
        self.user.refresh_from_db()
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(self.user.debe_cambiar_password)
        self.assertTrue(self.user.check_password("MuyDificil#2026x"))
        self.assertEqual(self.client.get("/api/v1/superadmin/dashboard/").status_code, 200)

    def test_rejects_wrong_current_password(self):
        csrf = self.client.cookies.get("csrftoken")
        response = self.client.post(
            "/api/v1/authentication/change-password/",
            data={"current_password": "otra", "new_password": "MuyDificil#2026x"},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf.value if csrf else "",
        )
        self.assertEqual(response.status_code, 400)


class SuperAdminUserScopeTests(TestCase):
    def setUp(self):
        self.province = Provincia.objects.create(nombre="Provincia de prueba")
        self.municipality = Municipio.objects.create(
            nombre="Municipio de prueba", provincia=self.province
        )
        self.school = Escuela.objects.create(
            nombre="Escuela de prueba", municipio=self.municipality
        )

    def create_user(self, username, role, **scope):
        return Usuario.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="secret1234",
            rol=role,
            **scope,
        )

    def assert_role_is_covered(self, role, scope):
        self.create_user("existing", role, **scope)
        serializer = SuperAdminUserSerializer(data={
            "username": "duplicate",
            "email": "duplicate@example.com",
            "password": "secret1234",
            "rol": role,
            **{field: value.pk for field, value in scope.items()},
        })
        self.assertFalse(serializer.is_valid())

    def test_cannot_create_duplicate_scoped_roles(self):
        cases = [
            ("jefe_comision", {"provincia": self.province}),
            ("ingreso_provincial", {"provincia": self.province}),
            ("ingreso_municipal", {"provincia": self.province, "municipio": self.municipality}),
            ("director_escuela", {"provincia": self.province, "municipio": self.municipality, "escuela": self.school}),
            ("secretario_escuela", {"provincia": self.province, "municipio": self.municipality, "escuela": self.school}),
        ]
        for index, (role, scope) in enumerate(cases):
            with self.subTest(role=role):
                self.create_user(f"existing-{index}", role, **scope)
                serializer = SuperAdminUserSerializer(data={
                    "username": f"duplicate-{index}",
                    "email": f"duplicate-{index}@example.com",
                    "password": "secret1234",
                    "rol": role,
                    **{field: value.pk for field, value in scope.items()},
                })
                self.assertFalse(serializer.is_valid())

    def test_news_manager_requires_province_and_allows_multiple_users(self):
        missing_province = SuperAdminUserSerializer(data={
            "username": "news.manager.no.province",
            "email": "news.manager.no.province@example.com",
            "password": "secret1234",
            "rol": "gestor_noticias",
        })
        self.assertFalse(missing_province.is_valid())

        self.create_user("news-manager-existing", "gestor_noticias", provincia=self.province)
        another_manager = SuperAdminUserSerializer(data={
            "username": "news-manager-another",
            "email": "news-manager-another@example.com",
            "password": "secret1234",
            "rol": "gestor_noticias",
            "provincia": self.province.pk,
        })
        self.assertTrue(another_manager.is_valid(), another_manager.errors)

    def test_can_edit_user_without_conflicting_with_itself(self):
        user = self.create_user(
            "secretary", "secretario_escuela",
            provincia=self.province, municipio=self.municipality, escuela=self.school,
        )
        serializer = SuperAdminUserSerializer(
            user,
            data={"rol": "secretario_escuela", "escuela": self.school.pk},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_superadmin_user_serializer_rejects_student_role(self):
        serializer = SuperAdminUserSerializer(data={
            "username": "student.only",
            "email": "student.only@example.com",
            "password": "secret1234",
            "rol": "estudiante",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("rol", serializer.errors)

    def test_superadmin_user_creation_sends_welcome_email(self):
        serializer = SuperAdminUserSerializer(data={
            "username": "welcome.user",
            "email": "welcome@example.com",
            "first_name": "Welcome",
            "last_name": "User",
            "password": "secret1234",
            "rol": "superadmin",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        with self.captureOnCommitCallbacks(execute=True):
            user = serializer.save()

        self.assertEqual(user.rol, "superadmin")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["welcome@example.com"])
        self.assertIn("Usuario: welcome.user", mail.outbox[0].body)
        self.assertIn("Contraseña temporal: secret1234", mail.outbox[0].body)

    @patch("apps.authentication.serializers.send_email_async", side_effect=RuntimeError("SMTP unavailable"))
    def test_email_failure_does_not_fail_user_creation_response(self, _send_email):
        admin = Usuario.objects.create_user(
            username="superadmin.email.failure",
            email="superadmin.email.failure@example.com",
            password="secret1234",
            rol="superadmin",
        )
        client = APIClient()
        client.force_authenticate(user=admin)
        payload = {
            "username": "created.despite.email.failure",
            "email": "created.despite.email.failure@example.com",
            "first_name": "María",
            "last_name": "Pérez",
            "password": "secret1234",
            "rol": "superadmin",
        }

        with self.captureOnCommitCallbacks(execute=True):
            response = client.post(reverse("superadmin-usuarios"), payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        user = Usuario.objects.get(username=payload["username"])
        self.assertTrue(user.check_password(payload["password"]))
        self.assertTrue(user.debe_cambiar_password)
