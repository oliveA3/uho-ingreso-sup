from rest_framework import serializers

from apps.superadmin.models import Carrera, Ces, Provincia

from .models import PlanPlaza


class PlanPlazaSerializer(serializers.ModelSerializer):
    codigo_carrera = serializers.CharField(source="carrera.codigo", read_only=True)
    nombre_carrera = serializers.CharField(source="carrera.nombre", read_only=True)
    ces_nombre = serializers.CharField(source="ces.nombre", read_only=True)
    provincia_nombre = serializers.CharField(source="provincia.nombre", read_only=True)
    tipo_otorgamiento_label = serializers.CharField(source="get_otorgamiento_tipo_display", read_only=True)

    class Meta:
        model = PlanPlaza
        fields = [
            "id", "proceso", "carrera", "codigo_carrera", "nombre_carrera",
            "cantidad_plazas", "otorgamiento_tipo", "tipo_otorgamiento_label",
            "ces", "ces_nombre", "provincia", "provincia_nombre", "sexo",
        ]

    def validate_cantidad_plazas(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad de plazas debe ser mayor que cero.")
        return value

    def validate(self, attrs):
        carrera = attrs.get("carrera", getattr(self.instance, "carrera", None))
        ces = attrs.get("ces", getattr(self.instance, "ces", None))
        if carrera and ces and carrera.ces_id != ces.id:
            raise serializers.ValidationError({"ces": "El CES no coincide con la carrera."})
        return attrs