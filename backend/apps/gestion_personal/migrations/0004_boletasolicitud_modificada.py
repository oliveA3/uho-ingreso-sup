from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("gestion_personal", "0003_boletasolicitud_constraints"),
    ]

    operations = [
        migrations.AddField(
            model_name="boletasolicitud",
            name="modificada",
            field=models.BooleanField(default=False),
        ),
    ]