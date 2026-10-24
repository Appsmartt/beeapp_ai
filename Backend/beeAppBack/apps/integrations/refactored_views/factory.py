"""Factories that bind integration view dependencies at request time."""

from __future__ import annotations

from typing import Callable

from .catalog_views import (
    IntegrationCatalogView as BaseIntegrationCatalogView,
    StartIntegrationAuthorizationView as BaseStartAuthorizationView,
)
from .connection_views import (
    DeleteIntegrationConnectionRecordView as BaseDeleteConnectionView,
    IntegrationConnectionDetailView as BaseConnectionDetailView,
    IntegrationConnectionListView as BaseConnectionListView,
    ReauthorizeIntegrationConnectionView as BaseReauthorizeConnectionView,
)
from .dependencies import ConnectionDependencies, OAuthDependencies
from .oauth_callbacks import (
    BrowserOAuthStartView as BaseBrowserOAuthStartView,
    ConfirmIntegrationOAuthView as BaseConfirmOAuthView,
    GoogleOAuthCallbackView as BaseGoogleOAuthCallbackView,
    MicrosoftOAuthCallbackView as BaseMicrosoftOAuthCallbackView,
)


OAuthDependencyFactory = Callable[[], OAuthDependencies]
ConnectionDependencyFactory = Callable[[], ConnectionDependencies]


def build_view_classes(
    *,
    oauth_dependency_factory: OAuthDependencyFactory,
    connection_dependency_factory: ConnectionDependencyFactory,
) -> dict[str, type]:
    class IntegrationCatalogView(BaseIntegrationCatalogView):
        pass

    class IntegrationConnectionListView(BaseConnectionListView):
        def dispatch(self, request, *args, **kwargs):
            self.connection_dependencies = connection_dependency_factory()
            return super().dispatch(request, *args, **kwargs)

    class StartIntegrationAuthorizationView(BaseStartAuthorizationView):
        def dispatch(self, request, *args, **kwargs):
            self.oauth_dependencies = oauth_dependency_factory()
            return super().dispatch(request, *args, **kwargs)

    class BrowserOAuthStartView(BaseBrowserOAuthStartView):
        def dispatch(self, request, *args, **kwargs):
            self.oauth_dependencies = oauth_dependency_factory()
            return super().dispatch(request, *args, **kwargs)

    class GoogleOAuthCallbackView(BaseGoogleOAuthCallbackView):
        def dispatch(self, request, *args, **kwargs):
            self.oauth_dependencies = oauth_dependency_factory()
            return super().dispatch(request, *args, **kwargs)

    class MicrosoftOAuthCallbackView(BaseMicrosoftOAuthCallbackView):
        def dispatch(self, request, *args, **kwargs):
            self.oauth_dependencies = oauth_dependency_factory()
            return super().dispatch(request, *args, **kwargs)

    class ConfirmIntegrationOAuthView(BaseConfirmOAuthView):
        def dispatch(self, request, *args, **kwargs):
            self.oauth_dependencies = oauth_dependency_factory()
            return super().dispatch(request, *args, **kwargs)

    class IntegrationConnectionDetailView(BaseConnectionDetailView):
        def dispatch(self, request, *args, **kwargs):
            self.connection_dependencies = connection_dependency_factory()
            return super().dispatch(request, *args, **kwargs)

    class DeleteIntegrationConnectionRecordView(
        BaseDeleteConnectionView
    ):
        def dispatch(self, request, *args, **kwargs):
            self.connection_dependencies = connection_dependency_factory()
            return super().dispatch(request, *args, **kwargs)

    class ReauthorizeIntegrationConnectionView(
        BaseReauthorizeConnectionView
    ):
        def dispatch(self, request, *args, **kwargs):
            self.connection_dependencies = connection_dependency_factory()
            self.oauth_dependencies = oauth_dependency_factory()
            return super().dispatch(request, *args, **kwargs)

    return {
        "IntegrationCatalogView": IntegrationCatalogView,
        "IntegrationConnectionListView": IntegrationConnectionListView,
        "StartIntegrationAuthorizationView": (
            StartIntegrationAuthorizationView
        ),
        "BrowserOAuthStartView": BrowserOAuthStartView,
        "GoogleOAuthCallbackView": GoogleOAuthCallbackView,
        "MicrosoftOAuthCallbackView": MicrosoftOAuthCallbackView,
        "ConfirmIntegrationOAuthView": ConfirmIntegrationOAuthView,
        "IntegrationConnectionDetailView": IntegrationConnectionDetailView,
        "DeleteIntegrationConnectionRecordView": (
            DeleteIntegrationConnectionRecordView
        ),
        "ReauthorizeIntegrationConnectionView": (
            ReauthorizeIntegrationConnectionView
        ),
    }
