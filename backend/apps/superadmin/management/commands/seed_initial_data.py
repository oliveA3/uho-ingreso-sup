import os
import unicodedata

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.authentication.models import Estudiante, Usuario
from apps.superadmin.models import (
    Asignatura,
    Ces,
    Escuela,
    Municipio,
    Provincia,
    normalize_territorial_name,
)


CUBA_TERRITORIES = {
    "Pinar del Río": [
        "Consolación del Sur", "Guane", "La Palma", "Los Palacios", "Mantua",
        "Minas de Matahambre", "Pinar del Río", "San Cristóbal", "San Luis",
        "Sandino", "Viñales",
    ],
    "Artemisa": [
        "Alquízar", "Artemisa", "Bahía Honda", "Bauta", "Caimito", "Candelaria",
        "Guanajay", "Güira de Melena", "Mariel", "San Antonio de los Baños",
        "San Cristóbal",
    ],
    "La Habana": [
        "Arroyo Naranjo", "Boyeros", "Centro Habana", "Cerro", "Cotorro",
        "Diez de Octubre", "Guanabacoa", "Habana del Este", "Habana Vieja",
        "La Lisa", "Marianao", "Playa", "Plaza de la Revolución", "Regla",
        "San Miguel del Padrón",
    ],
    "Mayabeque": [
        "Batabanó", "Bejucal", "Güines", "Jaruco", "Madruga", "Melena del Sur",
        "Nueva Paz", "Quivicán", "San José de las Lajas", "San Nicolás",
        "Santa Cruz del Norte",
    ],
    "Matanzas": [
        "Agramonte", "Calimete", "Cárdenas", "Ciénaga de Zapata", "Colón",
        "Jagüey Grande", "Jovellanos", "Limonar", "Los Arabos", "Martí",
        "Matanzas", "Pedro Betancourt", "Perico", "Unión de Reyes",
    ],
    "Cienfuegos": [
        "Abreus", "Aguada de Pasajeros", "Cienfuegos", "Cruces", "Cumanayagua",
        "Lajas", "Palmira", "Rodas",
    ],
    "Villa Clara": [
        "Caibarién", "Camajuaní", "Cifuentes", "Corralillo", "Encrucijada",
        "Manicaragua", "Placetas", "Quemado de Güines", "Ranchuelo", "Remedios",
        "Sagua la Grande", "Santa Clara", "Santo Domingo",
    ],
    "Sancti Spíritus": [
        "Cabaiguán", "Fomento", "Jatibonico", "La Sierpe", "Sancti Spíritus",
        "Taguasco", "Trinidad", "Yaguajay",
    ],
    "Ciego de Ávila": [
        "Baraguá", "Bolivia", "Chambas", "Ciego de Ávila", "Ciro Redondo",
        "Florencia", "Majagua", "Morón", "Primero de Enero", "Venezuela",
    ],
    "Camagüey": [
        "Camagüey", "Carlos Manuel de Céspedes", "Esmeralda", "Florida", "Guáimaro",
        "Jimaguayú", "Minas", "Najasa", "Nuevitas", "Santa Cruz del Sur",
        "Sibanicú", "Sierra de Cubitas", "Vertientes",
    ],
    "Las Tunas": [
        "Amancio", "Colombia", "Jesús Menéndez", "Jobabo", "Las Tunas",
        "Majibacoa", "Manatí", "Puerto Padre",
    ],
    "Holguín": [
        "Antilla", "Báguanos", "Banes", "Cacocum", "Calixto García", "Cueto",
        "Frank País", "Gibara", "Holguín", "Mayarí", "Moa", "Rafael Freyre",
        "Sagua de Tánamo", "Urbano Noris",
    ],
    "Granma": [
        "Bartolomé Masó", "Bayamo", "Buey Arriba", "Campechuela", "Cauto Cristo",
        "Guisa", "Jiguaní", "Manzanillo", "Media Luna", "Niquero", "Pilón",
        "Río Cauto", "Yara",
    ],
    "Santiago de Cuba": [
        "Contramaestre", "Guamá", "Mella", "Palma Soriano", "San Luis",
        "Santiago de Cuba", "Segundo Frente", "Songo-La Maya", "Tercer Frente",
    ],
    "Guantánamo": [
        "Baracoa", "Caimanera", "El Salvador", "Guantánamo", "Imías", "Maisí",
        "Manuel Tames", "Niceto Pérez", "San Antonio del Sur", "Yateras",
    ],
    # Cuba has 15 provinces and the special municipality Isla de la Juventud.
    "Isla de la Juventud": ["Isla de la Juventud"],
}

