from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("gestion_provincial", "0007_remove_planplazaitem_carrera_and_more")]
    operations = [
        migrations.AddField("etapa", "fecha_matematica", models.DateField(blank=True, null=True)),
        migrations.AddField("etapa", "fecha_espanol", models.DateField(blank=True, null=True)),
        migrations.AddField("etapa", "fecha_historia", models.DateField(blank=True, null=True)),
    ]