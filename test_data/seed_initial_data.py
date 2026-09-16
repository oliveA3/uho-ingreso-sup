"""Carga datos territoriales y cuentas demo en una instalación Django nueva.

Ejecutar desde la raíz del repositorio:
    python test_data/seed_initial_data.py
"""

import argparse
import os
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

import django  # noqa: E402
from django.core.management import call_command  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description="Carga la semilla inicial de IngresoSUP.")
    parser.add_argument("--password", help="Contraseña para las cuentas seed.")
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="Actualiza la contraseña de las cuentas seed existentes.",
    )
    args = parser.parse_args()
    django.setup()
    command_options = {"reset_password": args.reset_password}
    if args.password:
        command_options["password"] = args.password
    call_command("seed_initial_data", **command_options)


if __name__ == "__main__":
    main()
