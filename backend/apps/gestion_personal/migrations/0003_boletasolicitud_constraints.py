from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("gestion_personal", "0002_boletainteresitem_constraints")]

    operations = [
        migrations.AddConstraint(
            model_name="boletasolicitud",
            constraint=models.UniqueConstraint(
                fields=("estudiante", "proceso"), name="unique_solicitud_estudiante_proceso"
            ),
        ),
        migrations.AddConstraint(
            model_name="boletasolicituditem",
            constraint=models.UniqueConstraint(
                fields=("boleta_solicitud", "plan_plaza"), name="unique_plan_solicitud"
            ),
        ),
        migrations.AddConstraint(
            model_name="boletasolicituditem",
            constraint=models.UniqueConstraint(
                fields=("boleta_solicitud", "prioridad"), name="unique_prioridad_solicitud"
            ),
        ),
    ]