from pathlib import Path

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.superadmin.models import Carrera, Ces, Provincia, TipoOtorgamiento
from apps.authentication.models import Estudiante


ETAPAS_NOMBRES = {
    1: 'Publicación y validación del escalafón.',
    2: 'Llenado de boleta de interés.',
    3: 'Plan de plazas y boleta de solicitud.',
    4: 'Confirmación de las pruebas de ingreso.',
    5: 'Publicación de resultados en las pruebas de ingreso.',
    6: 'Otorgamiento de carreras.',
}

NEWS_MEDIA_EXTENSIONS = {
    "jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "ogg",
    "pdf", "doc", "docx", "xls", "xlsx",
}
NEWS_COVER_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
NEWS_MAX_UPLOAD_BYTES = 25 * 1024 * 1024
NEWS_FILE_SIGNATURES = {
    "jpg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
    "webp": lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
    "gif": lambda data: data.startswith((b"GIF87a", b"GIF89a")),
    "mp4": lambda data: len(data) >= 8 and data[4:8] == b"ftyp",
    "webm": lambda data: data.startswith(b"\x1a\x45\xdf\xa3"),
    "ogg": lambda data: data.startswith(b"OggS"),
    "pdf": lambda data: data.startswith(b"%PDF-"),
    "doc": lambda data: data.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"),
    "xls": lambda data: data.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"),
    "docx": lambda data: data.startswith(b"PK\x03\x04"),
    "xlsx": lambda data: data.startswith(b"PK\x03\x04"),
}


def _has_expected_signature(upload, extension):
    position = upload.tell()
    try:
        header = upload.read(16)
    finally:
        upload.seek(position)
    return NEWS_FILE_SIGNATURES[extension](header)


def validate_news_upload(upload):
    extension = Path(upload.name).suffix.lower().lstrip(".")
    if extension not in NEWS_MEDIA_EXTENSIONS:
        raise ValidationError("Usa una imagen, video, PDF, Word o Excel compatible.")
    if upload.size <= 0 or upload.size > NEWS_MAX_UPLOAD_BYTES:
        raise ValidationError("El archivo debe pesar menos de 25 MB y no puede estar vacío.")
    if not _has_expected_signature(upload, extension):
        raise ValidationError("El contenido del archivo no coincide con su extensión.")


def validate_news_cover(upload):
    extension = Path(upload.name).suffix.lower().lstrip(".")
    if extension not in NEWS_COVER_EXTENSIONS:
        raise ValidationError("La portada debe ser una imagen JPG, PNG, WebP o GIF.")
    if upload.size <= 0 or upload.size > 5 * 1024 * 1024:
        raise ValidationError("La portada debe pesar menos de 5 MB y no puede estar vacía.")
    if not _has_expected_signature(upload, extension):
        raise ValidationError("El contenido de la portada no coincide con su extensión.")


def news_upload_path(instance, filename):
    province_id = instance.provincia_id or "sin-provincia"
    return f"noticias/{province_id}/{timezone.localdate():%Y/%m}/{Path(filename).name}"


class Noticia(models.Model):
    provincia = models.ForeignKey(Provincia, on_delete=models.CASCADE, related_name="noticias")
    titulo = models.CharField(max_length=200)
    contenido = models.TextField()
    multimedia = models.FileField(upload_to=news_upload_path, blank=True, validators=[validate_news_upload])
    imagen_portada = models.FileField(upload_to=news_upload_path, blank=True, validators=[validate_news_cover])
    fecha_expiracion = models.DateField(null=True, blank=True)
    permanente = models.BooleanField(default=False)
    url_externa = models.URLField(max_length=500, blank=True)
    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-creada_en", "-id"]

    def __str__(self):
        return self.titulo

    def delete(self, *args, **kwargs):
        stored_files = [
            (self._meta.get_field(field_name).storage, getattr(self, field_name).name)
            for field_name in ("multimedia", "imagen_portada")
            if getattr(self, field_name).name
        ]
        result = super().delete(*args, **kwargs)
        for storage, name in stored_files:
            storage.delete(name)
        return result


