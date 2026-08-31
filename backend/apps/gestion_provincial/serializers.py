from rest_framework import serializers

from apps.authentication.models import ROLES, Usuario
from apps.superadmin.models import Carrera, Ces, Escuela, Municipio, Provincia

from .models import ETAPAS_NOMBRES, Etapa, Proceso


class ProvincialProcesoSerializer(serializers.ModelSerializer):
    etapa = serializers.PrimaryKeyRelatedField(queryset=Etapa.objects.all())

    class Meta:
        model = Proceso
        fields = ["id", "anio", "etapa"]

    def validate(self, attrs):
        anio = attrs.get("anio")
        etapa = attrs.get("etapa")
        if anio and etapa and Proceso.objects.filter(anio=anio, etapa=etapa).exists():
            raise serializers.ValidationError({"detail": "Ya existe un proceso para ese año y esa etapa."})
        return attrs


class ProvincialEtapaSerializer(serializers.ModelSerializer):
    numero = serializers.SerializerMethodField()

    class Meta:
        model = Etapa
        fields = ["id", "numero", "nombre", "fecha_inicio", "fecha_fin", "fecha_matematica", "fecha_espanol", "fecha_historia", "estado"]
        read_only_fields = ["estado"]

    def get_numero(self, obj):
        return next(numero for numero, nombre in ETAPAS_NOMBRES.items() if nombre == obj.nombre)


class ActivarEtapaSerializer(serializers.Serializer):
    fecha_inicio = serializers.DateField()
    fecha_fin = serializers.DateField()
    fecha_matematica = serializers.DateField(required=False)
    fecha_espanol = serializers.DateField(required=False)
    fecha_historia = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs["fecha_inicio"] > attrs["fecha_fin"]:
            raise serializers.ValidationError(
                "La fecha de fin debe ser posterior o igual a la de inicio."
            )
        return attrs


class ProvincialProvinciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provincia
        fields = ["id", "nombre", "activa"]


class ProvincialCesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ces
        fields = ["id", "nombre", "activa"]


class ProvincialCarreraSerializer(serializers.ModelSerializer):
    ces_nombre = serializers.CharField(source="ces.nombre", read_only=True)
    provincia_nombre = serializers.CharField(source="provincia.nombre", read_only=True)

    class Meta:
        model = Carrera
        fields = [
            "id", "codigo", "nombre", "ces", "ces_nombre",
            "provincia", "provincia_nombre", "activa",
        ]


class ProvincialMunicipioSerializer(serializers.ModelSerializer):
    escuelas_count = serializers.IntegerField(read_only=True)
    representante = serializers.SerializerMethodField()

    class Meta:
        model = Municipio
        fields = ["id", "nombre", "provincia", "activo", "escuelas_count", "representante"]

    def get_representante(self, obj):
        user = obj.usuarios.filter(rol="ingreso_municipal").first()
        if not user:
            return None
        return {
            "id": user.id,
            "nombre": f"{user.first_name} {user.last_name}".strip() or user.username,
            "activo": user.is_active,
        }


class ProvincialEscuelaSerializer(serializers.ModelSerializer):
    municipio_nombre = serializers.CharField(source="municipio.nombre", read_only=True)

    class Meta:
        model = Escuela
        fields = ["id", "nombre", "codigo", "descripcion", "municipio", "municipio_nombre", "activa"]


class ProvincialUserSerializer(serializers.ModelSerializer):
    rol_label = serializers.SerializerMethodField()
    provincia_nombre = serializers.CharField(source="provincia.nombre", read_only=True)
    municipio_nombre = serializers.CharField(source="municipio.nombre", read_only=True)
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = Usuario
        fields = [
            "id", "username", "email", "first_name", "last_name", "rol", "rol_label",
            "provincia", "provincia_nombre", "municipio", "municipio_nombre",
            "is_active", "password",
        ]
        read_only_fields = ["rol", "provincia", "provincia_nombre", "municipio_nombre"]

    def get_rol_label(self, obj):
        return dict(ROLES).get(obj.rol, obj.rol)

    def validate_municipio(self, value):
        request = self.context["request"]
        province_id = getattr(request.user, "provincia_id", None)
        if not (request.user.is_superuser or request.user.rol == "superadmin") and value.provincia_id != province_id:
            raise serializers.ValidationError("El municipio no pertenece a tu provincia.")
        return value

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
