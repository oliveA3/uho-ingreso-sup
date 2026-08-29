from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("core", "0003_notificacion")]

    operations = [
        migrations.RenameField("notificacion", "mensaje", "contenido"),
        migrations.RenameField("notificacion", "created_at", "fecha"),
        migrations.AddField(
            model_name="notificacion",
            name="titulo",
            field=models.CharField(default="Notificación", max_length=200),
            preserve_default=False,
        ),
    ]