"""Un otorgamiento por estudiante y proceso, y un indice de corte por carrera y proceso.

Antes de crear las restricciones hay que limpiar los duplicados que la ausencia de
constraint permitio acumular, o `AddConstraint` falla en cualquier base con datos.
"""
from django.db import migrations, models
from django.db.models import Count


def _delete_duplicates(model, group_fields, keep_order):
    """Deja una sola fila por grupo, conservando la primera segun `keep_order`."""
    duplicated = (
        model.objects.values(*group_fields)
        .annotate(total=Count("id"))
        .filter(total__gt=1)
    )
    removed = 0
    for group in duplicated:
        keys = {field: group[field] for field in group_fields}
        ids = list(
            model.objects.filter(**keys).order_by(*keep_order).values_list("id", flat=True)
        )
        # El primero segun keep_order es el que se conserva.
        removed += model.objects.filter(id__in=ids[1:]).delete()[0]
    return removed


def deduplicate(apps, schema_editor):
    Otorgamiento = apps.get_model("gestion_provincial", "Otorgamiento")
    CorteCarrera = apps.get_model("gestion_provincial", "CorteCarrera")
    # Otorgamiento: se conserva el indice mas alto (y, a igualdad, el mas reciente).
    _delete_duplicates(Otorgamiento, ["estudiante_id", "proceso_id"], ["-indice_otorgamiento", "-id"])
    # Corte: se conserva el mas recientemente importado.
    _delete_duplicates(CorteCarrera, ["proceso_id", "carrera_id"], ["-id"])


def noop(apps, schema_editor):
    """Quitar las restricciones no requiere restaurar los duplicados."""


class Migration(migrations.Migration):

    dependencies = [
        ('gestion_provincial', '0010_noticia'),
    ]

    operations = [
        migrations.RunPython(deduplicate, noop),
        migrations.AddConstraint(
            model_name='cortecarrera',
            constraint=models.UniqueConstraint(fields=('proceso', 'carrera'), name='unique_corte_proceso_carrera'),
        ),
        migrations.AddConstraint(
            model_name='otorgamiento',
            constraint=models.UniqueConstraint(fields=('estudiante', 'proceso'), name='unique_otorgamiento_estudiante_proceso'),
        ),
    ]
