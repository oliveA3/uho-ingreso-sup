from django.db import migrations


CAREERS = [
    ("ARQ01", "Arquitectura"), ("BIO01", "Biología"),
    ("COM01", "Contabilidad y Finanzas"), ("DER01", "Derecho"),
    ("ECO01", "Economía"), ("ENF01", "Enfermería"),
    ("FAR01", "Ciencias Farmacéuticas"), ("GEO01", "Geología"),
    ("MAT01", "Matemática"), ("PSI01", "Psicología"),
]


def add_careers(apps, schema_editor):
    Carrera = apps.get_model("superadmin", "Carrera")
    Ces = apps.get_model("superadmin", "Ces")
    Provincia = apps.get_model("superadmin", "Provincia")
    ces = Ces.objects.filter(activa=True).order_by("id").first()
    province = Provincia.objects.filter(activa=True).order_by("id").first()
    if not ces or not province:
        return
    for code, name in CAREERS:
        Carrera.objects.get_or_create(
            codigo=code,
            defaults={"nombre": name, "ces_id": ces.id, "provincia_id": province.id, "activa": True},
        )


class Migration(migrations.Migration):
    dependencies = [("superadmin", "0003_alter_identidadvisual_logo_url")]
    operations = [migrations.RunPython(add_careers, migrations.RunPython.noop)]