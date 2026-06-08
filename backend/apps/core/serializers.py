from rest_framework import serializers

from apps.authentication.models import Rol, Usuario
from apps.auditoria.models import LogAuditoria
from apps.escuelas.models import Escuela
from apps.nomencladores.models import Provincia, Municipio, Ces


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ["id", "name", "description", "level", "permissions"]


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    ci = serializers.CharField(max_length=11)
    nombre = serializers.CharField(max_length=120)
    apellidos = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    telefono = serializers.CharField(max_length=32, required=False, allow_blank=True)
    municipio_id = serializers.IntegerField(required=False)
    escuela_id = serializers.IntegerField(required=False)

    def validate_ci(self, value):
        if Usuario.objects.filter(ci=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con este CI.")
        return value

    def validate_username(self, value):
        if Usuario.objects.filter(username=value).exists():
            raise serializers.ValidationError("El nombre de usuario ya está en uso.")
        return value

    def create(self, validated_data):
        role = Rol.objects.filter(name__iexact="Estudiante").first()
        if role is None:
            role = Rol.objects.create(
                name="Estudiante",
                description="Rol base para estudiantes.",
                level=10,
                permissions=["view_own_data"],
            )

        municipio_id = validated_data.pop("municipio_id", None)
        escuela_id = validated_data.pop("escuela_id", None)
        user = Usuario(
            username=validated_data["username"],
            ci=validated_data["ci"],
            nombre=validated_data["nombre"],
            apellidos=validated_data["apellidos"],
            email=validated_data["email"],
            telefono=validated_data.get("telefono", ""),
            rol=role,
        )
        if municipio_id:
            user.municipio = Municipio.objects.filter(pk=municipio_id).first()
        if escuela_id:
            user.escuela = Escuela.objects.filter(pk=escuela_id).first()

        user.first_name = validated_data["nombre"]
        user.last_name = validated_data["apellidos"]
        user.set_password(validated_data["password"])
        user.save()
        return user


class RoleAssignSerializer(serializers.Serializer):
    rol_id = serializers.IntegerField()


class ProvinciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provincia
        fields = ["id", "nombre", "activa"]


class MunicipioSerializer(serializers.ModelSerializer):
    provincia = ProvinciaSerializer(read_only=True)

    class Meta:
        model = Municipio
        fields = ["id", "nombre", "provincia", "activo"]


class CesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ces
        fields = ["id", "nombre", "activa"]


class EscuelaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Escuela
        fields = ["id", "nombre", "codigo", "municipio", "director", "secretario"]


class UserSerializer(serializers.ModelSerializer):
    rol = RoleSerializer(read_only=True)
    municipio = MunicipioSerializer(read_only=True)
    escuela = EscuelaSerializer(read_only=True)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "ci",
            "nombre",
            "apellidos",
            "email",
            "telefono",
            "rol",
            "municipio",
            "escuela",
            "activo",
            "email_verificado",
        ]


class AuditLogSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    target_user = UserSerializer(read_only=True)

    class Meta:
        model = LogAuditoria
        fields = ["id", "actor", "target_user", "action", "detail", "created_at"]


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
