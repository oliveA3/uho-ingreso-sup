from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("superadmin", "0009_fill_ces_info"),
    ]

    operations = [
        migrations.AddField(
            model_name="carrera",
            name="campo_laboral",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="carrera",
            name="requisitos",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="carrera",
            name="perfil_egresado",
            field=models.TextField(blank=True, default=""),
        ),
    ]