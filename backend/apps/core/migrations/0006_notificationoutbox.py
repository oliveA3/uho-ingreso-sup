from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0005_audit_log_snapshots"),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificationOutbox",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("titulo", models.CharField(max_length=200)),
                ("contenido", models.TextField()),
                ("estado", models.CharField(choices=[("pending", "Pendiente"), ("processing", "Procesando"), ("sent", "Enviada"), ("failed", "Fallida")], default="pending", max_length=20)),
                ("intentos", models.PositiveSmallIntegerField(default=0)),
                ("ultimo_error", models.TextField(blank=True, default="")),
                ("disponible_en", models.DateTimeField()),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("enviado_en", models.DateTimeField(blank=True, null=True)),
                ("notificacion", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="outbox_entry", to="core.notificacion")),
                ("usuario", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notification_outbox", to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
