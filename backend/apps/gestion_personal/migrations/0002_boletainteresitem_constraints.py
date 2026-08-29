from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("gestion_personal", "0001_initial")]

    operations = [
        migrations.AddConstraint(
            model_name="boletainteresitem",
            constraint=models.UniqueConstraint(fields=("boleta_interes", "carrera"), name="unique_carrera_boleta_interes"),
        ),
        migrations.AddConstraint(
            model_name="boletainteresitem",
            constraint=models.UniqueConstraint(fields=("boleta_interes", "prioridad"), name="unique_prioridad_boleta_interes"),
        ),
    ]