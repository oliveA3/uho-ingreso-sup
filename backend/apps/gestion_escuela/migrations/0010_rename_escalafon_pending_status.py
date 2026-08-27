from django.db import migrations, models


def rename_pending_status(apps, schema_editor):
    Escalafon = apps.get_model("gestion_escuela", "Escalafon")
    Escalafon.objects.filter(estado="por_enviar").update(estado="pendiente")


class Migration(migrations.Migration):
    dependencies = [
        ("gestion_escuela", "0009_escalafonitem_fecha_revision"),
    ]

    operations = [
        migrations.AlterField(
            model_name="escalafon",
            name="estado",
            field=models.CharField(
                choices=[("pendiente", "Pendiente"), ("enviado", "Enviado")],
                default="pendiente",
                max_length=20,
            ),
        ),
        migrations.RunPython(rename_pending_status, migrations.RunPython.noop),
    ]