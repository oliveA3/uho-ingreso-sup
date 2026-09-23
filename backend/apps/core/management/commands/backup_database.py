from django.core.management.base import BaseCommand, CommandError

from apps.core.services.backups import BackupError, create_backup


class Command(BaseCommand):
    help = "Crea una copia de seguridad de la base de datos (con suma SHA-256, copia remota opcional y retención)."

    def handle(self, *args, **options):
        try:
            target = create_backup()
        except BackupError as error:
            raise CommandError(str(error)) from error
        self.stdout.write(self.style.SUCCESS(f"Copia creada: {target}"))
