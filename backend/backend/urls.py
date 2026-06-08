from django.contrib import admin
from django.urls import include, path
from django.http import HttpResponse

def home(request):
    return HttpResponse("🚀 Backend IngresoSUP está corriendo")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
    path("api/authentication/", include("apps.authentication.urls")),
    path("api/superadmin/", include("apps.superadmin.urls")),
    path("api/nomencladores/", include("apps.nomencladores.urls")),
    path("api/escuelas/", include("apps.escuelas.urls")),
    path("api/proceso/", include("apps.proceso.urls")),
    path("api/carreras/", include("apps.carreras.urls")),
    path("api/estudiantes/", include("apps.estudiantes.urls")),
    path("api/reportes/", include("apps.reportes.urls")),
    path("api/auditoria/", include("apps.auditoria.urls")),
    path("api/superadmin/", include("apps.superadmin.urls")),
    path("", home),
]
