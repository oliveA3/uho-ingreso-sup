import django.db.models.deletion
from django.db import migrations, models


def migrate_char_to_fk(apps, schema_editor):
    PlanPlaza = apps.get_model("gestion_provincial", "PlanPlaza")
    TipoOtorgamiento = apps.get_model("superadmin", "TipoOtorgamiento")
    labels = {"municipal": "Municipal", "provincial": "Provincial"}
    cache = {}
    for plan in PlanPlaza.objects.all():
        old_value = plan.otorgamiento_tipo_old
        label = labels.get(old_value, old_value)
        if label not in cache:
            cache[label], _ = TipoOtorgamiento.objects.get_or_create(nombre=label)
        plan.otorgamiento_tipo = cache[label]
        plan.save(update_fields=["otorgamiento_tipo"])


def migrate_fk_to_char(apps, schema_editor):
    PlanPlaza = apps.get_model("gestion_provincial", "PlanPlaza")
    for plan in PlanPlaza.objects.all():
        plan.otorgamiento_tipo_old = plan.otorgamiento_tipo.nombre.lower()
        plan.save(update_fields=["otorgamiento_tipo_old"])


class Migration(migrations.Migration):

    dependencies = [
        ("gestion_provincial", "0008_etapa_fechas_examenes"),
        ("superadmin", "0006_seed_tipos_otorgamiento"),
    ]

    operations = [
        migrations.RenameField(
            model_name="planplaza",
            old_name="otorgamiento_tipo",
            new_name="otorgamiento_tipo_old",
        ),
        migrations.AddField(
            model_name="planplaza",
            name="otorgamiento_tipo",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="plan_plaza",
                to="superadmin.tipootorgamiento",
            ),
        ),
        migrations.RunPython(migrate_char_to_fk, migrate_fk_to_char),
        migrations.RemoveField(
            model_name="planplaza",
            name="otorgamiento_tipo_old",
        ),
        migrations.AlterField(
            model_name="planplaza",
            name="otorgamiento_tipo",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="plan_plaza",
                to="superadmin.tipootorgamiento",
            ),
        ),
    ]
