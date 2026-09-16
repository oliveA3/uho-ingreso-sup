from django.db import migrations


def seed_tipos(apps, schema_editor):
    TipoOtorgamiento = apps.get_model("superadmin", "TipoOtorgamiento")
    for nombre in ("Municipal", "Provincial"):
        TipoOtorgamiento.objects.get_or_create(nombre=nombre)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("superadmin", "0005_tipootorgamiento"),
    ]

    operations = [
        migrations.RunPython(seed_tipos, noop),
    ]
