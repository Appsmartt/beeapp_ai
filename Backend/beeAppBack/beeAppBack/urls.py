from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.views.decorators.http import require_GET


@require_GET
def health_check(request):
    return JsonResponse(
        {
            "status": "ok",
            "service": "beeapp-backend",
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/storage/", include("apps.storage.urls")),
    path(
        "api/notifications/",
        include("apps.notifications.urls"),
    ),
]