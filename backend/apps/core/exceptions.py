import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("django.request")


def safe_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        return response

    logger.error(
        "Unhandled API exception in %s",
        context.get("view").__class__.__name__ if context.get("view") else "unknown view",
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    return Response({"detail": "Ocurrió un error interno. Intenta nuevamente más tarde."}, status=500)