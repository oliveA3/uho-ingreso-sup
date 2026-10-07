from django.test import TestCase
from django.core import mail
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta

from unittest.mock import patch
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import EmailVerificationCode, LoginAttempt, Usuario
from apps.authentication.serializers import SuperAdminUserSerializer, UserSerializer
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
