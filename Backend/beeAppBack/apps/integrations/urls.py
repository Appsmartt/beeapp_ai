from django.urls import path

from apps.integrations.views import (
    GoogleOAuthCallbackView,
    IntegrationCatalogView,
    IntegrationConnectionDetailView,
    IntegrationConnectionListView,
    ReauthorizeIntegrationConnectionView,
    StartIntegrationAuthorizationView,
)


urlpatterns = [
    path(
        "catalog/",
        IntegrationCatalogView.as_view(),
        name="integration-catalog",
    ),
    path(
        "connections/",
        IntegrationConnectionListView.as_view(),
        name="integration-connection-list",
    ),
    path(
        "connections/<str:provider>/authorize/",
        StartIntegrationAuthorizationView.as_view(),
        name="integration-authorization-start",
    ),
    path(
        "oauth/callback/google/",
        GoogleOAuthCallbackView.as_view(),
        name="google-oauth-callback",
    ),
    path(
        "connections/<uuid:connection_id>/",
        IntegrationConnectionDetailView.as_view(),
        name="integration-connection-detail",
    ),
    path(
        "connections/<uuid:connection_id>/reauthorize/",
        ReauthorizeIntegrationConnectionView.as_view(),
        name="integration-connection-reauthorize",
    ),
]