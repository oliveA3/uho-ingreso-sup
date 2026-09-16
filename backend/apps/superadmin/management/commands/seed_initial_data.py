import os

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.authentication.models import Estudiante, Usuario
from apps.superadmin.models import Asignatura, Ces, Escuela, Municipio, Provincia


CUBA_TERRITORIES = {
    "Pinar del Rio": [
        "Consolacion del Sur", "Guane", "La Palma", "Los Palacios", "Mantua",
        "Minas de Matahambre", "Pinar del Rio", "San Cristobal", "San Luis",
        "Sandino", "Vinales",
    ],
    "Artemisa": [
        "Alquizar", "Artemisa", "Bahia Honda", "Bauta", "Caimito", "Candelaria",
        "Guanajay", "Guira de Melena", "Mariel", "San Antonio de los Banos",
        "San Cristobal",
    ],
    "La Habana": [
        "Arroyo Naranjo", "Boyeros", "Centro Habana", "Cerro", "Cotorro",
        "Diez de Octubre", "Guanabacoa", "Habana del Este", "Habana Vieja",
        "La Lisa", "Marianao", "Playa", "Plaza de la Revolucion", "Regla",
        "San Miguel del Padron",
    ],
    "Mayabeque": [
        "Batabano", "Bejucal", "Güines", "Jaruco", "Madruga", "Melena del Sur",
        "Nueva Paz", "Quivican", "San Jose de las Lajas", "San Nicolas",
        "Santa Cruz del Norte",
    ],
    "Matanzas": [
        "Agramonte", "Calimete", "Cardenas", "Cienaga de Zapata", "Colon",
        "Jaguey Grande", "Jovellanos", "Limonar", "Los Arabos", "Marti",
        "Matanzas", "Pedro Betancourt", "Perico", "Union de Reyes",
    ],
    "Cienfuegos": [
        "Abreus", "Aguada de Pasajeros", "Cienfuegos", "Cruces", "Cumanayagua",
        "Lajas", "Palmira", "Rodas",
    ],
    "Villa Clara": [
        "Caibarien", "Camajuani", "Cifuentes", "Corralillo", "Encrucijada",
        "Manicaragua", "Placetas", "Quemado de Guines", "Ranchuelo", "Remedios",
        "Sagua la Grande", "Santa Clara", "Santo Domingo",
    ],
    "Sancti Spiritus": [
        "Cabaiguan", "Fomento", "Jatibonico", "La Sierpe", "Sancti Spiritus",
        "Taguasco", "Trinidad", "Yaguajay",
    ],
    "Ciego de Avila": [
        "Baragua", "Bolivia", "Chambas", "Ciego de Avila", "Ciro Redondo",
        "Florencia", "Majagua", "Moron", "Primero de Enero", "Venezuela",
    ],
    "Camaguey": [
        "Camaguey", "Carlos Manuel de Cespedes", "Esmeralda", "Florida", "Guáimaro",
        "Jimaguayu", "Minas", "Najasa", "Nuevitas", "Santa Cruz del Sur",
        "Sibanicu", "Sierra de Cubitas", "Vertientes",
    ],
    "Las Tunas": [
        "Amancio", "Colombia", "Jesus Menendez", "Jobabo", "Las Tunas",
        "Majibacoa", "Manati", "Puerto Padre",
    ],
    "Holguin": [
        "Antilla", "Baguanos", "Banes", "Cacocum", "Calixto Garcia", "Cueto",
        "Frank Pais", "Gibara", "Holguin", "Mayari", "Moa", "Rafael Freyre",
        "Sagua de Tanamo", "Urbano Noris",
    ],
    "Granma": [
        "Bartolome Maso", "Bayamo", "Buey Arriba", "Campechuela", "Cauto Cristo",
        "Guisa", "Jiguani", "Manzanillo", "Media Luna", "Niquero", "Pilon",
        "Rio Cauto", "Yara",
    ],
    "Santiago de Cuba": [
        "Contramaestre", "Guama", "Mella", "Palma Soriano", "San Luis",
        "Santiago de Cuba", "Segundo Frente", "Songo-La Maya", "Tercer Frente",
    ],
    "Guantanamo": [
        "Baracoa", "Caimanera", "El Salvador", "Guantanamo", "Imias", "Maisi",
        "Manuel Tames", "Niceto Perez", "San Antonio del Sur", "Yateras",
    ],
    # Cuba has 15 provinces and the special municipality Isla de la Juventud.
    "Isla de la Juventud": ["Isla de la Juventud"],
}

ROLE_USERS = (
    ("superadmin", "seed_superadmin", "seed_superadmin@example.invalid"),
    ("jefe_comision", "seed_jefe_comision", "seed_jefe_comision@example.invalid"),
    ("ingreso_provincial", "seed_ingreso_provincial", "seed_ingreso_provincial@example.invalid"),
    ("ingreso_municipal", "seed_ingreso_municipal", "seed_ingreso_municipal@example.invalid"),
    ("director_escuela", "seed_director_escuela", "seed_director_escuela@example.invalid"),
    ("secretario_escuela", "seed_secretario_escuela", "seed_secretario_escuela@example.invalid"),
    ("estudiante", "seed_estudiante", "seed_estudiante@example.invalid"),
)

INITIAL_CES = (
    "Universidad de Holguin",
    "Universidad de Ciencias Medicas de Holguin",
    "Instituto Superior Minero Metalurgico de Moa",
)

INITIAL_SUBJECTS = ("Matematica", "Español", "Historia")


