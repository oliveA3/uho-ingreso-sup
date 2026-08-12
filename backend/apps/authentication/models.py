from django.db import models
from django.contrib.auth.models import AbstractUser
from phonenumber_field.modelfields import PhoneNumberField

from apps.superadmin.models import Provincia, Municipio, Escuela

ROLES = [
    ('superadmin', 'Super Administrador'),
    ('jefe_comision', 'Jefe de Comisión de Ingreso'),
    ('ingreso_provincial', 'Repr. Ingreso Provincial'),
    ('ingreso_municipal', 'Repr. Ingreso Municipal'),
    ('director_escuela', 'Director de Escuela'),
    ('secretario_escuela', 'Secretaario de Escuela'),
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


class Estudiante(models.Model):
    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='estudiante')

    ci = models.CharField(unique=True, max_length=11)
    nombre = models.CharField(max_length=150)
    apellidos = models.CharField(max_length=200)
    sexo = models.CharField(max_length=1, choices=[
                            ("M", "Masculino"), ("F", "Femenino")])
    direccion = models.CharField(max_length=500)
    escuela = models.ForeignKey(
        Escuela, on_delete=models.PROTECT, related_name='estudiantes')
    whatsapp = PhoneNumberField(region='CU')

    indice_10 = models.FloatField()
    indice_11 = models.FloatField()
    indice_12 = models.FloatField()
    indice_general = models.FloatField()

    tutor_nombre = models.CharField(max_length=200, null=True, blank=True)
    tutor_email = models.EmailField(null=True, blank=True)
    # tutor_telefono = whatsapp = models.PhoneNumberField(region='CU')


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
