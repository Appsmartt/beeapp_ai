from django.urls import path

from apps.integrations.views import (
    BrowserOAuthStartView,
    ConfirmIntegrationOAuthView,
    DeleteIntegrationConnectionRecordView,
    GoogleOAuthCallbackView,
    IntegrationCatalogView,
    IntegrationConnectionDetailView,
    IntegrationConnectionListView,
    MicrosoftOAuthCallbackView,
    ReauthorizeIntegrationConnectionView,
    StartIntegrationAuthorizationView,
)


urlpatterns = [
    path("catalog/", IntegrationCatalogView.as_view(), name="integration-catalog"),
    path("connections/", IntegrationConnectionListView.as_view(), name="integration-connection-list"),
    path(
        "connections/<str:provider>/authorize/",
        StartIntegrationAuthorizationView.as_view(),
        name="integration-authorization-start",
    ),
    path(
        "oauth/browser-start/",
        BrowserOAuthStartView.as_view(),
        name="integration-oauth-browser-start",
    ),
    path(
        "oauth/confirm/",
        ConfirmIntegrationOAuthView.as_view(),
        name="integration-oauth-confirm",
    ),
    path(
        "oauth/callback/google/",
        GoogleOAuthCallbackView.as_view(),
        name="google-oauth-callback",
    ),
    path(
        "oauth/callback/microsoft/",
        MicrosoftOAuthCallbackView.as_view(),
        name="microsoft-oauth-callback",
    ),
    path(
        "connections/<uuid:connection_id>/",
        IntegrationConnectionDetailView.as_view(),
        name="integration-connection-detail",
    ),
    path(
        "connections/<uuid:connection_id>/record/",
        DeleteIntegrationConnectionRecordView.as_view(),
        name="integration-connection-record-delete",
    ),
    path(
        "connections/<uuid:connection_id>/reauthorize/",
        ReauthorizeIntegrationConnectionView.as_view(),
        name="integration-connection-reauthorize",
    ),
]
