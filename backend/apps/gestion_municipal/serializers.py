from rest_framework import serializers

from apps.authentication.models import ROLES, Usuario
from apps.superadmin.models import Escuela


class MunicipalEscuelaSerializer(serializers.ModelSerializer):
    municipio_nombre = serializers.CharField(source="municipio.nombre", read_only=True)

    class Meta:
        model = Escuela
        fields = ["id", "nombre", "codigo", "descripcion", "municipio", "municipio_nombre", "activa"]
        read_only_fields = ["municipio", "municipio_nombre"]


class MunicipalUserSerializer(serializers.ModelSerializer):
    rol_label = serializers.SerializerMethodField()
    municipio_nombre = serializers.CharField(source="municipio.nombre", read_only=True)
    escuela_nombre = serializers.CharField(source="escuela.nombre", read_only=True)
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = Usuario
        fields = ["id", "username", "email", "first_name", "last_name", "rol", "rol_label", "municipio", "municipio_nombre", "escuela", "escuela_nombre", "is_active", "password"]
        read_only_fields = ["municipio", "municipio_nombre", "escuela_nombre"]

    def get_rol_label(self, obj):
        return dict(ROLES).get(obj.rol, obj.rol)

    def validate_rol(self, value):
        if value not in {"director_escuela", "secretario_escuela"}:
            raise serializers.ValidationError("Solo se permiten directores y secretarios de escuela.")
        return value

    def validate_escuela(self, value):
        request = self.context["request"]
        municipality_id = getattr(request.user, "municipio_id", None)
        if not (request.user.is_superuser or request.user.rol == "superadmin") and value.municipio_id != municipality_id:
            raise serializers.ValidationError("La escuela no pertenece a tu municipio.")
        return value

    def validate(self, attrs):
        role = attrs.get("rol", getattr(self.instance, "rol", None))
        school = attrs.get("escuela", getattr(self.instance, "escuela", None))
        if role not in {"director_escuela", "secretario_escuela"}:
            raise serializers.ValidationError("Solo se permiten directores y secretarios de escuela.")
        if not school:
            raise serializers.ValidationError({"escuela": "La escuela es obligatoria."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = Usuario(**validated_data)
        user.set_password(password or Usuario.objects.make_random_password())
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if "escuela" in validated_data:
            instance.municipio = instance.escuela.municipio
            instance.provincia = instance.escuela.municipio.provincia
        if password:
            instance.set_password(password)
        instance.save()
        return instance