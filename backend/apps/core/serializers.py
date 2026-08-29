from rest_framework import serializers

from .models import LogAuditoria, Notificacion


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ["id", "usuario", "fecha", "titulo", "contenido", "leida"]
        read_only_fields = ["id", "usuario", "fecha"]


class AuditLogSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source="usuario.username", read_only=True)
    rol = serializers.CharField(source="usuario.rol", read_only=True)

    class Meta:
        model = LogAuditoria
        fields = [
            "id", "created_at", "usuario", "usuario_nombre", "rol", "ip",
            "modulo", "accion", "datos_anteriores", "datos_nuevos",
        ]