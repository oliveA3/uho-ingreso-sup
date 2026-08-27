from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0002_estudiante_remove_usuario_activo_usuario_escuela_and_more"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="usuario",
            constraint=models.UniqueConstraint(
                fields=("provincia",),
                condition=Q(rol="jefe_comision"),
                name="unique_jefe_comision_provincia",
            ),
        ),
        migrations.AddConstraint(
            model_name="usuario",
            constraint=models.UniqueConstraint(
                fields=("provincia",),
                condition=Q(rol="ingreso_provincial"),
                name="unique_repr_provincial_provincia",
            ),
        ),
        migrations.AddConstraint(
            model_name="usuario",
            constraint=models.UniqueConstraint(
                fields=("municipio",),
                condition=Q(rol="ingreso_municipal"),
                name="unique_repr_municipal_municipio",
            ),
        ),
        migrations.AddConstraint(
            model_name="usuario",
            constraint=models.UniqueConstraint(
                fields=("escuela",),
                condition=Q(rol="director_escuela"),
                name="unique_director_escuela",
            ),
        ),
        migrations.AddConstraint(
            model_name="usuario",
            constraint=models.UniqueConstraint(
                fields=("escuela",),
                condition=Q(rol="secretario_escuela"),
                name="unique_secretario_escuela",
            ),
        ),
    ]
