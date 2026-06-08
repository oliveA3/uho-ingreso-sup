import json

from django.test import Client, TestCase
from django.urls import reverse

from .models import Role, User


class CoreAuthTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.role = Role.objects.create(name="Estudiante", level=10)
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123",
            ci="12345678901",
            nombre="Test",
            apellidos="Usuario",
            rol=self.role,
        )

    def test_healthcheck(self):
        response = self.client.get(reverse("healthcheck"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("service", response.json())

    def test_login_logout(self):
        response = self.client.post(
            reverse("login"),
            data=json.dumps({"username": "testuser", "password": "testpass123"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("user", data)

        response = self.client.post(reverse("logout"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("detail"), "Sesión cerrada.")