class Command(BaseCommand):
    help = "Crea el catalogo territorial cubano y usuarios demo de todos los roles."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            dest="password",
            help="Contraseña para las cuentas seed. Por defecto usa INGRESOSUP_SEED_PASSWORD.",
        )
        parser.add_argument(
            "--reset-password",
            action="store_true",
            help="Actualiza la contraseña de las cuentas seed existentes.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password = options.get("password") or os.environ.get(
            "INGRESOSUP_SEED_PASSWORD", "IngresoSUP-demo-2026!"
        )
        reset_password = options["reset_password"]

        provinces_created = municipalities_created = schools_created = 0
        ces_created = subjects_created = 0
        for ces_name in INITIAL_CES:
            _, created = Ces.objects.get_or_create(nombre=ces_name, defaults={"activa": True})
            ces_created += int(created)
        for subject_name in INITIAL_SUBJECTS:
            _, created = Asignatura.objects.get_or_create(nombre=subject_name, defaults={"activa": True})
            subjects_created += int(created)

        territories = {}
        for province_name, municipality_names in CUBA_TERRITORIES.items():
            province, province_created = Provincia.objects.get_or_create(
                nombre=province_name,
                defaults={"activa": True},
            )
            provinces_created += int(province_created)
            territories[province_name] = {
                "province": province,
                "municipalities": {},
            }
            for municipality_name in municipality_names:
                municipality, municipality_created = Municipio.objects.get_or_create(
                    provincia=province,
                    nombre=municipality_name,
                    defaults={"activo": True},
                )
                municipalities_created += int(municipality_created)
                school, school_created = Escuela.objects.get_or_create(
                    municipio=municipality,
                    nombre=f"Preuniversitario {municipality_name}",
                    defaults={
                        "codigo": f"SEED-{province.id}-{municipality.id}",
                        "descripcion": "Escuela inicial creada por la semilla territorial.",
                        "activa": True,
                    },
                )
                schools_created += int(school_created)
                territories[province_name]["municipalities"][municipality_name] = {
                    "municipality": municipality,
                    "school": school,
                }

        # Completa municipios previos que puedan existir sin escuela.
        for municipality in Municipio.objects.all().iterator():
            if municipality.escuelas.exists():
                continue
            _, school_created = Escuela.objects.get_or_create(
                municipio=municipality,
                nombre=f"Preuniversitario {municipality.nombre}",
                defaults={
                    "codigo": f"SEED-{municipality.provincia_id}-{municipality.id}",
                    "descripcion": "Escuela inicial creada por la semilla territorial.",
                    "activa": True,
                },
            )
            schools_created += int(school_created)

        first_province = territories["Pinar del Rio"]["province"]
        first_municipality = territories["Pinar del Rio"]["municipalities"]["Pinar del Rio"]["municipality"]
        first_school = territories["Pinar del Rio"]["municipalities"]["Pinar del Rio"]["school"]
        scopes = {
            "superadmin": {},
            "jefe_comision": {"provincia": first_province},
            "ingreso_provincial": {"provincia": first_province},
            "ingreso_municipal": {"municipio": first_municipality, "provincia": first_province},
            "director_escuela": {"escuela": first_school, "municipio": first_municipality, "provincia": first_province},
            "secretario_escuela": {"escuela": first_school, "municipio": first_municipality, "provincia": first_province},
            "estudiante": {"escuela": first_school, "municipio": first_municipality, "provincia": first_province},
        }

        users_created = 0
        for role, username, email in ROLE_USERS:
            user, created = self._get_role_user(role, username, email, scopes[role])
            if created:
                users_created += 1
            user.email = email
            user.rol = role
            user.is_active = True
            user.email_verificado = True
            user.is_staff = role == "superadmin"
            user.is_superuser = role == "superadmin"
            if reset_password or created:
                user.set_password(password)
            user.save()
            if role == "estudiante":
                Estudiante.objects.get_or_create(
                    usuario=user,
                    defaults={
                        "ci": "99010100001",
                        "nombre": "Estudiante",
                        "apellidos": "Demo",
                        "sexo": "M",
                        "direccion": "Direccion de prueba",
                        "escuela": first_school,
                    },
                )

        self.stdout.write(self.style.SUCCESS("Semilla inicial completada."))
        self.stdout.write(f"Provincias creadas: {provinces_created} de {len(CUBA_TERRITORIES)} territorios cargados.")
        self.stdout.write(f"Municipios creados: {municipalities_created}.")
        self.stdout.write(f"Escuelas creadas: {schools_created}.")
        self.stdout.write(f"CES creados: {ces_created} de {len(INITIAL_CES)}.")
        self.stdout.write(f"Asignaturas creadas: {subjects_created} de {len(INITIAL_SUBJECTS)}.")
        self.stdout.write(f"Usuarios seed creados: {users_created}; roles cubiertos: {len(ROLE_USERS)}.")
        self.stdout.write("Cuentas seed: seed_superadmin, seed_jefe_comision, seed_ingreso_provincial, seed_ingreso_municipal, seed_director_escuela, seed_secretario_escuela y seed_estudiante.")
        self.stdout.write("Cambia INGRESOSUP_SEED_PASSWORD antes de usar la semilla fuera de desarrollo.")

    @staticmethod
    def _get_role_user(role, username, email, scope):
        filters = {"rol": role}
        filters.update({f"{field}_id": value.id for field, value in scope.items()})
        if scope:
            user = Usuario.objects.filter(**filters).first()
            if user:
                return user, False
        return Usuario.objects.get_or_create(username=username, defaults={"email": email, "rol": role})
