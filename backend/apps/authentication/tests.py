from django.test import TestCase

from apps.authentication.models import Usuario


class AutheticationSmokeTests(TestCase):
    def test_login_endpoint_returns_400_for_missing_credentials(self):
        response = self.client.post("/api/authentication/login/", data={})
        self.assertEqual(response.status_code, 400)

    def test_register_endpoint_returns_400_for_missing_fields(self):
        response = self.client.post("/api/authentication/register/", data={})
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
            "/api/authentication/login/",
            data={"username": "superadmin.test", "password": "secret1234"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["rol"], "superadmin")
        self.assertEqual(response.json()["user"]["rol_label"], "Super Administrador")
