from django.db import models

from apps.authentication.models import Usuario


class LogAuditoria(models.Model):
    usuario = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, related_name='logs')
    usuario_nombre = models.CharField(max_length=150, default="sistema")
    rol = models.CharField(max_length=64, default="sistema")
    accion = models.CharField(max_length=200)
    modulo = models.CharField(max_length=120)
    # Entidad afectada por la accion (usuario, etapa, carrera...). No lleva
    # `choices=ROLES`: eso describia el rol del actor, que ya esta en `rol`.
    entidad = models.CharField(max_length=300, blank=True, default="")
    datos_anteriores = models.TextField()
    datos_nuevos = models.TextField()
    ip = models.CharField(max_length=30)
    # user_agent
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # El listado ordena por fecha descendente y se filtra por usuario y modulo:
        # con una fila por peticion la tabla crece rapido y sin indices el panel de
        # auditoria se vuelve lento.
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"], name="auditlog_created_at_desc"),
            models.Index(fields=["usuario", "-created_at"], name="auditlog_usuario_fecha"),
            models.Index(fields=["modulo"], name="auditlog_modulo"),
        ]

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
