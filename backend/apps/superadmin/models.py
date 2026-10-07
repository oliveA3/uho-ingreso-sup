from django.db import models
import unicodedata


def normalize_territorial_name(value):
    decomposed = unicodedata.normalize("NFKD", value or "").casefold()
    without_marks = "".join(
        character for character in decomposed
        if unicodedata.category(character) != "Mn"
    )
    return " ".join(without_marks.split())


class NormalizedTerritorialNameMixin:
    def save(self, *args, **kwargs):
        self.nombre_normalizado = normalize_territorial_name(self.nombre)
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            kwargs["update_fields"] = set(update_fields) | {"nombre_normalizado"}
        return super().save(*args, **kwargs)


class Provincia(NormalizedTerritorialNameMixin, models.Model):
    nombre = models.CharField(max_length=150, unique=True)
    nombre_normalizado = models.CharField(max_length=150, default="", editable=False)
    descripcion = models.TextField(blank=True, null=True)
    activa = models.BooleanField(default=True)
    fecha_ultima_modificacion = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["nombre_normalizado"],
                name="unique_provincia_nombre_normalizado",
            ),
        ]

    def __str__(self):
        return self.nombre


class Municipio(NormalizedTerritorialNameMixin, models.Model):
    nombre = models.CharField(max_length=128)
    nombre_normalizado = models.CharField(max_length=128, default="", editable=False)
    descripcion = models.TextField(blank=True, null=True)
    provincia = models.ForeignKey(
        Provincia, on_delete=models.PROTECT, related_name="municipios")
    activo = models.BooleanField(default=True)
    fecha_ultima_modificacion = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provincia", "nombre_normalizado"],
                name="unique_municipio_nombre_provincia_normalizado",
            ),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.provincia.nombre})"


class Escuela(NormalizedTerritorialNameMixin, models.Model):
    nombre = models.CharField(max_length=300)
    nombre_normalizado = models.CharField(max_length=300, default="", editable=False)
    codigo = models.CharField(max_length=150, null=True, blank=True)
    descripcion = models.CharField(max_length=150, null=True, blank=True)
    municipio = models.ForeignKey(
        Municipio, on_delete=models.PROTECT, related_name="escuelas")
    activa = models.BooleanField(default=True)
    fecha_ultima_modificacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nombre} ({self.municipio.nombre})"

    class Meta:
        verbose_name = "Preuniversitario"
        verbose_name_plural = "Preuniversitarios"
        constraints = [
            models.UniqueConstraint(
                fields=["municipio", "nombre_normalizado"],
                name="unique_escuela_nombre_municipio_normalizado",
            ),
        ]


class Ces(models.Model):
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    sede_principal = models.CharField(max_length=200, blank=True, default="")
    sitio_web = models.URLField(max_length=300, blank=True, default="")
    activa = models.BooleanField(default=True)
    fecha_ultima_modificacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Centro de Educación Superior"
        verbose_name_plural = "Centros de Educación Superior"

    def __str__(self):
        return self.nombre


class Carrera(models.Model):
    codigo = models.CharField(max_length=150, unique=True)
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    campo_laboral = models.TextField(blank=True, default="")
    requisitos = models.TextField(blank=True, default="")
    perfil_egresado = models.TextField(blank=True, default="")
    ces = models.ForeignKey(
        Ces, on_delete=models.PROTECT, related_name="carreras")
    provincia = models.ForeignKey(
        Provincia, on_delete=models.PROTECT, related_name="carreras")
    activa = models.BooleanField(default=True)
    fecha_ultima_modificacion = models.DateTimeField(auto_now=True)


class Asignatura(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    activa = models.BooleanField(default=True)
    fecha_ultima_modificacion = models.DateTimeField(auto_now=True)


class TipoOtorgamiento(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    activa = models.BooleanField(default=True)
    fecha_ultima_modificacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tipo de Otorgamiento"
        verbose_name_plural = "Tipos de Otorgamiento"

    def __str__(self):
        return self.nombre


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
