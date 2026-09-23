from django.db import models

from apps.authentication.models import Usuario, ROLES


class LogAuditoria(models.Model):
    usuario = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, related_name='logs')
    usuario_nombre = models.CharField(max_length=150, default="sistema")
    rol = models.CharField(max_length=64, default="sistema")
    accion = models.CharField(max_length=200)
    modulo = models.CharField(max_length=120)
    entidad = models.CharField(max_length=300, choices=ROLES)
    datos_anteriores = models.TextField()
    datos_nuevos = models.TextField()
    ip = models.CharField(max_length=30)
    # user_agent
    created_at = models.DateTimeField(auto_now_add=True)

# notificaciones

class Notificacion(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="notificaciones")
    titulo = models.CharField(max_length=200)
    contenido = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)
    leida = models.BooleanField(default=False)


class NotificationOutbox(models.Model):
    PENDING = "pending"
    PROCESSING = "processing"
    SENT = "sent"
    FAILED = "failed"
    STATUS_CHOICES = [
        (PENDING, "Pendiente"),
        (PROCESSING, "Procesando"),
        (SENT, "Enviada"),
        (FAILED, "Fallida"),
    ]

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="notification_outbox")
    titulo = models.CharField(max_length=200)
    contenido = models.TextField()
    estado = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    intentos = models.PositiveSmallIntegerField(default=0)
    ultimo_error = models.TextField(blank=True, default="")
    disponible_en = models.DateTimeField()
    notificacion = models.OneToOneField(
        Notificacion, on_delete=models.SET_NULL, null=True, blank=True, related_name="outbox_entry"
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    enviado_en = models.DateTimeField(null=True, blank=True)