class EtapaQuerySet(models.QuerySet):
    def en_curso(self):
        return self.filter(estado='en_curso')


class Etapa(models.Model):
    ESTADOS = [
        ('no_iniciada', 'No iniciada'),
        ('en_curso', 'En curso'),
        ('completada', 'Completada'),
    ]

    objects = EtapaQuerySet.as_manager()

    nombre = models.CharField(
        max_length=150,
        choices=[(nombre, nombre) for nombre in ETAPAS_NOMBRES.values()],
        unique=True,
    )
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    fecha_matematica = models.DateField(null=True, blank=True)
    fecha_espanol = models.DateField(null=True, blank=True)
    fecha_historia = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='no_iniciada')

    class Meta:
        ordering = ['id']

    def clean(self):
        if self.nombre not in ETAPAS_NOMBRES.values():
            raise ValidationError(
                {'nombre': 'La etapa no está definida en el proceso de ingreso.'})
        if self.fecha_inicio and self.fecha_fin and self.fecha_inicio > self.fecha_fin:
            raise ValidationError(
                {'fecha_fin': 'La fecha de fin debe ser posterior o igual a la de inicio.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

class Proceso(models.Model):
    anio = models.DateField()
    etapa = models.ForeignKey(
        'Etapa', on_delete=models.PROTECT, related_name='procesos', null=False, blank=False
    )

    config_consulta_nota_publica = models.BooleanField(default=False)
    config_consulta_otorg_publico = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["anio", "etapa"], name="unique_proceso_anio_etapa"),
        ]

    @classmethod
    def get_for_stage_and_year(cls, year, etapa):
        if isinstance(etapa, str):
            etapa_obj = Etapa.objects.filter(nombre=etapa).first()
        elif isinstance(etapa, Etapa):
            etapa_obj = etapa
        else:
            etapa_obj = Etapa.objects.filter(pk=etapa).first()
        if not etapa_obj:
            return None
        return cls.objects.filter(anio__year=year, etapa=etapa_obj).order_by("-id").first()

    def __str__(self):
        return f"Proceso {self.anio.year} — {self.etapa.nombre}"


class PlanPlaza(models.Model):
    proceso = models.ForeignKey(
        Proceso, on_delete=models.PROTECT, related_name='plan_plaza')
    carrera = models.ForeignKey(
        Carrera, on_delete=models.PROTECT, related_name='plan_plaza')
    cantidad_plazas = models.PositiveIntegerField()
    otorgamiento_tipo = models.ForeignKey(
        TipoOtorgamiento, on_delete=models.PROTECT, related_name='plan_plaza')
    ces = models.ForeignKey(
        Ces, on_delete=models.PROTECT, related_name='plan_plaza')
    provincia = models.ForeignKey(
        Provincia, on_delete=models.PROTECT, related_name='plan_plaza')
    sexo = models.CharField(max_length=1, choices=[(
        'A', 'Ambos'), ('F', 'Femenino'), ('M', 'Masculino')])


class Otorgamiento(models.Model):
    estudiante = models.ForeignKey(
        Estudiante, on_delete=models.CASCADE, related_name="otorgamiento")
    proceso = models.ForeignKey(
        Proceso, on_delete=models.PROTECT, related_name='otorgamiento')
    carrera = models.ForeignKey(
        Carrera, on_delete=models.PROTECT, related_name='otorgamiento')
    indice_otorgamiento = models.FloatField()


class CorteCarrera(models.Model):
    proceso = models.ForeignKey(
        Proceso, on_delete=models.PROTECT, related_name='corte_carrera')
    carrera = models.ForeignKey(
        Carrera, on_delete=models.PROTECT, related_name='corte_carrera')
    indice_corte = models.FloatField()