ROLE_USERS = (
    ("superadmin", "seed_superadmin", "elena.garcia@example.com", "Elena", "García"),
    ("jefe_comision", "seed_jefe_comision", "raul.hernandez@example.com", "Raúl", "Hernández"),
    ("ingreso_provincial", "seed_ingreso_provincial", "marta.perez@example.com", "Marta", "Pérez"),
    ("gestor_noticias", "seed_gestor_noticias", "laura.rodriguez@example.com", "Laura", "Rodríguez"),
    ("ingreso_municipal", "seed_ingreso_municipal", "carlos.gonzalez@example.com", "Carlos", "González"),
    ("director_escuela", "seed_director_escuela", "ana.morales@example.com", "Ana", "Morales"),
    ("secretario_escuela", "seed_secretario_escuela", "luis.martinez@example.com", "Luis", "Martínez"),
    ("estudiante", "seed_estudiante", "daniel.fernandez@example.com", "Daniel", "Fernández"),
)

ROLE_UNIQUE_SCOPES = {
    "jefe_comision": "provincia",
    "ingreso_provincial": "provincia",
    "ingreso_municipal": "municipio",
    "director_escuela": "escuela",
    "secretario_escuela": "escuela",
}

INITIAL_CES = (
    "Universidad de Holguín",
    "Universidad de Ciencias Médicas de Holguín",
    "Instituto Superior Minero Metalúrgico de Moa",
)

INITIAL_SUBJECTS = ("Matemática", "Español", "Historia de Cuba")


def get_or_create_named_catalog(model, name, defaults=None):
    normalized_name = normalize_territorial_name(name)
    matches = [
        item for item in model.objects.all().order_by("pk")
        if normalize_territorial_name(item.nombre) == normalized_name
    ]
    if matches:
        canonical = max(
            matches,
            key=lambda item: (
                sum(
                    unicodedata.category(character) == "Mn"
                    for character in unicodedata.normalize("NFD", item.nombre)
                ),
                -item.pk,
            ),
        )
        if canonical.nombre != name:
            canonical.nombre = name
            canonical.save(update_fields=["nombre"])
        return canonical, False
    return model.objects.get_or_create(nombre=name, defaults=defaults or {})


