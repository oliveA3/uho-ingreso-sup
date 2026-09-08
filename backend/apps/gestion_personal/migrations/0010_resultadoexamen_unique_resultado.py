from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("gestion_personal", "0009_confirmacionprueba_unique_confirmacion_estudiante_proceso_asignatura"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="resultadoexamen",
            constraint=models.UniqueConstraint(
                fields=("estudiante", "proceso", "asignatura"),
                name="unique_resultado_estudiante_proceso_asignatura",
            ),
        ),
    ]