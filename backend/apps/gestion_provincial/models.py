from django.core.exceptions import ValidationError
from django.db import models

from apps.superadmin.models import Carrera, Ces, Provincia
from apps.authentication.models import Estudiante


ETAPAS_NOMBRES = {
    1: 'Publicación y validación del escalafón.',
    2: 'Llenado de boleta de interés.',
    3: 'Plan de plazas y boleta de solicitud.',
    4: 'Confirmación de las pruebas de ingreso.',
    5: 'Publicación de resultados en las pruebas de ingreso.',
    6: 'Otorgamiento de carreras.',
}


class Etapa(models.Model):
    ESTADOS = [
        ('no_iniciada', 'No iniciada'),
        ('en_curso', 'En curso'),
        ('completada', 'Completada'),
    ]

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
    TIPOS_OTORGAMIENTO = [
        ("municipal", "Municipal"),
        ("provincial", "Provincial"),
    ]
    proceso = models.ForeignKey(
        Proceso, on_delete=models.PROTECT, related_name='plan_plaza')
    carrera = models.ForeignKey(
        Carrera, on_delete=models.PROTECT, related_name='plan_plaza')
    cantidad_plazas = models.PositiveIntegerField()
    otorgamiento_tipo = models.CharField(max_length=32, choices=TIPOS_OTORGAMIENTO)
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
