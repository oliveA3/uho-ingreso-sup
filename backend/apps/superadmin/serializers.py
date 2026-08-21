from rest_framework import serializers
from .models import (
    Asignatura,
    Carrera,
    Ces,
    Escuela,
    IdentidadVisual,
    Municipio,
    Provincia,
)


class IdentidadVisualSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdentidadVisual
        fields = [
            "id",
            "logo_url",
            "nombre_sistema",
            "tipografia",
            "color_primario",
            "color_secundario",
            "color_acento",
            "color_fondo",
            "color_exito",
            "color_error",
            "fecha_creado",
        ]


class IdentidadVisualUpdateSerializer(serializers.Serializer):
    logo_url = serializers.CharField(required=False, allow_blank=True)
    nombre_sistema = serializers.CharField(required=False, max_length=100)
    tipografia = serializers.CharField(required=False, max_length=100)

    color_primario = serializers.CharField(required=False, max_length=32)
    color_secundario = serializers.CharField(required=False, max_length=32)
    color_acento = serializers.CharField(required=False, max_length=32)
    color_fondo = serializers.CharField(required=False, max_length=32)
    color_exito = serializers.CharField(required=False, max_length=32)
    color_error = serializers.CharField(required=False, max_length=32)


class ProvinciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provincia
        fields = ['id', 'nombre', 'activa']


class MunicipioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Municipio
        fields = ['id', 'nombre', 'provincia', 'activo']


class EscuelaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Escuela
        fields = ['id', 'nombre', 'codigo', 'descripcion', 'municipio', 'activa']


class CesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ces
        fields = ['id', 'nombre', 'activa']


class CarreraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrera
        fields = ['id', 'codigo', 'nombre', 'ces', 'provincia', 'activa']


class AsignaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asignatura
        fields = ['id', 'nombre', 'activa']
