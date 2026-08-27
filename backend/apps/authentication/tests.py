from django.test import TestCase

from apps.authentication.models import Usuario
from apps.authentication.serializers import SuperAdminUserSerializer
from apps.superadmin.models import Escuela, Municipio, Provincia


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
