from django.db import models


class Provincia(models.Model):
    nombre = models.CharField(max_length=128, unique=True)
    activa = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Provincia"
        verbose_name_plural = "Provincias"

    def __str__(self):
        return self.nombre


class Municipio(models.Model):
    nombre = models.CharField(max_length=128)
    provincia = models.ForeignKey(Provincia, on_delete=models.PROTECT, related_name="municipios")
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = ("nombre", "provincia")
        verbose_name = "Municipio"
        verbose_name_plural = "Municipios"

    def __str__(self):
        return f"{self.nombre} ({self.provincia.nombre})"


class Ces(models.Model):
    nombre = models.CharField(max_length=192)
    activa = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Centro de Educación Superior"
        verbose_name_plural = "Centros de Educación Superior"

    def __str__(self):
        return self.nombre


class OtorgamientoTipo(models.Model):
    nombre = models.CharField(max_length=128)
    descripcion = models.TextField(blank=True)

    class Meta:
        verbose_name = "Tipo de Otorgamiento"
        verbose_name_plural = "Tipos de Otorgamiento"

    def __str__(self):
        return self.nombre


class AsignaturaExamen(models.Model):
    nombre = models.CharField(max_length=128)
    codigo = models.CharField(max_length=32, blank=True)

    class Meta:
        verbose_name = "Asignatura de Examen"
        verbose_name_plural = "Asignaturas de Examen"

    def __str__(self):
        return self.nombre
