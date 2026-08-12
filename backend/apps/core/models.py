from django.db import models

from apps.authentication.models import Usuario, ROLES


class LogAuditoria(models.Model):
    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='logs')
    accion = models.CharField(max_length=200)
    modulo = models.CharField(max_length=120)
    entidad = models.CharField(max_length=300, choices=ROLES)
    datos_anteriores = models.CharField(max_length=500)
    datos_nuevos = models.CharField(max_length=500)
    ip = models.CharField(max_length=30)
    # user_agent
    created_at = models.DateTimeField(auto_now_add=True)

# notificaciones
