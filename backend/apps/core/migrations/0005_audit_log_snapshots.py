from django.db import migrations, models
import django.db.models.deletion


def copy_actor_snapshots(apps, schema_editor):
    LogAuditoria = apps.get_model("core", "LogAuditoria")
    for log in LogAuditoria.objects.select_related("usuario").filter(usuario__isnull=False):
        log.usuario_nombre = log.usuario.username
        log.rol = log.usuario.rol
        log.save(update_fields=["usuario_nombre", "rol"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_rename_notification_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="logauditoria",
            name="rol",
            field=models.CharField(default="sistema", max_length=64),
        ),
        migrations.AddField(
            model_name="logauditoria",
            name="usuario_nombre",
            field=models.CharField(default="sistema", max_length=150),
        ),
        migrations.AlterField(
            model_name="logauditoria",
            name="datos_anteriores",
            field=models.TextField(),
        ),
        migrations.AlterField(
            model_name="logauditoria",
            name="datos_nuevos",
            field=models.TextField(),
        ),
        migrations.AlterField(
            model_name="logauditoria",
            name="usuario",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="logs",
                to="authentication.usuario",
            ),
        ),
        migrations.RunPython(copy_actor_snapshots, migrations.RunPython.noop),
    ]