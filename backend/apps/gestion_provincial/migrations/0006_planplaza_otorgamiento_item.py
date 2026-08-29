from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("gestion_provincial", "0005_etapa_estado")]

    operations = [
        migrations.AddField(
            model_name="planplaza",
            name="otorgamiento_tipo",
            field=models.CharField(choices=[("preuniversitario", "Preuniversitario"), ("otorgamiento_directo", "Otorgamiento Directo"), ("via_concurso", "La Vía de Concurso"), ("orden_18", "Orden 18")], default="preuniversitario", max_length=32),
            preserve_default=False,
        ),
        migrations.CreateModel(
            name="PlanPlazaItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("cantidad_plazas", models.PositiveIntegerField()),
                ("otorgamiento_tipo", models.CharField(choices=[("preuniversitario", "Preuniversitario"), ("otorgamiento_directo", "Otorgamiento Directo"), ("via_concurso", "La Vía de Concurso"), ("orden_18", "Orden 18")], max_length=32)),
                ("ces", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="plan_plaza_items", to="superadmin.ces")),
                ("carrera", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="plan_plaza_items", to="superadmin.carrera")),
                ("plan_plaza", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="gestion_provincial.planplaza")),
                ("provincia", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="plan_plaza_items", to="superadmin.provincia")),
                ("sexo", models.CharField(choices=[("A", "Ambos"), ("F", "Mujeres"), ("M", "Hombres")], max_length=1)),
            ],
        ),
    ]