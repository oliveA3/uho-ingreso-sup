from django.db import models

class Provincia(models.Model):
    nombre = models.CharField(max_length=150, unique=True)
    activa = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class Municipio(models.Model):
    nombre = models.CharField(max_length=128)
    provincia = models.ForeignKey(
        Provincia, on_delete=models.PROTECT, related_name="municipios")
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} ({self.provincia.nombre})"


class Escuela(models.Model):
    nombre = models.CharField(max_length=300)
    codigo = models.CharField(max_length=150, null=True, blank=True)
    descripcion = models.CharField(max_length=150, null=True, blank=True)
    municipio = models.ForeignKey(
        Municipio, on_delete=models.PROTECT, related_name="escuelas")
    activa = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} ({self.municipio.nombre})"

    class Meta:
        verbose_name = "Preuniversitario"
        verbose_name_plural = "Preuniversitarios"


class Ces(models.Model):
    nombre = models.CharField(max_length=200)
    activa = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Centro de Educación Superior"
        verbose_name_plural = "Centros de Educación Superior"

    def __str__(self):
        return self.nombre


class Carrera(models.Model):
    codigo = models.CharField(max_length=150, unique=True)
    nombre = models.CharField(max_length=150)
    ces = models.ForeignKey(
        Ces, on_delete=models.PROTECT, related_name="carreras")
    provincia = models.ForeignKey(
        Provincia, on_delete=models.PROTECT, related_name="carreras")
    activa = models.BooleanField(default=True)


class Asignatura(models.Model):
    nombre = models.CharField(max_length=100)
    activa = models.BooleanField(default=True)


class IdentidadVisual(models.Model):
    logo_url = models.TextField(
        blank=True, help_text="URL o imagen codificada del logo institucional")
    nombre_sistema = models.CharField(max_length=100, default="IngresoSUP")
    tipografia = models.CharField(max_length=100, default="Segoe UI")

    color_primario = models.CharField(
        max_length=32,
        default="#1F4E79",
        help_text="Color principal de la interfaz",
    )
    color_secundario = models.CharField(
        max_length=32,
        default="#2E75B6",
        help_text="Color secundario",
    )
    color_acento = models.CharField(
        max_length=32,
        default="#5BA3D9",
        help_text="Color de acento para botones y alertas",
    )
    color_fondo = models.CharField(
        max_length=32,
        default="#D6E4F0",
        help_text="Color de fondo",
    )
    color_exito = models.CharField(
        max_length=32,
        default="#1A7A4A",
        help_text="Color de acciones exitosas",
    )
    color_error = models.CharField(
        max_length=32,
        default="#C0392B",
        help_text="Color de acciones de error",
    )
    fecha_creado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuración Global Super Administrador"
        verbose_name_plural = "Configuraciones Globales Super Administrador"

    def __str__(self):
        return "Configuración global del panel Super Administrador"
