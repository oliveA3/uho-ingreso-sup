from django.test import TestCase


class AutheticationSmokeTests(TestCase):
    def test_login_endpoint_returns_400_for_missing_credentials(self):
        response = self.client.post("/api/authentication/login/", data={})
        self.assertEqual(response.status_code, 400)

    def test_register_endpoint_returns_400_for_missing_fields(self):
        response = self.client.post("/api/authentication/register/", data={})
        self.assertEqual(response.status_code, 400)
