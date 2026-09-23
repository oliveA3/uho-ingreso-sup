from django.core.management.base import BaseCommand, CommandError

from apps.core.services.backups import BackupError, verify_backup


class Command(BaseCommand):
    help = "Verifica una copia de seguridad restaurándola en una base temporal (por defecto, la más reciente)."

    def add_arguments(self, parser):
        parser.add_argument("path", nargs="?", help="Ruta de la copia a verificar (opcional).")

    def handle(self, *args, **options):
        try:
            counts = verify_backup(options.get("path"))
        except BackupError as error:
            raise CommandError(str(error)) from error
        self.stdout.write(self.style.SUCCESS("Restauración verificada. Filas por tabla:"))
        for table, total in counts.items():
            self.stdout.write(f"  {table}: {total}")
