from django.http import JsonResponse
from django.views import View


class EscuelasHealthCheckView(View):
    def get(self, request):
        return JsonResponse({"status": "ok", "app": "escuelas"})
