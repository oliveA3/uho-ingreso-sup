from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models


class Role(models.Model):
    name = models.CharField(max_length=64, unique=True)
    description = models.TextField(blank=True)
    level = models.PositiveSmallIntegerField(default=0, help_text="Nivel de jerarquía del rol; mayor valor = más permisos.")
    permissions = models.JSONField(default=list, blank=True, help_text="Lista de permisos asignados al rol.")

    class Meta:
        ordering = ["-level", "name"]
        verbose_name = "Rol"
        verbose_name_plural = "Roles"

    def __str__(self):
        return self.name

    def can_manage(self, other: "Role") -> bool:
        return self.level > other.level


class Province(models.Model):
    name = models.CharField(max_length=128, unique=True)

    class Meta:
        verbose_name = "Provincia"
        verbose_name_plural = "Provincias"

    def __str__(self):
        return self.name


class Municipio(models.Model):
    name = models.CharField(max_length=128)
    province = models.ForeignKey(Province, on_delete=models.PROTECT, related_name="municipios")

    class Meta:
        unique_together = ("name", "province")
        verbose_name = "Municipio"
        verbose_name_plural = "Municipios"

    def __str__(self):
        return f"{self.name} ({self.province})"


class Ces(models.Model):
    name = models.CharField(max_length=192)

    class Meta:
        verbose_name = "Centro de Educación Superior"
        verbose_name_plural = "Centros de Educación Superior"

    def __str__(self):
        return self.name


class OtorgamientoTipo(models.Model):
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Tipo de Otorgamiento"
        verbose_name_plural = "Tipos de Otorgamiento"

    def __str__(self):
        return self.name


class AsignaturaExamen(models.Model):
    name = models.CharField(max_length=128)
    code = models.CharField(max_length=32, blank=True)

    class Meta:
        verbose_name = "Asignatura de Examen"
        verbose_name_plural = "Asignaturas de Examen"

    def __str__(self):
        return self.name


class Carrera(models.Model):
    name = models.CharField(max_length=192)
    description = models.TextField(blank=True)
    ces = models.ForeignKey(Ces, on_delete=models.PROTECT, related_name="carreras")

    class Meta:
        verbose_name = "Carrera"
        verbose_name_plural = "Carreras"

    def __str__(self):
        return self.name


class Escuela(models.Model):
    name = models.CharField(max_length=192)
    municipio = models.ForeignKey(Municipio, on_delete=models.PROTECT, related_name="escuelas")
    director = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        related_name="escuelas_dirigidas",
        null=True,
        blank=True,
    )
    secretario = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        related_name="escuelas_secretariadas",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Escuela"
        verbose_name_plural = "Escuelas"

    def __str__(self):
        return self.name


class User(AbstractUser):
    ci = models.CharField(
        max_length=11,
        unique=True,
        validators=[RegexValidator(r"^\d{11}$", message="El CI debe tener 11 dígitos numéricos.")],
        help_text="Carnet de Identidad cubano de 11 dígitos.",
    )
    nombre = models.CharField(max_length=120)
    apellidos = models.CharField(max_length=120)
    telefono = models.CharField(max_length=32, blank=True)
    rol = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="users")
    municipio = models.ForeignKey(Municipio, on_delete=models.PROTECT, related_name="usuarios", null=True, blank=True)
    escuela = models.ForeignKey(Escuela, on_delete=models.PROTECT, related_name="miembros", null=True, blank=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email", "ci", "nombre", "apellidos"]

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

    def __str__(self):
        return f"{self.nombre} {self.apellidos} ({self.ci})"

    @property
    def rol_nivel(self) -> int:
        return self.rol.level if self.rol else 0

    def puede_gestionar(self, otro_usuario: "User") -> bool:
        if not self.rol or not otro_usuario.rol:
            return False
        return self.rol.level > otro_usuario.rol.level

    def save(self, *args, **kwargs):
        previous_role = None
        if self.pk:
            previous = User.objects.filter(pk=self.pk).first()
            if previous:
                previous_role = previous.rol
        super().save(*args, **kwargs)
        if previous_role and self.rol and previous_role != self.rol:
            AuditLog.objects.create(
                actor=None,
                target_user=self,
                action="Cambio de rol",
                detail=f"Rol cambiado de {previous_role.name} a {self.rol.name}.",
            )

    # Placeholder: aquí se agregarán relaciones con boletas, escalafón y reportes en futuros módulos.


class AuditLog(models.Model):
    actor = models.ForeignKey(
        "User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_actions",
    )
    target_user = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="audit_targets",
    )
    action = models.CharField(max_length=128)
    detail = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Log de Auditoría"
        verbose_name_plural = "Logs de Auditoría"

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {self.action} -> {self.target_user}"
