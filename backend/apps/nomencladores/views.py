from django.http import JsonResponse
from django.views import View


class NomencladoresHealthCheckView(View):
    def get(self, request):
        return JsonResponse({"status": "ok", "app": "nomencladores"})
