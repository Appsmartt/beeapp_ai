"""Integration catalog and authorization-start views."""

from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.integrations.exceptions import (
    IntegrationAuthorizationError,
    IntegrationConfigurationError,
)
from apps.integrations.serializers import (
    StartIntegrationAuthorizationSerializer,
)

from .dependencies import OAuthDependencies
from .oauth_redirects import (
    build_authorization_response_payload,
    create_authorization_request,
    get_identity_scopes,
    unauthorized_response,
)


class IntegrationCatalogView(AuthenticatedAPIView):
    """Returns the available integration providers and capabilities."""

    def get(self, request):
        try:
            self.get_authenticated_user(request)
        except AccountAuthenticationError:
            return unauthorized_response()

        return Response(
            {
                "providers": [
                    {
                        "id": "google",
                        "name": "Google",
                        "status": "available",
                        "capabilities": [
                            "calendar",
                            "mail",
                            "contacts",
                            "storage",
                        ],
                    },
                    {
                        "id": "microsoft",
                        "name": "Microsoft",
                        "status": "available",
                        "capabilities": [
                            "calendar",
                            "mail",
                            "contacts",
                            "storage",
                        ],
                    },
                ]
            },
            status=status.HTTP_200_OK,
        )


class StartIntegrationAuthorizationView(AuthenticatedAPIView):
    """Creates a protected OAuth authorization request."""

    oauth_dependencies: OAuthDependencies | None = None

    def post(self, request, provider: str):
        serializer = StartIntegrationAuthorizationSerializer(
            data={**request.data, "provider": provider}
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            normalized_provider = serializer.validated_data["provider"]
            requested_capabilities = serializer.validated_data[
                "capabilities"
            ]
            requested_scopes = get_identity_scopes(
                normalized_provider,
                requested_capabilities,
            )
            oauth_request = create_authorization_request(
                request=request,
                authenticated_user=authenticated_user,
                provider=normalized_provider,
                requested_scopes=requested_scopes,
                requested_capabilities=requested_capabilities,
                client_channel=serializer.validated_data[
                    "client_channel"
                ],
                dependencies=self.oauth_dependencies,
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except IntegrationConfigurationError:
            return Response(
                {
                    "detail": (
                        "La integración no está configurada correctamente."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except IntegrationAuthorizationError:
            return Response(
                {
                    "detail": "No fue posible iniciar la autorización."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            build_authorization_response_payload(
                oauth_request=oauth_request,
                dependencies=self.oauth_dependencies,
            ),
            status=status.HTTP_201_CREATED,
        )
