from datetime import date

from django.core.validators import validate_email
from django.test import SimpleTestCase
from rest_framework.test import APITestCase

from apps.authentication.models import Estudiante, ROLES, Usuario
from apps.gestion_escuela.models import Escalafon, EscalafonItem
from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, Proceso
from apps.superadmin.management.commands.seed_initial_data import (
    CUBA_TERRITORIES,
    ROLE_UNIQUE_SCOPES,
    ROLE_USERS,
    get_or_create_named_catalog,
    get_or_create_territory,
)
from apps.superadmin.management.commands.seed_plan_de_plazas import DEMO_CAREERS
from .models import (
    Asignatura,
    Ces,
    Escuela,
    IdentidadVisual,
    Municipio,
    Provincia,
    normalize_territorial_name,
)
from .serializers import EscuelaSerializer, MunicipioSerializer, ProvinciaSerializer


class TerritorialNameUniquenessTests(APITestCase):
    def setUp(self):
        self.province = Provincia.objects.create(nombre="Provincia Única")
        self.other_province = Provincia.objects.create(nombre="Otra Provincia")
        self.municipality = Municipio.objects.create(
            nombre="Plaza de la Revolución",
            provincia=self.province,
        )
        self.other_municipality = Municipio.objects.create(
            nombre="Otro Municipio",
            provincia=self.other_province,
        )
        self.school = Escuela.objects.create(
            nombre="Preuniversitario Centro",
            municipio=self.municipality,
        )

    def test_provinces_are_unique_without_accent_or_case_differences(self):
        serializer = ProvinciaSerializer(data={"nombre": "PROVINCIA unica"})

        self.assertFalse(serializer.is_valid())
        self.assertIn("nombre", serializer.errors)

    def test_municipality_name_is_unique_only_within_its_province(self):
        duplicate = MunicipioSerializer(data={
            "nombre": "Plaza de la Revolucion",
            "provincia": self.province.pk,
        })
        same_name_elsewhere = MunicipioSerializer(data={
            "nombre": "Plaza de la Revolucion",
            "provincia": self.other_province.pk,
        })

        self.assertFalse(duplicate.is_valid())
        self.assertIn("nombre", duplicate.errors)
        self.assertTrue(same_name_elsewhere.is_valid(), same_name_elsewhere.errors)

    def test_school_name_is_unique_only_within_its_municipality(self):
        duplicate = EscuelaSerializer(data={
            "nombre": "Preuniversitario  CENTRO",
            "municipio": self.municipality.pk,
        })
        same_name_elsewhere = EscuelaSerializer(data={
            "nombre": "Preuniversitario Centro",
            "municipio": self.other_municipality.pk,
        })

        self.assertFalse(duplicate.is_valid())
        self.assertIn("nombre", duplicate.errors)
        self.assertTrue(same_name_elsewhere.is_valid(), same_name_elsewhere.errors)

    def test_seed_reuses_and_canonicalizes_equivalent_territorial_names(self):
        province = Provincia.objects.create(nombre="Holguin")
        municipality = Municipio.objects.create(
            nombre="Plaza de la Revolucion",
            provincia=province,
        )
        school = Escuela.objects.create(
            nombre="Preuniversitario Gibara",
            municipio=municipality,
        )

        canonical_province, province_created = get_or_create_territory(
            Provincia, "Holguín", defaults={"activa": True}
        )
        canonical_municipality, municipality_created = get_or_create_territory(
            Municipio,
            "Plaza de la Revolución",
            provincia=province,
            defaults={"activo": True},
        )
        canonical_school, school_created = get_or_create_territory(
            Escuela,
            "Preuniversitario Gibara",
            municipio=municipality,
            defaults={"activa": True},
        )

        self.assertFalse(province_created)
        self.assertFalse(municipality_created)
        self.assertFalse(school_created)
        self.assertEqual(canonical_province.pk, province.pk)
        self.assertEqual(canonical_province.nombre, "Holguín")
        self.assertEqual(canonical_municipality.pk, municipality.pk)
        self.assertEqual(canonical_municipality.nombre, "Plaza de la Revolución")
        self.assertEqual(canonical_school.pk, school.pk)
        self.assertEqual(Escuela.objects.filter(municipio=municipality).count(), 1)

    def test_seed_reuses_equivalent_ces_and_subject_catalog_names(self):
        ces = Ces.objects.create(nombre="Universidad de Holguin")
        subject = Asignatura.objects.create(nombre="Matematica")

        canonical_ces, ces_created = get_or_create_named_catalog(
            Ces, "Universidad de Holguín", defaults={"activa": True}
        )
        canonical_subject, subject_created = get_or_create_named_catalog(
            Asignatura, "Matemática", defaults={"activa": True}
        )

        self.assertFalse(ces_created)
        self.assertFalse(subject_created)
        self.assertEqual(canonical_ces.pk, ces.pk)
        self.assertEqual(canonical_ces.nombre, "Universidad de Holguín")
        self.assertEqual(canonical_subject.pk, subject.pk)
        self.assertEqual(canonical_subject.nombre, "Matemática")


