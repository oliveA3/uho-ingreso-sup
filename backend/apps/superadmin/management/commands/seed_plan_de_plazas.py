from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.gestion_provincial.models import ETAPAS_NOMBRES, Etapa, PlanPlaza, Proceso
from apps.superadmin.models import Carrera, Ces, Provincia


class Command(BaseCommand):
    help = "Crea una base de prueba con 20+ carreras y planes de plaza para la provincia activa."

    def handle(self, *args, **options):
        for etapa_id, nombre in ETAPAS_NOMBRES.items():
            Etapa.objects.get_or_create(
                nombre=nombre,
                defaults={"estado": "en_curso" if etapa_id == 3 else "no_iniciada"},
            )

        provincia, _ = Provincia.objects.get_or_create(nombre="Provincia de Prueba")
        ces, _ = Ces.objects.get_or_create(nombre="CES de Prueba")

        stage = Etapa.objects.filter(nombre=ETAPAS_NOMBRES[3]).first()
        if stage is None:
            self.stdout.write(self.style.ERROR("No se encontró la etapa de planes de plazas."))
            return

        proceso, created = Proceso.objects.get_or_create(
            anio=timezone.now().date().replace(month=1, day=1),
            etapa=stage,
        )

        count_carreras = 0
        for idx in range(1, 31):
            codigo = f"CPP-{idx:03d}"
            carrera, carrera_created = Carrera.objects.get_or_create(
                codigo=codigo,
                defaults={
                    "nombre": f"Carrera de Prueba {idx}",
                    "ces": ces,
                    "provincia": provincia,
                    "activa": True,
                },
            )
            if carrera_created:
                count_carreras += 1

        total_planes = 0
        for idx, carrera in enumerate(Carrera.objects.filter(activa=True).order_by("codigo")[:30], start=1):
            sexo = "A" if idx % 3 == 0 else "F" if idx % 2 == 0 else "M"
            cantidad = 8 + (idx % 7)
            tipo = "municipal" if idx % 2 == 0 else "provincial"
            _, created = PlanPlaza.objects.get_or_create(
                proceso=proceso,
                carrera=carrera,
                sexo=sexo,
                defaults={
                    "cantidad_plazas": cantidad,
                    "otorgamiento_tipo": tipo,
                    "ces": ces,
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
