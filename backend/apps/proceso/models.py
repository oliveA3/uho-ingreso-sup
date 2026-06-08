from django.db import models


class Proceso(models.Model):
    ETAPAS = [(i, f"Etapa {i}") for i in range(1, 7)]

    anio = models.PositiveSmallIntegerField()
    provincia = models.ForeignKey(
        "nomencladores.Provincia",
        on_delete=models.PROTECT,
        related_name="procesos",
    )
    etapa_activa = models.PositiveSmallIntegerField(choices=ETAPAS, null=True, blank=True)
    config_consulta_nota_publica = models.BooleanField(default=False)
    config_consulta_otorg_publica = models.BooleanField(default=False)
    fechas_etapas = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("anio", "provincia")
        verbose_name = "Proceso"
        verbose_name_plural = "Procesos"

    def __str__(self):
        return f"Proceso {self.anio} - {self.provincia.nombre}"
