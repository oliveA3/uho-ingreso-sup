from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("gestion_personal", "0006_remove_boletasolicitud_comentario_respuesta_and_more"),
        ("gestion_provincial", "0008_etapa_fechas_examenes"),
    ]

    operations = [
        migrations.CreateModel(
            name="BoletaSolicitudItemAnterior",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("prioridad", models.PositiveSmallIntegerField()),
                (
                    "boleta_solicitud",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items_anteriores",
                        to="gestion_personal.boletasolicitud",
                    ),
                ),
                (
                    "plan_plaza",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        to="gestion_provincial.planplaza",
                    ),
                ),
            ],
        ),
    ]
