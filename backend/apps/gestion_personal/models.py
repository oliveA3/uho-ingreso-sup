from django.db import models

from apps.authentication.models import Estudiante
from apps.superadmin.models import Carrera, Asignatura
from apps.gestion_provincial.models import Proceso, PlanPlaza


class BoletaInteres(models.Model):
    estudiante = models.ForeignKey(
        Estudiante, on_delete=models.CASCADE, related_name="boleta_interes")
    proceso = models.ForeignKey(
        Proceso, on_delete=models.PROTECT, related_name='boleta_interes')
    enviada = models.BooleanField(default=False)
    fecha_enviada = models.DateField(null=True, blank=True)


class BoletaInteresItem(models.Model):
    boleta_interes = models.ForeignKey(
        BoletaInteres, on_delete=models.CASCADE, related_name="boleta_interes")
    carrera = models.ForeignKey(
        Carrera, on_delete=models.CASCADE, related_name="boleta_interes")
    prioridad = models.PositiveSmallIntegerField()  # 1 - 10


class BoletaSolicitud(models.Model):
    estudiante = models.ForeignKey(
        Estudiante, on_delete=models.CASCADE, related_name="boleta_solicitud")
    proceso = models.ForeignKey(
        Proceso, on_delete=models.PROTECT, related_name='boleta_solicitud')

    ESTADOS = [('por_enviar', 'Por enviar'),
               ('por_aprobar', 'Por aprobar'),
               ('aprobada', 'Aprobada')]
    estado = models.CharField(max_length=100, choices=ESTADOS, default='por_enviar')
    fecha_enviada = models.DateField(null=True, blank=True)
    aprobada_por = models.CharField(max_length=150, null=True, blank=True)
    fecha_aprobada = models.DateField(null=True, blank=True)


class BoletaSolicitudItem(models.Model):
    boleta_solicitud = models.ForeignKey(
        BoletaSolicitud, on_delete=models.CASCADE, related_name="boleta_solicitud")
    plan_plaza = models.ForeignKey(
        PlanPlaza, on_delete=models.CASCADE, related_name="boleta_solicitud")
    prioridad = models.PositiveSmallIntegerField()  # 1 - 10


class ConfirmacionPrueba(models.Model):
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE)
    proceso = models.ForeignKey(
        Proceso, on_delete=models.PROTECT, related_name='confirmacion_prueba')
    asignatura = models.ForeignKey(Asignatura, on_delete=models.PROTECT)
    confirmada = models.BooleanField(null=True, blank=True)
    fecha_prueba = models.DateTimeField()


class ResultadoExamen(models.Model):
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE)
    proceso = models.ForeignKey(
        Proceso, on_delete=models.PROTECT, related_name='resultado_examen')
    asignatura = models.ForeignKey(Asignatura, on_delete=models.PROTECT)
    nota = models.FloatField()
    fecha_limite_reclamo = models.DateField()


class Reclamacion(models.Model):
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE)
    resultado = models.ForeignKey(
        ResultadoExamen, on_delete=models.CASCADE, related_name='reclamacion')
    descripcion = models.CharField(max_length=500)

    ESTADOS = [('pendiente', 'Pendiente'),
               ('aprobada', 'Aprobada'),
               ('rechazada', 'Rechazada')]
    estado = models.CharField(max_length=100, choices=ESTADOS, default='pendiente')

    fecha_solicitud = models.DateField(auto_now_add=True)
    fecha_respuesta = models.DateField(null=True, blank=True)
    lugar_presentacion = models.CharField(
        max_length=150, null=True, blank=True)
    fecha_presentacion = models.DateTimeField(null=True, blank=True)
