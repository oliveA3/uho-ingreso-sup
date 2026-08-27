from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator

from apps.gestion_provincial.models import Proceso
from apps.authentication.models import Estudiante
from apps.superadmin.models import Escuela


class Escalafon(models.Model):
    ESTADOS = [
        ("pendiente", "Pendiente"),
        ("enviado", "Enviado"),
    ]
    proceso = models.ForeignKey(
        Proceso, on_delete=models.CASCADE, related_name="escalafones")
    escuela = models.ForeignKey(
        Escuela, on_delete=models.PROTECT, related_name="escalafones")
    fecha_publicacion = models.DateField(auto_now_add=True)
    estado = models.CharField(
        max_length=20, choices=ESTADOS, default="pendiente")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["proceso", "escuela"], name="unique_escalafon_proceso_escuela"),
        ]
        indexes = [
            models.Index(fields=["proceso", "escuela"]),
        ]
        ordering = ["-proceso", "-fecha_publicacion"]

    def __str__(self):
        return f"Escalafón {self.proceso.anio} - {self.escuela}"


class EscalafonItem(models.Model):
    ESTADOS = [
        ("aceptado", "Aceptado"),
        ("sin_respuesta", "Sin respuesta"),
        ("por_revisar", "Por revisar"),
    ]
    escalafon = models.ForeignKey(
        Escalafon, on_delete=models.CASCADE, related_name="estudiantes")
    estudiante = models.ForeignKey(
        Estudiante, on_delete=models.PROTECT, related_name="escalafones")
    indice_10 = models.DecimalField(max_digits=5, decimal_places=2, validators=[
                                    MinValueValidator(0), MaxValueValidator(100)])
    indice_11 = models.DecimalField(max_digits=5, decimal_places=2, validators=[
                                    MinValueValidator(0), MaxValueValidator(100)])
    indice_12 = models.DecimalField(max_digits=5, decimal_places=2, validators=[
                                    MinValueValidator(0), MaxValueValidator(100)])
    indice_general = models.DecimalField(max_digits=5, decimal_places=2, validators=[
                                         MinValueValidator(0), MaxValueValidator(100)])
    indices_bloqueados = models.BooleanField(default=False)
    estado = models.CharField(
        max_length=20, choices=ESTADOS, default="sin_respuesta")
    causa_revision = models.TextField(blank=True)
    fecha_revision = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["escalafon", "estudiante"], name="unique_estudiante_en_escalafon"),
        ]

    def __str__(self):
        return f"{self.estudiante.ci} - {self.escalafon.proceso.anio.year}"
