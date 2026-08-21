from django.urls import path

from apps.mail.views import (
    MailIntegrationDetailView,
    MailIntegrationsView,
    MailSyncView,
)


urlpatterns = [
    path(
        "integrations/",
        MailIntegrationsView.as_view(),
        name="mail-integrations",
    ),
    path(
        "integrations/<uuid:integration_id>/",
        MailIntegrationDetailView.as_view(),
        name="mail-integration-detail",
    ),
    path(
        "sync/",
        MailSyncView.as_view(),
        name="mail-sync",
    ),
]