class SeedConfigurationTests(SimpleTestCase):
    def test_initial_territory_names_are_canonical_and_unique(self):
        provinces = [normalize_territorial_name(name) for name in CUBA_TERRITORIES]
        self.assertEqual(len(provinces), 16)
        self.assertEqual(len(provinces), len(set(provinces)))
        for municipality_names in CUBA_TERRITORIES.values():
            normalized = [normalize_territorial_name(name) for name in municipality_names]
            self.assertEqual(len(normalized), len(set(normalized)))

    def test_seed_users_have_valid_profiles_and_known_roles(self):
        usernames = set()
        known_roles = {role for role, _ in ROLES}
        for role, username, email, first_name, last_name in ROLE_USERS:
            self.assertIn(role, known_roles)
            self.assertNotIn(username, usernames)
            self.assertTrue(first_name.strip())
            self.assertTrue(last_name.strip())
            validate_email(email)
            usernames.add(username)

        self.assertTrue({"jefe_comision", "ingreso_provincial"} <= ROLE_UNIQUE_SCOPES.keys())
        self.assertIn("gestor_noticias", known_roles)

    def test_plan_seed_uses_named_careers_instead_of_placeholders(self):
        normalized = [normalize_territorial_name(name) for name in DEMO_CAREERS]
        self.assertGreaterEqual(len(DEMO_CAREERS), 20)
        self.assertEqual(len(normalized), len(set(normalized)))
        self.assertFalse(any("prueba" in name for name in normalized))


class IdentidadVisualConfigTests(APITestCase):
    def test_public_read_returns_saved_logo(self):
        IdentidadVisual.objects.create(logo_url="data:image/png;base64,logo-real")

        response = self.client.get("/api/v1/superadmin/config/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["config"]["logo_url"], "data:image/png;base64,logo-real")

    def test_update_requires_superadmin(self):
        response = self.client.put(
            "/api/v1/superadmin/config/",
            {"logo_url": "https://example.com/logo.png"},
            format="json",
        )

        self.assertEqual(response.status_code, 401)


class SuperAdminStudentListTests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            username="superadmin.students",
            email="superadmin.students@example.com",
            password="secret1234",
            rol="superadmin",
        )
        self.province = Provincia.objects.create(nombre="Provincia estudiantil")
        self.other_province = Provincia.objects.create(nombre="Otra provincia")
        municipality = Municipio.objects.create(nombre="Municipio estudiantil", provincia=self.province)
        other_municipality = Municipio.objects.create(nombre="Otro municipio", provincia=self.other_province)
        self.school = Escuela.objects.create(nombre="Escuela estudiantil", municipio=municipality)
        self.other_school = Escuela.objects.create(nombre="Otra escuela", municipio=other_municipality)
        self.stage = Etapa.objects.get(nombre=ETAPAS_NOMBRES[1])
        self.process = Proceso.objects.create(anio=date(2026, 1, 1), etapa=self.stage)
        self.student = Estudiante.objects.create(
            ci="26000000001",
            nombre="Ana",
            apellidos="Estudiante",
            sexo="F",
            direccion="Calle 1",
            escuela=self.school,
        )
        self.other_student = Estudiante.objects.create(
            ci="26000000002",
            nombre="Luis",
            apellidos="Otro",
            sexo="M",
            direccion="Calle 2",
            escuela=self.other_school,
        )
        escalafon = Escalafon.objects.create(proceso=self.process, escuela=self.school)
        EscalafonItem.objects.create(
            escalafon=escalafon,
            estudiante=self.student,
            indice_10=80,
            indice_11=85,
            indice_12=90,
            indice_general=85,
        )
        self.student_user = Usuario.objects.create_user(
            username="ana.student",
            email="ana@example.com",
            password="secret1234",
            rol="estudiante",
            provincia=self.province,
            municipio=municipality,
            escuela=self.school,
            is_active=True,
        )
        self.student.usuario = self.student_user
        self.student.save(update_fields=["usuario"])
        self.client.force_authenticate(self.admin)

    def test_lists_students_with_account_status_and_filters(self):
        response = self.client.get("/api/v1/superadmin/estudiantes/", {
            "anio": "2026",
            "provincia": self.province.id,
            "ci": "26000000001",
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["ci"], "26000000001")
        self.assertTrue(response.data[0]["has_account"])
        self.assertTrue(response.data[0]["is_active"])
        self.assertEqual(response.data[0]["anios"], [2026])

    def test_student_listing_requires_superadmin(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/v1/superadmin/estudiantes/")

        self.assertEqual(response.status_code, 401)


class SuperAdminCatalogContractTests(APITestCase):
    def test_province_catalog_exposes_required_metadata_fields(self):
        self.client.force_authenticate(Usuario.objects.create_user(
            username="catalog-admin",
            email="catalog-admin@example.com",
            password="secret1234",
            rol="superadmin",
        ))

        Provincia.objects.create(nombre="La Habana", descripcion="Provincia principal", activa=True)

        response = self.client.get("/api/v1/superadmin/provincias/")

        self.assertEqual(response.status_code, 200)
        first_result = response.data["results"][0]
        self.assertIn("descripcion", first_result)
        self.assertIn("fecha_ultima_modificacion", first_result)
        self.assertEqual(first_result["descripcion"], "Provincia principal")
        self.assertIn("id", first_result)
        self.assertIn("nombre", first_result)
        self.assertIn("activa", first_result)

    def test_catalog_excel_export_is_available(self):
        self.client.force_authenticate(Usuario.objects.create_user(
            username="catalog-export-admin",
            email="catalog-export-admin@example.com",
            password="secret1234",
            rol="superadmin",
        ))

        Provincia.objects.create(nombre="Santiago de Cuba", descripcion="Provincia oriental", activa=True)

        response = self.client.get("/api/v1/import-export/export/provincias/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", response["Content-Type"])
        self.assertIn("provincias.xlsx", response["Content-Disposition"])
