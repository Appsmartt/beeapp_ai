from django.urls import path

from apps.mail.views import (
    MailIntegrationDetailView,
    MailIntegrationsView,
    MailMessageDetailView,
    MailMessagesView,
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
        "messages/",
        MailMessagesView.as_view(),
        name="mail-messages",
    ),
    path(
        "messages/<uuid:message_id>/",
        MailMessageDetailView.as_view(),
        name="mail-message-detail",
    ),
    path(
        "sync/",
        MailSyncView.as_view(),
        name="mail-sync",
    ),
]