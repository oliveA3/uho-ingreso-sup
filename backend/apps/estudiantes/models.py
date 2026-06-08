from django.db import models


class Estudiante(models.Model):
    SEXO_CHOICES = [("M", "Masculino"), ("F", "Femenino"), ("O", "Otro")]

    ci = models.CharField(max_length=11, unique=True)
    nombre = models.CharField(max_length=120)
    apellidos = models.CharField(max_length=120)
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES)
    direccion = models.TextField(blank=True)
    escuela = models.ForeignKey(
        "escuelas.Escuela",
        on_delete=models.PROTECT,
        related_name="estudiantes",
    )
    indice_10 = models.PositiveIntegerField(null=True, blank=True)
    indice_11 = models.PositiveIntegerField(null=True, blank=True)
    indice_12 = models.PositiveIntegerField(null=True, blank=True)
    indice_general = models.PositiveIntegerField(null=True, blank=True)
    usuario = models.OneToOneField(
        "authentication.Usuario",
        on_delete=models.SET_NULL,
        related_name="estudiante",
        null=True,
        blank=True,
    )
    whatsapp = models.CharField(max_length=32, blank=True)
    tutor_nombre = models.CharField(max_length=120, blank=True)
    tutor_correo = models.EmailField(blank=True)
    tutor_telefono = models.CharField(max_length=32, blank=True)

    class Meta:
        verbose_name = "Estudiante"
        verbose_name_plural = "Estudiantes"

    def __str__(self):
        return f"{self.nombre} {self.apellidos} ({self.ci})"


class BoletaInteres(models.Model):
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name="boletas_interes")
    proceso = models.ForeignKey("proceso.Proceso", on_delete=models.CASCADE, related_name="boletas_interes")
    enviada = models.BooleanField(default=False)
    fecha_envio = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Boleta de Interés"
        verbose_name_plural = "Boletas de Interés"

    def __str__(self):
        return f"Boleta {self.pk} - {self.estudiante}"


class BoletaInteresItem(models.Model):
    boleta = models.ForeignKey(BoletaInteres, on_delete=models.CASCADE, related_name="items")
    carrera = models.ForeignKey("carreras.Carrera", on_delete=models.PROTECT)
    prioridad = models.PositiveSmallIntegerField()

    class Meta:
        verbose_name = "Item de Boleta de Interés"
        verbose_name_plural = "Items de Boleta de Interés"
        unique_together = ("boleta", "prioridad")

    def __str__(self):
        return f"{self.carrera} - prioridad {self.prioridad}"


class BoletaSolicitud(models.Model):
    ESTADO_CHOICES = [
        ("borrador", "Borrador"),
        ("enviado", "Enviado"),
        ("rechazado", "Rechazado"),
        ("aprobado", "Aprobado"),
    ]

    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name="boletas_solicitud")
    proceso = models.ForeignKey("proceso.Proceso", on_delete=models.CASCADE, related_name="boletas_solicitud")
    estado = models.CharField(max_length=16, choices=ESTADO_CHOICES, default="borrador")
    fecha_envio = models.DateTimeField(null=True, blank=True)
    aprobada_por = models.ForeignKey(
        "authentication.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="solicitudes_aprobadas",
    )
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Boleta de Solicitud"
        verbose_name_plural = "Boletas de Solicitud"

    def __str__(self):
        return f"Solicitud {self.pk} - {self.estudiante}"


class SolicitudItem(models.Model):
    boleta = models.ForeignKey(BoletaSolicitud, on_delete=models.CASCADE, related_name="items")
    plan_plaza = models.ForeignKey("carreras.PlanPlaza", on_delete=models.PROTECT)
    prioridad = models.PositiveSmallIntegerField()

    class Meta:
        verbose_name = "Item de Solicitud"
        verbose_name_plural = "Items de Solicitud"
        unique_together = ("boleta", "prioridad")

    def __str__(self):
        return f"{self.plan_plaza} - prioridad {self.prioridad}"


class ConfirmacionPrueba(models.Model):
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name="confirmaciones_prueba")
    proceso = models.ForeignKey("proceso.Proceso", on_delete=models.CASCADE, related_name="confirmaciones_prueba")
    asignatura = models.CharField(max_length=128)
    confirmo = models.BooleanField(null=True, blank=True)
    fecha = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Confirmación de Prueba"
        verbose_name_plural = "Confirmaciones de Prueba"

    def __str__(self):
        return f"Confirmación {self.asignatura} - {self.estudiante}"


class ResultadoExamen(models.Model):
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name="resultados_examen")
    proceso = models.ForeignKey("proceso.Proceso", on_delete=models.CASCADE, related_name="resultados_examen")
    asignatura = models.CharField(max_length=128)
    nota = models.DecimalField(max_digits=5, decimal_places=2)
    fecha_limite_reclamo = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Resultado de Examen"
        verbose_name_plural = "Resultados de Examen"

    def __str__(self):
        return f"{self.asignatura} - {self.estudiante}"


class Reclamacion(models.Model):
    ESTADO_RECLAMACION = [
        ("pendiente", "Pendiente"),
        ("aceptada", "Aceptada"),
        ("rechazada", "Rechazada"),
    ]

    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name="reclamaciones")
    resultado = models.ForeignKey(ResultadoExamen, on_delete=models.CASCADE, related_name="reclamaciones")
    estado = models.CharField(max_length=16, choices=ESTADO_RECLAMACION, default="pendiente")
    descripcion = models.TextField(blank=True)
    respuesta = models.TextField(blank=True)
    fecha_solicitud = models.DateField(null=True, blank=True)
    fecha_respuesta = models.DateField(null=True, blank=True)
    lugar_presentacion = models.CharField(max_length=192, blank=True)
    fecha_presentacion = models.DateField(null=True, blank=True)
    hora_presentacion = models.TimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Reclamación"
        verbose_name_plural = "Reclamaciones"

    def __str__(self):
        return f"Reclamación {self.pk} - {self.estudiante}"


class Otorgamiento(models.Model):
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name="otorgamientos")
    proceso = models.ForeignKey("proceso.Proceso", on_delete=models.CASCADE, related_name="otorgamientos")
    carrera = models.ForeignKey("carreras.Carrera", on_delete=models.PROTECT, related_name="otorgamientos")
    indice_otorgamiento = models.PositiveIntegerField()

    class Meta:
        verbose_name = "Otorgamiento"
        verbose_name_plural = "Otorgamientos"

    def __str__(self):
        return f"Otorgamiento {self.estudiante} - {self.carrera}"