def get_or_create_territory(model, name, defaults=None, **scope):
    normalized_name = normalize_territorial_name(name)
    existing = model.objects.filter(
        nombre_normalizado=normalized_name,
        **scope,
    ).order_by("pk").first()
    if existing:
        if existing.nombre != name:
            existing.nombre = name
            existing.save(update_fields=["nombre"])
        return existing, False
    return model.objects.get_or_create(
        nombre=name,
        defaults=defaults or {},
        **scope,
    )


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
            _, created = get_or_create_named_catalog(
                Ces, ces_name, defaults={"activa": True}
            )
            ces_created += int(created)
        for subject_name in INITIAL_SUBJECTS:
            _, created = get_or_create_named_catalog(
                Asignatura, subject_name, defaults={"activa": True}
            )
            subjects_created += int(created)

        territories = {}
        for province_name, municipality_names in CUBA_TERRITORIES.items():
            province, province_created = get_or_create_territory(
                Provincia,
                province_name,
                defaults={"activa": True},
            )
            provinces_created += int(province_created)
            territories[province_name] = {
                "province": province,
                "municipalities": {},
            }
            for municipality_name in municipality_names:
                municipality, municipality_created = get_or_create_territory(
                    Municipio,
                    municipality_name,
                    provincia=province,
                    defaults={"activo": True},
                )
                municipalities_created += int(municipality_created)
                school, school_created = get_or_create_territory(
                    Escuela,
                    f"Preuniversitario {municipality.nombre}",
                    municipio=municipality,
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
            _, school_created = get_or_create_territory(
                Escuela,
                f"Preuniversitario {municipality.nombre}",
                municipio=municipality,
                defaults={
                    "codigo": f"SEED-{municipality.provincia_id}-{municipality.id}",
                    "descripcion": "Escuela inicial creada por la semilla territorial.",
                    "activa": True,
                },
            )
            schools_created += int(school_created)

        first_province = territories["Pinar del Río"]["province"]
        first_municipality = territories["Pinar del Río"]["municipalities"]["Pinar del Río"]["municipality"]
        first_school = territories["Pinar del Río"]["municipalities"]["Pinar del Río"]["school"]
        scopes = {
            "superadmin": {},
            "jefe_comision": {"provincia": first_province},
            "ingreso_provincial": {"provincia": first_province},
            "gestor_noticias": {"provincia": first_province},
            "ingreso_municipal": {"municipio": first_municipality, "provincia": first_province},
            "director_escuela": {"escuela": first_school, "municipio": first_municipality, "provincia": first_province},
            "secretario_escuela": {"escuela": first_school, "municipio": first_municipality, "provincia": first_province},
            "estudiante": {"escuela": first_school, "municipio": first_municipality, "provincia": first_province},
        }

        users_created = 0
        skipped_roles = []
        for role, username, email, first_name, last_name in ROLE_USERS:
            user, created, is_seed_user = self._get_role_user(
                role, username, email, scopes[role]
            )
            if not is_seed_user:
                skipped_roles.append(role)
                self.stdout.write(
                    self.style.WARNING(
                        f"No se modificó un usuario existente que ya cubre el rol {role}."
                    )
                )
                continue

            unique_scope = ROLE_UNIQUE_SCOPES.get(role)
            if unique_scope and scopes[role].get(unique_scope):
                scope_value = scopes[role][unique_scope]
                has_conflict = Usuario.objects.filter(
                    rol=role,
                    **{f"{unique_scope}_id": scope_value.pk},
                ).exclude(pk=user.pk).exists()
                if has_conflict:
                    skipped_roles.append(role)
                    self.stdout.write(
                        self.style.WARNING(
                            f"No se creó la cuenta seed de {role}: ya existe una cuenta para ese alcance."
                        )
                    )
                    continue

            if created:
                users_created += 1
            for scope_field in ("provincia", "municipio", "escuela"):
                setattr(user, scope_field, scopes[role].get(scope_field))
            user.email = email
            user.rol = role
            user.first_name = first_name
            user.last_name = last_name
            user.is_active = True
            user.email_verificado = True
            user.is_staff = role == "superadmin"
            user.is_superuser = role == "superadmin"
            if reset_password or created:
                user.set_password(password)
            user.save()
            if role == "estudiante":
                student, _ = Estudiante.objects.get_or_create(
                    usuario=user,
                    defaults={
                        "ci": "08051212345",
                        "nombre": first_name,
                        "apellidos": last_name,
                        "sexo": "M",
                        "direccion": "Calle Martí No. 12, Pinar del Río",
                        "escuela": first_school,
                    },
                )
                demo_ci = "08051212345"
                if Estudiante.objects.filter(ci=demo_ci).exclude(pk=student.pk).exists():
                    raise CommandError(
                        f"El CI demo {demo_ci} ya pertenece a otro estudiante; no se modificaron los datos seed."
                    )
                student.ci = demo_ci
                student.nombre = first_name
                student.apellidos = last_name
                student.sexo = "M"
                student.escuela = first_school
                student.direccion = "Calle Martí No. 12, Pinar del Río"
                student.save(update_fields=["ci", "nombre", "apellidos", "sexo", "escuela", "direccion"])

        self.stdout.write(self.style.SUCCESS("Semilla inicial completada."))
        self.stdout.write(f"Provincias creadas: {provinces_created} de {len(CUBA_TERRITORIES)} territorios cargados.")
        self.stdout.write(f"Municipios creados: {municipalities_created}.")
        self.stdout.write(f"Escuelas creadas: {schools_created}.")
        self.stdout.write(f"CES creados: {ces_created} de {len(INITIAL_CES)}.")
        self.stdout.write(f"Asignaturas creadas: {subjects_created} de {len(INITIAL_SUBJECTS)}.")
        self.stdout.write(f"Usuarios seed creados: {users_created}; roles configurados: {len(ROLE_USERS) - len(skipped_roles)}.")
        self.stdout.write("Cuentas seed: seed_superadmin, seed_jefe_comision, seed_ingreso_provincial, seed_gestor_noticias, seed_ingreso_municipal, seed_director_escuela, seed_secretario_escuela y seed_estudiante.")
        self.stdout.write("Cambia INGRESOSUP_SEED_PASSWORD antes de usar la semilla fuera de desarrollo.")

    @staticmethod
    def _get_role_user(role, username, email, scope):
        seed_user = Usuario.objects.filter(username=username).first()
        if seed_user:
            return seed_user, False, True

        unique_scope = ROLE_UNIQUE_SCOPES.get(role)
        if unique_scope:
            scope_value = scope.get(unique_scope)
            if scope_value:
                existing = Usuario.objects.filter(
                    rol=role,
                    **{f"{unique_scope}_id": scope_value.id},
                ).first()
                if existing:
                    return existing, False, False
        user, created = Usuario.objects.get_or_create(
            username=username,
            defaults={"email": email, "rol": role},
        )
        return user, created, True
