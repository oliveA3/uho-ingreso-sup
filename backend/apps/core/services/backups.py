"""Copias de seguridad de la base de datos y verificación de su restauración.

Soporta PostgreSQL (producción, con las herramientas pg_dump/pg_restore/createdb/dropdb/psql
del cliente de PostgreSQL) y SQLite (desarrollo). Ninguna orden pasa por un shell: los
argumentos van en lista, por lo que los valores de configuración no pueden inyectar comandos.
"""
import gzip
import hashlib
import logging
import os
import shutil
import sqlite3
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.db import connection

logger = logging.getLogger("backups")

PREFIX = "ingresosup-"
TIMESTAMP_FORMAT = "%Y%m%d-%H%M%S"
VERIFY_TABLES = ("authentication_usuario", "gestion_provincial_etapa", "django_migrations")


class BackupError(Exception):
    """La copia de seguridad o su verificación falló."""


def _config():
    return {
        "dir": Path(getattr(settings, "BACKUP_DIR", settings.BASE_DIR / "backups")),
        "remote": getattr(settings, "BACKUP_REMOTE_DIR", "") or "",
        "daily": int(getattr(settings, "BACKUP_KEEP_DAILY", 7)),
        "weekly": int(getattr(settings, "BACKUP_KEEP_WEEKLY", 4)),
        "monthly": int(getattr(settings, "BACKUP_KEEP_MONTHLY", 12)),
    }


def _db():
    return settings.DATABASES["default"]


def _is_postgres():
    return "postgresql" in _db()["ENGINE"]


def _pg_connection_args():
    db = _db()
    return ["-h", str(db.get("HOST") or "localhost"), "-p", str(db.get("PORT") or "5432"), "-U", str(db["USER"])]


def _pg_env():
    return {**os.environ, "PGPASSWORD": str(_db().get("PASSWORD") or "")}


def _run(command, **kwargs):
    try:
        return subprocess.run(command, check=True, capture_output=True, text=True, **kwargs)
    except FileNotFoundError as error:
        raise BackupError(
            f"No se encontró la herramienta '{command[0]}'. Instala el cliente de PostgreSQL y añádelo al PATH."
        ) from error
    except subprocess.CalledProcessError as error:
        raise BackupError(f"'{command[0]}' falló: {error.stderr.strip()[:500]}") from error


def _sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def backup_timestamp(path):
    """Fecha codificada en el nombre del archivo, o None si no es una copia nuestra."""
    name = Path(path).name
    if not name.startswith(PREFIX):
        return None
    try:
        return datetime.strptime(name[len(PREFIX):].split(".")[0], TIMESTAMP_FORMAT)
    except ValueError:
        return None


def list_backups(directory=None):
    directory = Path(directory or _config()["dir"])
    if not directory.exists():
        return []
    found = [
        (backup_timestamp(p), p)
        for p in directory.iterdir()
        if p.is_file() and not p.name.endswith(".sha256")
    ]
    return [p for stamp, p in sorted((item for item in found if item[0]), key=lambda item: item[0], reverse=True)]


def select_backups_to_keep(paths, daily, weekly, monthly):
    """Retención GFS: las `daily` más recientes, la última de cada semana ISO (`weekly`) y de cada mes (`monthly`)."""
    ordered = sorted(paths, key=backup_timestamp, reverse=True)
    keep = set(ordered[:daily])
    week_key = lambda moment: moment.isocalendar()[:2]
    month_key = lambda moment: (moment.year, moment.month)
    for key_of, limit in ((week_key, weekly), (month_key, monthly)):
        seen = []
        for path in ordered:
            key = key_of(backup_timestamp(path))
            if key not in seen:
                seen.append(key)
                if len(seen) <= limit:
                    keep.add(path)
    return keep


def apply_retention(directory=None):
    cfg = _config()
    directory = Path(directory or cfg["dir"])
    backups = list_backups(directory)
    keep = select_backups_to_keep(backups, cfg["daily"], cfg["weekly"], cfg["monthly"])
    removed = []
    for path in backups:
        if path not in keep:
            path.unlink(missing_ok=True)
            Path(str(path) + ".sha256").unlink(missing_ok=True)
            removed.append(path.name)
    return removed


