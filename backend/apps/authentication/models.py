from django.db import models
from django.contrib.auth.models import AbstractUser

class Rol(models.Model):
    nombre = models.CharField(max_length=64, unique=True)
    description = models.TextField()
    nivel = models.PositiveSmallIntegerField()

    def __str__(self):
        return self.name

class RolPermiso(models.Model):
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, related_name="permisos")
    permiso = models.CharField(max_length=100)
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

class Usuario(AbstractUser):
    email = models.EmailField(unique=True)
    rol = models.ForeignKey(Rol, on_delete=models.SET_NULL, null=True, blank=True)
    activo = models.BooleanField(default=True)
    email_verificado = models.BooleanField(default=False)

    def __str__(self):
        return self.username
