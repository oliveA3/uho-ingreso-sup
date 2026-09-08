from rest_framework import serializers
import secrets
from datetime import timedelta
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.authentication.models import EmailVerificationCode, ROLES, Usuario, Estudiante
from apps.gestion_escuela.models import EscalafonItem
from apps.gestion_provincial.models import ETAPAS_NOMBRES
from apps.superadmin.models import Escuela, Municipio, Provincia


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=100)
    password = serializers.CharField(max_length=100, write_only=True)


class UserSerializer(serializers.ModelSerializer):
    rol_label = serializers.SerializerMethodField()
    provincia_nombre = serializers.CharField(source="provincia.nombre", read_only=True)
    municipio_nombre = serializers.CharField(source="municipio.nombre", read_only=True)
    escuela_nombre = serializers.CharField(source="escuela.nombre", read_only=True)
    tutor_nombre = serializers.SerializerMethodField()
    tutor_email = serializers.SerializerMethodField()
    tutor_telefono = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "email",
            "rol",
            "rol_label",
            "provincia", "provincia_nombre",
            "municipio", "municipio_nombre",
            "escuela", "escuela_nombre",
            "first_name",
            "last_name",
            "tutor_nombre", "tutor_email", "tutor_telefono",
        ]

    def get_rol_label(self, obj):
        return dict(ROLES).get(obj.rol, obj.rol)

    def _get_student_field(self, obj, field):
        try:
            return getattr(obj.estudiante, field)
        except Estudiante.DoesNotExist:
            return None

    def get_tutor_nombre(self, obj):
        return self._get_student_field(obj, "tutor_nombre")

    def get_tutor_email(self, obj):
        return self._get_student_field(obj, "tutor_email")

    def get_tutor_telefono(self, obj):
        return self._get_student_field(obj, "tutor_telefono")


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

        if role in {"jefe_comision", "ingreso_provincial"} and not province:
            raise serializers.ValidationError(
                "Este rol debe tener una provincia asignada."
            )
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

        scoped_roles = {
            "jefe_comision": ("provincia", province, "Esta provincia ya tiene un jefe de comisión."),
            "ingreso_provincial": ("provincia", province, "Esta provincia ya tiene un representante provincial."),
            "ingreso_municipal": ("municipio", municipality, "Este municipio ya tiene un representante municipal."),
            "director_escuela": ("escuela", school, "Esta escuela ya tiene un director."),
            "secretario_escuela": ("escuela", school, "Esta escuela ya tiene un secretario."),
        }
        scope_field, scope_value, duplicate_message = scoped_roles.get(role, (None, None, None))
        if scope_value:
            duplicate_users = Usuario.objects.filter(rol=role, **{f"{scope_field}": scope_value})
            if self.instance:
                duplicate_users = duplicate_users.exclude(pk=self.instance.pk)
            if duplicate_users.exists():
                raise serializers.ValidationError(duplicate_message)
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
    tutor_nombre = serializers.CharField(max_length=200, required=False, allow_blank=True)
    tutor_email = serializers.EmailField(required=False, allow_blank=True)
    tutor_telefono = serializers.CharField(max_length=32, required=False, allow_blank=True)

    def validate_ci(self, value):
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError(
                "El CI debe tener 11 dígitos numéricos.")
        return value

    def validate_username(self, value):
        if Usuario.objects.filter(username=value).exclude(is_active=False, email_verificado=False).exists():
            raise serializers.ValidationError(
                "El nombre de usuario ya está en uso.")
        return value

    def validate_email(self, value):
        return value

    def validate_escuela(self, value):
        if not value.activa:
            raise serializers.ValidationError(
                "La escuela seleccionada no está disponible para el registro.")
        return value

    def validate(self, attrs):
        school = attrs.get("escuela")
        ci = attrs.get("ci")
        entry = EscalafonItem.objects.filter(
            estudiante__ci=ci,
            estudiante__escuela=school,
            escalafon__escuela=school,
            escalafon__proceso__anio__year=timezone.now().year,
            escalafon__proceso__etapa__nombre=ETAPAS_NOMBRES[1],
        ).select_related("estudiante").first()
        if not entry:
            raise serializers.ValidationError(
                "El CI y la escuela no aparecen en el escalafón del año actual."
            )
        pending_user = Usuario.objects.filter(
            username=attrs.get("username"), is_active=False, email_verificado=False
        ).first()
        email_owner = Usuario.objects.filter(email__iexact=attrs.get("email")).first()
        if email_owner and email_owner != pending_user:
            raise serializers.ValidationError("Este correo ya está registrado.")
        if pending_user and pending_user.pending_student_id not in {None, entry.estudiante_id}:
            raise serializers.ValidationError("Ese usuario tiene otro registro pendiente de verificación.")
        if entry.estudiante.usuario_id:
            raise serializers.ValidationError(
                "Este estudiante ya tiene una cuenta registrada."
            )
        attrs["escalafon_entry"] = entry
        return attrs

    def create(self, validated_data):
        entry = validated_data.pop("escalafon_entry")
        escuela = validated_data["escuela"]
        estudiante = entry.estudiante
        with transaction.atomic():
            user = Usuario.objects.filter(
                username=validated_data["username"], is_active=False, email_verificado=False
            ).first()
            if user:
                user.email = validated_data["email"]
                user.set_password(validated_data["password"])
                user.first_name = estudiante.nombre
                user.last_name = estudiante.apellidos
                user.rol = "estudiante"
                user.escuela = escuela
                user.municipio = escuela.municipio
                user.provincia = escuela.municipio.provincia
            else:
                user = Usuario.objects.create_user(
                    username=validated_data["username"], email=validated_data["email"],
                    password=validated_data["password"], first_name=estudiante.nombre,
                    last_name=estudiante.apellidos, rol="estudiante", escuela=escuela,
                    municipio=escuela.municipio, provincia=escuela.municipio.provincia,
                )
            user.is_active = False
            user.email_verificado = False
            user.pending_student = estudiante
            user.save(update_fields=["email", "password", "first_name", "last_name", "rol", "escuela", "municipio", "provincia", "is_active", "email_verificado", "pending_student"])
            code = f"{secrets.randbelow(1000000):06d}"
            EmailVerificationCode.objects.create(
                user=user,
                code=code,
                expires_at=timezone.now() + timedelta(minutes=15),
            )
            send_mail(
                subject="Código de verificación de IngresoSUP",
                message=(
                    f"Tu código de verificación es: {code}\n\n"
                    "Este código vence en 15 minutos."
                ),
                from_email=None,
                recipient_list=[user.email],
                fail_silently=False,
            )

        return user