def create_backup(now=None):
    """Genera la copia, su suma SHA-256, la copia al destino remoto (si está configurado) y aplica la retención."""
    cfg = _config()
    cfg["dir"].mkdir(parents=True, exist_ok=True)
    stamp = (now or datetime.now()).strftime(TIMESTAMP_FORMAT)

    if _is_postgres():
        target = cfg["dir"] / f"{PREFIX}{stamp}.dump"
        _run(
            ["pg_dump", "-Fc", "--no-owner", "-f", str(target), *_pg_connection_args(), _db()["NAME"]],
            env=_pg_env(),
        )
    else:
        target = cfg["dir"] / f"{PREFIX}{stamp}.sqlite3.gz"
        with tempfile.TemporaryDirectory() as tmp:
            raw = Path(tmp) / "snapshot.sqlite3"
            destination = sqlite3.connect(raw)
            try:
                connection.ensure_connection()
                connection.connection.backup(destination)
            finally:
                destination.close()
            with open(raw, "rb") as source, gzip.open(target, "wb") as compressed:
                shutil.copyfileobj(source, compressed)

    Path(str(target) + ".sha256").write_text(f"{_sha256(target)}  {target.name}\n", encoding="utf-8")

    if cfg["remote"]:
        remote = Path(cfg["remote"])
        remote.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, remote / target.name)
        shutil.copy2(str(target) + ".sha256", remote / (target.name + ".sha256"))

    removed = apply_retention(cfg["dir"])
    logger.info("Copia creada: %s (eliminadas por retención: %s)", target.name, len(removed))
    return target


def verify_checksum(path):
    path = Path(path)
    checksum_file = Path(str(path) + ".sha256")
    if not checksum_file.exists():
        raise BackupError(f"Falta el archivo de suma de verificación de {path.name}.")
    expected = checksum_file.read_text(encoding="utf-8").split()[0]
    if _sha256(path) != expected:
        raise BackupError(f"La suma SHA-256 de {path.name} no coincide: el archivo está dañado o fue modificado.")


def _verify_sqlite(path):
    with tempfile.TemporaryDirectory() as tmp:
        restored = Path(tmp) / "restored.sqlite3"
        with gzip.open(path, "rb") as compressed, open(restored, "wb") as output:
            shutil.copyfileobj(compressed, output)
        handle = sqlite3.connect(restored)
        try:
            if handle.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise BackupError("La copia restaurada no pasa la comprobación de integridad de SQLite.")
            return {table: handle.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0] for table in VERIFY_TABLES}
        except sqlite3.DatabaseError as error:
            raise BackupError(f"No se pudo leer la copia restaurada: {error}") from error
        finally:
            handle.close()


def _verify_postgres(path):
    scratch = f"verify_restore_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    env = _pg_env()
    conn = _pg_connection_args()
    _run(["createdb", *conn, scratch], env=env)
    try:
        _run(["pg_restore", "--no-owner", *conn, "-d", scratch, str(path)], env=env)
        counts = {}
        for table in VERIFY_TABLES:
            out = _run(["psql", *conn, "-d", scratch, "-tA", "-c", f'SELECT COUNT(*) FROM "{table}"'], env=env)
            counts[table] = int(out.stdout.strip())
        return counts
    finally:
        _run(["dropdb", "--if-exists", *conn, scratch], env=env)


def verify_backup(path=None):
    """Comprueba la suma, restaura la copia en una base temporal y valida que contiene datos. Devuelve conteos por tabla."""
    if path is None:
        backups = list_backups()
        if not backups:
            raise BackupError("No hay copias de seguridad que verificar.")
        path = backups[0]
    path = Path(path)
    verify_checksum(path)
    counts = _verify_postgres(path) if _is_postgres() else _verify_sqlite(path)
    if counts.get("django_migrations", 0) == 0:
        raise BackupError("La copia restaurada no contiene el historial de migraciones: parece vacía.")
    logger.info("Restauración verificada: %s -> %s", path.name, counts)
    return counts
