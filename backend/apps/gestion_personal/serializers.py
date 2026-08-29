from rest_framework import serializers

from apps.superadmin.models import Carrera

from .models import BoletaInteresItem, BoletaSolicitud, BoletaSolicitudItem


class BoletaInteresItemSerializer(serializers.ModelSerializer):
    carrera_nombre = serializers.CharField(source="carrera.nombre", read_only=True)
    carrera_codigo = serializers.CharField(source="carrera.codigo", read_only=True)
    ces_nombre = serializers.CharField(source="carrera.ces.nombre", read_only=True)
    provincia_nombre = serializers.CharField(source="carrera.provincia.nombre", read_only=True)

    class Meta:
        model = BoletaInteresItem
        fields = ["id", "carrera", "carrera_codigo", "carrera_nombre", "ces_nombre", "provincia_nombre", "prioridad"]
        read_only_fields = ["prioridad"]


class AddBoletaInteresItemSerializer(serializers.Serializer):
    carrera = serializers.PrimaryKeyRelatedField(queryset=Carrera.objects.filter(activa=True))


class BoletaSolicitudItemSerializer(serializers.ModelSerializer):
    carrera_nombre = serializers.CharField(source="plan_plaza.carrera.nombre", read_only=True)
    carrera_codigo = serializers.CharField(source="plan_plaza.carrera.codigo", read_only=True)
    ces_nombre = serializers.CharField(source="plan_plaza.ces.nombre", read_only=True)
    provincia_nombre = serializers.CharField(source="plan_plaza.provincia.nombre", read_only=True)
    cantidad_plazas = serializers.IntegerField(source="plan_plaza.cantidad_plazas", read_only=True)
    otorgamiento_tipo = serializers.CharField(source="plan_plaza.otorgamiento_tipo", read_only=True)

    class Meta:
        model = BoletaSolicitudItem
        fields = [
            "id", "plan_plaza", "prioridad", "carrera_nombre", "carrera_codigo",
            "ces_nombre", "provincia_nombre", "cantidad_plazas", "otorgamiento_tipo",
        ]
        read_only_fields = fields


class BoletaSolicitudSerializer(serializers.ModelSerializer):
    items = BoletaSolicitudItemSerializer(source="boleta_solicitud", many=True, read_only=True)

    class Meta:
        model = BoletaSolicitud
        fields = ["id", "proceso", "estado", "fecha_enviada", "fecha_aprobada", "items"]
        read_only_fields = fields