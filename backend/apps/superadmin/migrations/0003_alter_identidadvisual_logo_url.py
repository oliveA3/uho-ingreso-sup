from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("superadmin", "0002_asignatura_carrera_ces_escuela_identidadvisual_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="identidadvisual",
            name="logo_url",
            field=models.TextField(
                blank=True,
                help_text="URL o imagen codificada del logo institucional",
            ),
        ),
    ]