from django.db import models


class Reporte(models.Model):
    ALCANCE_CHOICES = [
        ("global", "Global"),
        ("provincial", "Provincial"),
        ("municipal", "Municipal"),
        ("escuela", "Escuela"),
        ("personal", "Personal"),
    ]

    nombre = models.CharField(max_length=192)
    descripcion = models.TextField(blank=True)
    alcance = models.CharField(max_length=16, choices=ALCANCE_CHOICES, default="global")
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Reporte"
        verbose_name_plural = "Reportes"

    def __str__(self):
        return self.nombre
