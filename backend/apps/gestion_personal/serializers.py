from rest_framework import serializers

from apps.superadmin.models import Carrera
from apps.authentication.models import Estudiante

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
        fields = [
            "id", "proceso", "estado",
            "fecha_enviada", "fecha_aprobada", "items",
        ]
        read_only_fields = fields


class StudentProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="usuario.email", required=False)
    nombre = serializers.CharField(read_only=True)
    apellidos = serializers.CharField(read_only=True)
    ci = serializers.CharField(read_only=True)
    sexo = serializers.CharField(read_only=True)
    escuela = serializers.CharField(source="escuela.nombre", read_only=True)
    provincia = serializers.CharField(source="escuela.municipio.provincia.nombre", read_only=True)
    direccion = serializers.CharField(required=False, allow_blank=True)
    whatsapp = serializers.CharField(required=False, allow_blank=True)
    tutor_nombre = serializers.CharField(required=False, allow_blank=True)
    tutor_email = serializers.EmailField(required=False, allow_blank=True)
    tutor_telefono = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Estudiante
        fields = ["nombre", "apellidos", "ci", "sexo", "escuela", "provincia", "direccion", "email", "whatsapp", "tutor_nombre", "tutor_email", "tutor_telefono"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("usuario", {})
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if "email" in user_data:
            instance.usuario.email = user_data["email"]
            instance.usuario.save(update_fields=["email"])
        return instance