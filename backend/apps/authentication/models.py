from django.db import models
from django.db.models import Q
from django.contrib.auth.models import AbstractUser
from phonenumber_field.modelfields import PhoneNumberField

from apps.superadmin.models import Provincia, Municipio, Escuela

ROLES = [
    ('superadmin', 'Super Administrador'),
    ('jefe_comision', 'Jefe de Comisión de Ingreso'),
    ('ingreso_provincial', 'Repr. Ingreso Provincial'),
    ('ingreso_municipal', 'Repr. Ingreso Municipal'),
    ('director_escuela', 'Director de Escuela'),
    ('secretario_escuela', 'Secretario de Escuela'),
    ('estudiante', 'Estudiante')
]


class Usuario(AbstractUser):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    email_verificado = models.BooleanField(default=False)
    rol = models.CharField(max_length=150, choices=ROLES, default='estudiante')

    provincia = models.ForeignKey(
        Provincia, on_delete=models.PROTECT, related_name='usuarios', null=True, blank=True)
    municipio = models.ForeignKey(
        Municipio, on_delete=models.PROTECT, related_name='usuarios', null=True, blank=True)
    escuela = models.ForeignKey(
        Escuela, on_delete=models.PROTECT, related_name='usuarios', null=True, blank=True)
    pending_student = models.ForeignKey(
        'Estudiante', on_delete=models.SET_NULL, related_name='pending_users', null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provincia"],
                condition=Q(rol="jefe_comision"),
                name="unique_jefe_comision_provincia",
            ),
            models.UniqueConstraint(
                fields=["provincia"],
                condition=Q(rol="ingreso_provincial"),
                name="unique_repr_provincial_provincia",
            ),
            models.UniqueConstraint(
                fields=["municipio"],
                condition=Q(rol="ingreso_municipal"),
                name="unique_repr_municipal_municipio",
            ),
            models.UniqueConstraint(
                fields=["escuela"],
                condition=Q(rol="director_escuela"),
                name="unique_director_escuela",
            ),
            models.UniqueConstraint(
                fields=["escuela"],
                condition=Q(rol="secretario_escuela"),
                name="unique_secretario_escuela",
            ),
        ]


class EmailVerificationCode(models.Model):
    user = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name="verification_codes"
    )
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class Estudiante(models.Model):
    usuario = models.OneToOneField(
        Usuario, on_delete=models.CASCADE, related_name='estudiante', null=True, blank=True)

    ci = models.CharField(unique=True, max_length=11)
    nombre = models.CharField(max_length=150)
    apellidos = models.CharField(max_length=200)
    sexo = models.CharField(max_length=1, choices=[
                            ("M", "Masculino"), ("F", "Femenino")])
    direccion = models.CharField(max_length=500)
    escuela = models.ForeignKey(
        Escuela, on_delete=models.PROTECT, related_name='estudiantes')
    whatsapp = PhoneNumberField(region='CU', blank=True)

    indice_10 = models.FloatField(null=True, blank=True)
    indice_11 = models.FloatField(null=True, blank=True)
    indice_12 = models.FloatField(null=True, blank=True)
    indice_general = models.FloatField(null=True, blank=True)

    tutor_nombre = models.CharField(max_length=200, null=True, blank=True)
    tutor_email = models.EmailField(null=True, blank=True)
    tutor_telefono = PhoneNumberField(region='CU', null=True, blank=True)


class RolPermiso(models.Model):
    rol = models.CharField(max_length=150, choices=ROLES)
    permiso = models.CharField(max_length=500)
    alcance = models.CharField(
        max_length=20,
        choices=[
            ("global", "Global"),
            ("provincial", "Provincial"),
            ("municipal", "Municipal"),
            ("escuela", "Escuela"),
            ("personal", "Personal"),
        ]
    )

    def __str__(self):
        return f"{self.rol} - {self.permiso}"
