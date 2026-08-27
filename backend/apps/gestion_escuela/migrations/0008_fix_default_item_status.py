from django.db import migrations


def fix_default_status(apps, schema_editor):
    EscalafonItem = apps.get_model("gestion_escuela", "EscalafonItem")
    EscalafonItem.objects.filter(
        estado="por_revisar",
        causa_revision="",
    ).update(estado="sin_respuesta")


class Migration(migrations.Migration):
    dependencies = [
        ("gestion_escuela", "0007_escalafon_estado"),
    ]

    operations = [
        migrations.RunPython(fix_default_status, migrations.RunPython.noop),
    ]
