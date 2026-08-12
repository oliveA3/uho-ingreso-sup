from django.db import models

from apps.superadmin.models import Carrera, Ces, Provincia
from apps.authentication.models import Estudiante


ETAPAS = [
    ('1', 'Publicación y validación del escalafón.'),
    ('2', 'Llenado de boleta de interés.'),
    ('3', 'Plan de plazas y boleta de solicitud.'),
    ('4', 'Confirmación de las pruebas de ingreso.'),
    ('5', 'Publicación de resultados en las pruebas de ingreso..'),
    ('6', 'Otorgamiento de carreras.')
]


class Proceso(models.Model):
    anio = models.DateField()
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()

    etapa = models.CharField(max_length=100, choices=ETAPAS, null=True, blank=True)

    config_consulta_nota_publica = models.BooleanField(default=False)
    config_consulta_otorg_publico = models.BooleanField(default=False)

    @property
    def tiempo_activo(self):
        return f"Desde {fecha_inicio} hasta el {fecha_fin}."


class PlanPlaza(models.Model):
    proceso = models.ForeignKey(
        Proceso, on_delete=models.PROTECT, related_name='plan_plaza')
    carrera = models.ForeignKey(
        Carrera, on_delete=models.PROTECT, related_name='plan_plaza')
    cantidad_plazas = models.PositiveIntegerField()
    # otorgamiento_tipo = models.ForeignKey(OtorgamientoTipo, on_delete=models.PROTECT, related_name='plan_plaza')
    ces = models.ForeignKey(
        Ces, on_delete=models.PROTECT, related_name='plan_plaza')
    provincia = models.ForeignKey(
        Provincia, on_delete=models.PROTECT, related_name='plan_plaza')
    sexo = models.CharField(max_length=1, choices=[('A', 'Ambos'), ('F', 'Femenino'), ('M', 'Masculino')])


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