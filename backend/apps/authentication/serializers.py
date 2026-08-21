from rest_framework import serializers

from apps.authentication.models import ROLES, Usuario, Estudiante
from apps.superadmin.models import Escuela, Municipio, Provincia


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


class SuperAdminUserSerializer(serializers.ModelSerializer):
    rol_label = serializers.SerializerMethodField()
    provincia_nombre = serializers.CharField(source="provincia.nombre", read_only=True)
    municipio_nombre = serializers.CharField(source="municipio.nombre", read_only=True)
    escuela_nombre = serializers.CharField(source="escuela.nombre", read_only=True)
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = Usuario
        fields = [
            "id", "username", "email", "first_name", "last_name", "rol", "rol_label",
            "provincia", "provincia_nombre", "municipio", "municipio_nombre",
            "escuela", "escuela_nombre", "is_active", "password",
        ]

    def get_rol_label(self, obj):
        return dict(ROLES).get(obj.rol, obj.rol)

    def validate(self, attrs):
        role = attrs.get("rol", getattr(self.instance, "rol", None))
        province = attrs.get("provincia", getattr(self.instance, "provincia", None))
        municipality = attrs.get("municipio", getattr(self.instance, "municipio", None))
        school = attrs.get("escuela", getattr(self.instance, "escuela", None))

        if role == "ingreso_municipal" and (not province or not municipality):
            raise serializers.ValidationError(
                "El representante municipal debe tener provincia y municipio."
            )
        if role in {"director_escuela", "secretario_escuela"} and (
            not province or not municipality or not school
        ):
            raise serializers.ValidationError(
                "El director o secretario debe tener provincia, municipio y escuela."
            )
        if municipality and province and municipality.provincia_id != province.id:
            raise serializers.ValidationError(
                {"municipio": "El municipio no pertenece a la provincia seleccionada."}
            )
        if school and municipality and school.municipio_id != municipality.id:
            raise serializers.ValidationError(
                {"escuela": "La escuela no pertenece al municipio seleccionado."}
            )
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
        if password:
            instance.set_password(password)
        instance.save()
        return instance


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