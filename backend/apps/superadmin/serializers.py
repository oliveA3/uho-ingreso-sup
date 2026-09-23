import re

from rest_framework import serializers
from .models import (
    Asignatura,
    Carrera,
    Ces,
    Escuela,
    IdentidadVisual,
    Municipio,
    Provincia,
    TipoOtorgamiento,
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


_HEX_COLOR_RE = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


class IdentidadVisualUpdateSerializer(serializers.Serializer):
    logo_url = serializers.CharField(required=False, allow_blank=True, max_length=500)
    nombre_sistema = serializers.CharField(required=False, max_length=100)
    tipografia = serializers.CharField(required=False, max_length=100)

    color_primario = serializers.CharField(required=False, max_length=32)
    color_secundario = serializers.CharField(required=False, max_length=32)
    color_acento = serializers.CharField(required=False, max_length=32)
    color_fondo = serializers.CharField(required=False, max_length=32)
    color_exito = serializers.CharField(required=False, max_length=32)
    color_error = serializers.CharField(required=False, max_length=32)

    _ALLOWED_LOGO_URL_PREFIXES = ("/", "http://", "https://", "data:image/")

    def validate_logo_url(self, value):
        if value and not value.startswith(self._ALLOWED_LOGO_URL_PREFIXES):
            raise serializers.ValidationError(
                "La URL del logo debe ser relativa, usar http(s) o ser una imagen embebida (data:image/...)."
            )
        return value

    def _validate_hex(self, field_name, value):
        if value and not _HEX_COLOR_RE.match(value):
            raise serializers.ValidationError(f"{field_name} debe ser un color hexadecimal válido (p. ej. #FFAA00).")
        return value

    def validate_color_primario(self, value):
        return self._validate_hex("color_primario", value)

    def validate_color_secundario(self, value):
        return self._validate_hex("color_secundario", value)

    def validate_color_acento(self, value):
        return self._validate_hex("color_acento", value)

    def validate_color_fondo(self, value):
        return self._validate_hex("color_fondo", value)

    def validate_color_exito(self, value):
        return self._validate_hex("color_exito", value)

    def validate_color_error(self, value):
        return self._validate_hex("color_error", value)


class SuperAdminStudentSerializer(serializers.Serializer):
    """Describe la forma del JSON que `SuperAdminStudentViewSet.list()` arma a
    mano (no usa un `ModelSerializer` real en tiempo de ejecución). Este
    serializer no se instancia para serializar datos: existe únicamente como
    `serializer_class` para que drf-spectacular pueda documentar la vista."""

    id = serializers.IntegerField()
    ci = serializers.CharField()
    nombre = serializers.CharField()
    apellidos = serializers.CharField()
    sexo = serializers.CharField()
    email = serializers.CharField(allow_blank=True)
    username = serializers.CharField(allow_blank=True)
    user_id = serializers.IntegerField(allow_null=True)
    is_active = serializers.BooleanField()
    has_account = serializers.BooleanField()
    escuela = serializers.CharField()
    provincia = serializers.CharField()
    provincia_id = serializers.IntegerField()
    anios = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="Años (proceso de ingreso) en los que el estudiante tiene escalafones registrados, orden descendente.",
    )


class ProvinciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provincia
        fields = ['id', 'nombre', 'descripcion', 'activa', 'fecha_ultima_modificacion']


class MunicipioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Municipio
        fields = ['id', 'nombre', 'descripcion', 'provincia', 'activo', 'fecha_ultima_modificacion']


class EscuelaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Escuela
        fields = ['id', 'nombre', 'codigo', 'descripcion', 'municipio', 'activa', 'fecha_ultima_modificacion']


class CesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ces
        fields = ['id', 'nombre', 'descripcion', 'activa', 'fecha_ultima_modificacion']


class CarreraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrera
        fields = ['id', 'codigo', 'nombre', 'descripcion', 'ces', 'provincia', 'activa', 'fecha_ultima_modificacion']


class AsignaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asignatura
        fields = ['id', 'nombre', 'descripcion', 'activa', 'fecha_ultima_modificacion']


class TipoOtorgamientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoOtorgamiento
        fields = ['id', 'nombre', 'descripcion', 'activa', 'fecha_ultima_modificacion']
