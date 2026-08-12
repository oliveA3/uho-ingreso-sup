from rest_framework import serializers
from .models import IdentidadVisual, Provincia, Municipio, Escuela


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
    logo_url = serializers.URLField(required=False, allow_blank=True)
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
        fields = ['id', 'nombre']


class MunicipioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Municipio
        fields = ['id', 'nombre', 'provincia']


class EscuelaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Escuela
        fields = ['id', 'nombre', 'municipio']
