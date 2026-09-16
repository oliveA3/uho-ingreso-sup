from django.http import JsonResponse


def api_success(data=None, status=200):
    """JsonResponse wrapped in the {success, data, error} envelope.

    Use this instead of a bare JsonResponse in views that don't go through
    DRF's response/renderer pipeline (e.g. views built on JsonResponse
    directly rather than rest_framework.response.Response).
    """
    return JsonResponse({"success": True, "data": data, "error": None}, status=status)


def api_error(error, status=400):
    return JsonResponse({"success": False, "data": None, "error": error}, status=status)
