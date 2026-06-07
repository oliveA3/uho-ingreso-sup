from rest_framework import serializers

from .models import (
    AsignaturaExamen,
    AuditLog,
    Carrera,
    Ces,
    Escuela,
    Municipio,
    OtorgamientoTipo,
    Province,
    Role,
    User,
)


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
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
        if User.objects.filter(ci=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con este CI.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("El nombre de usuario ya está en uso.")
        return value

    def create(self, validated_data):
        role = Role.objects.filter(name__iexact="Estudiante").first()
        if role is None:
            role = Role.objects.create(
                name="Estudiante",
                description="Rol base para estudiantes.",
                level=10,
                permissions=["view_own_data"],
            )
        municipio_id = validated_data.pop("municipio_id", None)
        escuela_id = validated_data.pop("escuela_id", None)
        user = User(
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


class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Province
        fields = ["id", "name"]


class MunicipioSerializer(serializers.ModelSerializer):
    province = ProvinceSerializer(read_only=True)

    class Meta:
        model = Municipio
        fields = ["id", "name", "province"]


class CesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ces
        fields = ["id", "name"]


class EscuelaSerializer(serializers.ModelSerializer):
    municipio = MunicipioSerializer(read_only=True)

    class Meta:
        model = Escuela
        fields = ["id", "name", "municipio", "director", "secretario"]


class UserSerializer(serializers.ModelSerializer):
    rol = RoleSerializer(read_only=True)
    municipio = MunicipioSerializer(read_only=True)
    escuela = EscuelaSerializer(read_only=True)

    class Meta:
        model = User
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
        ]


class AuditLogSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    target_user = UserSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = ["id", "actor", "target_user", "action", "detail", "timestamp"]
    class Meta:
        model = Province
        fields = ["id", "name"]


class MunicipioSerializer(serializers.ModelSerializer):
    province = ProvinceSerializer(read_only=True)

    class Meta:
        model = Municipio
        fields = ["id", "name", "province"]


class CesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ces
        fields = ["id", "name"]


class EscuelaSerializer(serializers.ModelSerializer):
    municipio = MunicipioSerializer(read_only=True)

    class Meta:
        model = Escuela
        fields = ["id", "name", "municipio", "director", "secretario"]


class UserSerializer(serializers.ModelSerializer):
    rol = RoleSerializer(read_only=True)
    municipio = MunicipioSerializer(read_only=True)
    escuela = EscuelaSerializer(read_only=True)

    class Meta:
        model = User
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
        ]


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
