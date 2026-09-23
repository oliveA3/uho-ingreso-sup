from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import NotificationOutbox
from apps.core.tasks import process_notification_batch


class Command(BaseCommand):
    help = "Encola notificaciones pendientes para que las procese Celery."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=500)

    def handle(self, *args, **options):
        entries = list(
            NotificationOutbox.objects.filter(
                estado__in=[NotificationOutbox.PENDING, NotificationOutbox.FAILED],
                disponible_en__lte=timezone.now(),
            ).values_list("id", flat=True)[: options["limit"]]
        )
        if entries:
            process_notification_batch.delay(entries)
        self.stdout.write(self.style.SUCCESS(f"{len(entries)} notificaciones encoladas."))