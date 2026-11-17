"""Tareas periódicas del ciclo de etapas."""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def close_expired_stages_task():
    """Cierra las etapas en curso cuya fecha de fin ya pasó.

    Las vistas ya tratan una etapa vencida como cerrada (`is_stage_active` mira la
    fecha), así que esta tarea solo persiste el estado; es idempotente y se puede
    ejecutar tantas veces como haga falta.
    """
    from .services.etapas import close_expired_stages

    closed = close_expired_stages()
    if closed:
        logger.info("Etapas vencidas cerradas: %s", closed)
    return closed
