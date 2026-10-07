from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, PlanPlaza, Proceso
from apps.superadmin.models import Carrera, Ces, Provincia, TipoOtorgamiento, normalize_territorial_name


DEMO_CAREERS = (
    "Medicina", "Estomatología", "Enfermería", "Ingeniería Informática",
    "Ingeniería Civil", "Ingeniería Industrial", "Ingeniería Mecánica",
    "Ingeniería Eléctrica", "Ingeniería Química", "Arquitectura", "Derecho",
    "Psicología", "Contabilidad y Finanzas", "Economía", "Turismo",
    "Educación Primaria", "Educación Especial", "Educación Preescolar",
    "Lengua Inglesa", "Historia", "Geografía", "Física", "Matemática",
    "Química", "Biología", "Agronomía", "Medicina Veterinaria",
    "Cultura Física", "Periodismo", "Comunicación Social",
)


class Command(BaseCommand):
    help = "Crea carreras y planes de prueba vinculados a Holguín y a un CES existente."

    @transaction.atomic
    def handle(self, *args, **options):
        province_key = normalize_territorial_name("Holguín")
        provincia = Provincia.objects.filter(
            nombre_normalizado=province_key,
            activa=True,
        ).first()
        if not provincia:
            raise CommandError(
                "Primero carga la semilla territorial; no se creó una provincia ficticia."
            )

        ces = next(
            (
                item for item in Ces.objects.filter(activa=True).order_by("pk")
                if normalize_territorial_name(item.nombre)
                == normalize_territorial_name("Universidad de Holguín")
            ),
            None,
        )
        if not ces:
            raise CommandError(
                "No existe un CES activo Universidad de Holguín; carga primero la semilla inicial."
            )

        today = timezone.localdate()
        for etapa_id, nombre in ETAPAS_NOMBRES.items():
            etapa, _ = Etapa.objects.get_or_create(
                nombre=nombre,
                defaults={
                    "estado": "en_curso" if etapa_id == 3 else "no_iniciada",
                    "fecha_inicio": today if etapa_id == 3 else None,
                    "fecha_fin": today + timedelta(days=30) if etapa_id == 3 else None,
                },
            )
            if etapa_id == 3 and etapa.estado != "en_curso":
                etapa.estado = "en_curso"
            if etapa_id == 3:
                etapa.fecha_inicio = today
                etapa.fecha_fin = today + timedelta(days=30)
                etapa.save(update_fields=["estado", "fecha_inicio", "fecha_fin"])

        stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[3]).first()
        if stage is None:
            self.stdout.write(self.style.ERROR("No se encontró la etapa de planes de plazas."))
            return

        proceso, created = Proceso.objects.get_or_create(
            anio=timezone.now().date().replace(month=1, day=1),
            etapa=stage,
        )

        count_carreras = 0
        demo_career_ids = []
        careers_by_name = {
            normalize_territorial_name(carrera.nombre): carrera
            for carrera in Carrera.objects.filter(provincia=provincia, activa=True).select_related("ces")
        }
        for idx, career_name in enumerate(DEMO_CAREERS, start=1):
            normalized_name = normalize_territorial_name(career_name)
            if normalized_name in careers_by_name:
                demo_career_ids.append(careers_by_name[normalized_name].pk)
                continue
            codigo = f"CPP-{idx:03d}"
            carrera, carrera_created = Carrera.objects.get_or_create(
                codigo=codigo,
                defaults={
                    "nombre": career_name,
                    "ces": ces,
                    "provincia": provincia,
                    "activa": True,
                },
            )
            if carrera_created:
                count_carreras += 1
            elif carrera.provincia_id != provincia.id or carrera.ces_id != ces.id:
                carrera.provincia = provincia
                carrera.ces = ces
                carrera.nombre = career_name
                carrera.activa = True
                carrera.save(update_fields=["provincia", "ces", "nombre", "activa"])
            careers_by_name[normalized_name] = carrera
            demo_career_ids.append(carrera.pk)

        tipo_municipal, _ = TipoOtorgamiento.objects.get_or_create(nombre="Municipal")
        tipo_provincial, _ = TipoOtorgamiento.objects.get_or_create(nombre="Provincial")

        total_planes = 0
        for idx, carrera in enumerate(
            Carrera.objects.filter(
                activa=True,
                provincia=provincia,
                pk__in=demo_career_ids,
            ).select_related("ces").order_by("codigo")[:30],
            start=1,
        ):
            sexo = "A" if idx % 3 == 0 else "F" if idx % 2 == 0 else "M"
            cantidad = 8 + (idx % 7)
            tipo = tipo_municipal if idx % 2 == 0 else tipo_provincial
            _, created = PlanPlaza.objects.get_or_create(
                proceso=proceso,
                carrera=carrera,
                sexo=sexo,
                defaults={
                    "cantidad_plazas": cantidad,
                    "otorgamiento_tipo": tipo,
                    "ces": carrera.ces,
                    "provincia": provincia,
                },
            )
            if created:
                total_planes += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Datos de prueba creados: {Carrera.objects.count()} carreras y {PlanPlaza.objects.filter(proceso=proceso).count()} planes de plaza."
            )
        )
