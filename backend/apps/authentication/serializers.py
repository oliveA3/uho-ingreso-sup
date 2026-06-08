from rest_framework import serializers

from apps.authentication.models import Rol, Usuario
from apps.escuelas.models import Escuela
from apps.estudiantes.models import Estudiante


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    ci = serializers.CharField(max_length=11)
    nombre = serializers.CharField(max_length=120)
    apellidos = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    sexo = serializers.ChoiceField(choices=[("M", "Masculino"), ("F", "Femenino"), ("O", "Otro")])
    escuela_id = serializers.IntegerField()
    whatsapp = serializers.CharField(max_length=32, required=False, allow_blank=True)
    tutor_nombre = serializers.CharField(max_length=120, required=False, allow_blank=True)
    tutor_correo = serializers.EmailField(required=False, allow_blank=True)
    tutor_telefono = serializers.CharField(max_length=32, required=False, allow_blank=True)

    def validate_ci(self, value):
        if Estudiante.objects.filter(ci=value).exists():
            raise serializers.ValidationError("Ya existe un estudiante con este CI.")
        return value

    def validate_username(self, value):
        if Usuario.objects.filter(username=value).exists():
            raise serializers.ValidationError("El nombre de usuario ya está en uso.")
        return value

    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo ya está registrado.")
        return value

    def validate_escuela_id(self, value):
        if not Escuela.objects.filter(pk=value).exists():
            raise serializers.ValidationError("La escuela especificada no existe.")
        return value

    def create(self, validated_data):
        # Obtener o crear el rol de Estudiante
        role, _ = Rol.objects.get_or_create(
            name="Estudiante",
            defaults={"level": 10, "description": "Rol base para estudiantes.", "permissions": "[]"}
        )

        # Extraer datos para Usuario
        username = validated_data["username"]
        password = validated_data["password"]
        email = validated_data["email"]
        
        # Crear Usuario
        user = Usuario.objects.create_user(
            username=username,
            email=email,
            password=password,
            rol=role,
        )
        user.first_name = validated_data["nombre"]
        user.last_name = validated_data["apellidos"]
        user.save()

        # Crear Estudiante vinculado al Usuario
        escuela = Escuela.objects.get(pk=validated_data["escuela_id"])
        estudiante = Estudiante.objects.create(
            ci=validated_data["ci"],
            nombre=validated_data["nombre"],
            apellidos=validated_data["apellidos"],
            sexo=validated_data["sexo"],
            escuela=escuela,
            usuario=user,
            whatsapp=validated_data.get("whatsapp", ""),
            tutor_nombre=validated_data.get("tutor_nombre", ""),
            tutor_correo=validated_data.get("tutor_correo", ""),
            tutor_telefono=validated_data.get("tutor_telefono", ""),
        )

        return user


class UserSerializer(serializers.ModelSerializer):
    estudiante = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "rol",
            "activo",
            "email_verificado",
            "estudiante",
        ]

    def get_estudiante(self, obj):
        if hasattr(obj, 'estudiante') and obj.estudiante:
            return {
                "id": obj.estudiante.id,
                "ci": obj.estudiante.ci,
                "nombre": obj.estudiante.nombre,
                "apellidos": obj.estudiante.apellidos,
                "escuela": obj.estudiante.escuela.nombre if obj.estudiante.escuela else None,
            }
        return None
