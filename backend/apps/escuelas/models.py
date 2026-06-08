from django.conf import settings
from django.db import models


class Escuela(models.Model):
    nombre = models.CharField(max_length=192)
    codigo = models.CharField(max_length=64, blank=True)
    descripcion = models.TextField(blank=True)
    municipio = models.ForeignKey(
        "nomencladores.Municipio",
        on_delete=models.PROTECT,
        related_name="escuelas",
    )
    activa = models.BooleanField(default=True)
    director = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="escuelas_dirigidas",
        null=True,
        blank=True,
    )
    secretario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="escuelas_secretariadas",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Escuela"
        verbose_name_plural = "Escuelas"

    def __str__(self):
        return self.nombre
