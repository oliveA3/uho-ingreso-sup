from rest_framework import serializers

from apps.authentication.models import ROLES, Usuario, Estudiante
from apps.superadmin.models import Escuela


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=100)
    password = serializers.CharField(max_length=100, write_only=True)


class UserSerializer(serializers.ModelSerializer):
    rol_label = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "email",
            "rol",
            "rol_label",
            "provincia",
            "municipio",
            "escuela",
            "first_name",
            "last_name",
        ]

    def get_rol_label(self, obj):
        return dict(ROLES).get(obj.rol, obj.rol)


class RegisterSerializer(serializers.Serializer):
    ci = serializers.CharField(max_length=11)
    escuela = serializers.PrimaryKeyRelatedField(queryset=Escuela.objects.all())
    email = serializers.EmailField()
    username = serializers.CharField(max_length=100)
    password = serializers.CharField(max_length=100, write_only=True, min_length=8)
    whatsapp = serializers.CharField(
        max_length=32, required=False, allow_blank=True)

    def validate_ci(self, value):
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError(
                "El CI debe tener 11 dígitos numéricos.")
        if Estudiante.objects.filter(ci=value).exists():
            raise serializers.ValidationError(
                "Ya existe un estudiante con este CI.")
        return value

    def validate_username(self, value):
        if Usuario.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                "El nombre de usuario ya está en uso.")
        return value

    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Este correo ya está registrado.")
        return value

    def validate_escuela(self, value):
        if not value.activa:
            raise serializers.ValidationError(
                "La escuela seleccionada no está disponible para el registro.")
        return value

    def create(self, validated_data):
        escuela = validated_data["escuela"]
        user = Usuario.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        user.rol = "estudiante"
        user.escuela = escuela
        user.municipio = escuela.municipio
        user.provincia = escuela.municipio.provincia
        user.save()

        Estudiante.objects.create(
            usuario=user,
            ci=validated_data["ci"],
            nombre="",
            apellidos="",
            sexo="",
            direccion="",
            escuela=escuela,
            whatsapp=validated_data.get("whatsapp", ""),
            indice_10=0.0,
            indice_11=0.0,
            indice_12=0.0,
            indice_general=0.0,
        )

        return user