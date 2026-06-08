from django.db import models


class SuperAdminConfig(models.Model):
    logo_url = models.URLField(blank=True, help_text="URL del logo institucional")
    primary_color = models.CharField(
        max_length=32,
        default="#0ea5e9",
        help_text="Color principal de la interfaz",
    )
    secondary_color = models.CharField(
        max_length=32,
        default="#0284c7",
        help_text="Color secundario",
    )
    accent_color = models.CharField(
        max_length=32,
        default="#14b8a6",
        help_text="Color de acento para botones y alertas",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuración Global Super Administrador"
        verbose_name_plural = "Configuraciones Globales Super Administrador"

    def __str__(self):
        return "Configuración global del panel Super Administrador"
