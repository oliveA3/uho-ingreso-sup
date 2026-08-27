from rest_framework import serializers

from apps.authentication.models import Estudiante
from .models import EscalafonItem


class StudentsWithoutAccountSerializer(serializers.ModelSerializer):
    indice_general = serializers.SerializerMethodField()

    class Meta:
        model = Estudiante
        fields = ["id", "ci", "nombre", "apellidos", "indice_general"]

    def get_indice_general(self, student):
        entry = student.escalafones.order_by("-escalafon__proceso__anio", "-id").first()
        return float(entry.indice_general) if entry else student.indice_general


class EscalafonItemSerializer(serializers.ModelSerializer):
    ci = serializers.CharField(source="estudiante.ci", read_only=True)
    nombre = serializers.CharField(required=False)
    apellidos = serializers.CharField(required=False)
    sexo = serializers.CharField(required=False)
    direccion = serializers.CharField(required=False)
    escuela = serializers.IntegerField(source="escalafon.escuela_id", read_only=True)
    escuela_nombre = serializers.CharField(source="escalafon.escuela.nombre", read_only=True)
    estado_escalafon = serializers.CharField(source="escalafon.estado", read_only=True)
    anio = serializers.IntegerField(source="escalafon.proceso.anio.year", read_only=True)
    tiene_cuenta = serializers.BooleanField(source="estudiante.usuario_id", read_only=True)
    estado_revision = serializers.SerializerMethodField()
    aceptado = serializers.SerializerMethodField()

    class Meta:
        model = EscalafonItem
        fields = [
            "id", "ci", "nombre", "apellidos", "sexo", "direccion", "escuela", "escuela_nombre", "anio", "estado_escalafon",
            "indice_10", "indice_11", "indice_12", "indice_general", "indices_bloqueados",
            "estado", "causa_revision", "estado_revision", "aceptado", "tiene_cuenta",
            "fecha_revision",
        ]
        read_only_fields = ["indices_bloqueados", "estado", "estado_revision", "aceptado", "fecha_revision"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.update({
            "nombre": instance.estudiante.nombre,
            "apellidos": instance.estudiante.apellidos,
            "sexo": instance.estudiante.sexo,
            "direccion": instance.estudiante.direccion,
        })
        return data

    def get_estado_revision(self, instance):
        return "pendiente" if instance.estado == "por_revisar" else "revisada"

    def get_aceptado(self, instance):
        if instance.estado == "sin_respuesta":
            return None
        return instance.estado == "aceptado"

    def update(self, instance, validated_data):
        request = self.context["request"]
        role = request.user.rol
        stage_active = self.context.get("stage_active", False)
        can_edit_indices = role == "jefe_comision" or (role == "secretario_escuela" and stage_active)
        index_fields = {"indice_10", "indice_11", "indice_12", "indice_general"}
        personal = {field: validated_data.pop(field) for field in ("nombre", "apellidos", "sexo", "direccion") if field in validated_data}
        if instance.indices_bloqueados and any(field in validated_data for field in index_fields):
            raise serializers.ValidationError("Los índices están bloqueados definitivamente.")
        if not can_edit_indices and any(field in validated_data for field in index_fields):
            raise serializers.ValidationError("Los índices no pueden editarse fuera de la etapa activa.")
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if personal:
            for field, value in personal.items():
                setattr(instance.estudiante, field, value)
            instance.estudiante.save(update_fields=list(personal))
        return instance


class StudentEscalafonActionSerializer(serializers.Serializer):
    causa = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if self.context["action"] == "revision" and not attrs.get("causa", "").strip():
            raise serializers.ValidationError({"causa": "Describe la causa de la revisión."})
        return attrs
