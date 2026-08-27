from django.db import migrations, models
import django.db.models.deletion


def migrate_years_to_processes(apps, schema_editor):
    Escalafon = apps.get_model("gestion_escuela", "Escalafon")
    Proceso = apps.get_model("gestion_provincial", "Proceso")
    for escalafon in Escalafon.objects.all().iterator():
        proceso, _ = Proceso.objects.get_or_create(anio=date(escalafon.anio, 1, 1))
        escalafon.proceso_id = proceso.id
        escalafon.save(update_fields=["proceso"])


class Migration(migrations.Migration):
    dependencies = [
        ("gestion_escuela", "0002_estudianteescalafon_aceptado_and_more"),
        ("gestion_provincial", "0005_etapa_estado"),
    ]

    operations = [
        migrations.AddField(
            model_name="escalafon",
            name="proceso",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="escalafones",
                to="gestion_provincial.proceso",
            ),
        ),
        migrations.RunPython(migrate_years_to_processes, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name="escalafon",
            name="unique_escalafon_escuela_anio",
        ),
        migrations.AlterField(
            model_name="escalafon",
            name="proceso",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="escalafones",
                to="gestion_provincial.proceso",
            ),
        ),
        migrations.RemoveField(model_name="escalafon", name="anio"),
        migrations.AlterModelOptions(
            name="escalafon",
            options={"ordering": ["-proceso", "-fecha_publicacion"]},
        ),
        migrations.AddConstraint(
            model_name="escalafon",
            constraint=models.UniqueConstraint(
                fields=("proceso", "escuela"),
                name="unique_escalafon_proceso_escuela",
            ),
        ),
        migrations.AddIndex(
            model_name="escalafon",
            index=models.Index(fields=["proceso", "escuela"], name="gestion_esc_proceso_4a7c9d_idx"),
        ),
    ]
