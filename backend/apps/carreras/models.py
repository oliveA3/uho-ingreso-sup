from django.db import models


class Carrera(models.Model):
    codigo = models.CharField(max_length=64, unique=True)
    nombre = models.CharField(max_length=192)
    ces = models.ForeignKey(
        "nomencladores.Ces",
        on_delete=models.PROTECT,
        related_name="carreras",
    )
    provincia = models.ForeignKey(
        "nomencladores.Provincia",
        on_delete=models.PROTECT,
        related_name="carreras",
    )
    activa = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Carrera"
        verbose_name_plural = "Carreras"

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class PlanPlaza(models.Model):
    SEXO_CHOICES = [
        ("M", "Masculino"),
        ("F", "Femenino"),
        ("A", "Ambos"),
    ]

    proceso = models.ForeignKey(
        "proceso.Proceso",
        on_delete=models.CASCADE,
        related_name="plan_plazas",
    )
    carrera = models.ForeignKey(Carrera, on_delete=models.PROTECT, related_name="plan_plazas")
    cantidad_plazas = models.PositiveIntegerField()
    tipo_otorgamiento = models.ForeignKey(
        "nomencladores.OtorgamientoTipo",
        on_delete=models.PROTECT,
        related_name="plan_plazas",
    )
    ces = models.ForeignKey(
        "nomencladores.Ces",
        on_delete=models.PROTECT,
        related_name="plan_plazas_ces",
    )
    provincia = models.ForeignKey(
        "nomencladores.Provincia",
        on_delete=models.PROTECT,
        related_name="plan_plazas_provincia",
    )
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES, default="A")

    class Meta:
        verbose_name = "Plan de Plaza"
        verbose_name_plural = "Planes de Plazas"
        unique_together = ("proceso", "carrera", "tipo_otorgamiento", "sexo")

    def __str__(self):
        return f"{self.carrera} ({self.proceso.anio})"


class CorteCarrera(models.Model):
    proceso = models.ForeignKey(
        "proceso.Proceso",
        on_delete=models.CASCADE,
        related_name="cortes_carrera",
    )
    carrera = models.ForeignKey(Carrera, on_delete=models.PROTECT, related_name="cortes")
    indice_corte = models.PositiveIntegerField()

    class Meta:
        verbose_name = "Corte de Carrera"
        verbose_name_plural = "Cortes de Carrera"
        unique_together = ("proceso", "carrera")

    def __str__(self):
        return f"{self.carrera} - {self.proceso.anio}"
