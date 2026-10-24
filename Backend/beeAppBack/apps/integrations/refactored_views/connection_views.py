"""Integration connection management views."""

from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.integrations.exceptions import (
    IntegrationAuthorizationError,
    IntegrationConfigurationError,
    IntegrationConnectionNotFoundError,
)
from apps.integrations.serializers import ReauthorizeIntegrationSerializer

from .dependencies import ConnectionDependencies, OAuthDependencies
from .oauth_redirects import (
    build_authorization_response_payload,
    create_authorization_request,
    get_identity_scopes,
    normalize_capabilities,
    unauthorized_response,
)


class IntegrationConnectionListView(AuthenticatedAPIView):
    """Lists all connections owned by the signed-in user."""

    connection_dependencies: ConnectionDependencies | None = None

    def get(self, request):
        try:
            authenticated_user = self.get_authenticated_user(request)
            connections = (
                self.connection_dependencies.list_user_connections(
                    user_id=str(authenticated_user.id)
                )
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except IntegrationConnectionNotFoundError:
            return Response(
                {"detail": "No fue posible cargar las integraciones."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {"detail": "No fue posible cargar las integraciones."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"connections": connections},
            status=status.HTTP_200_OK,
        )


class IntegrationConnectionDetailView(AuthenticatedAPIView):
    """Retrieves or disconnects one user-owned integration connection."""

    connection_dependencies: ConnectionDependencies | None = None

    def get(self, request, connection_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            connection = self.connection_dependencies.get_user_connection(
                user_id=str(authenticated_user.id),
                connection_id=str(connection_id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except IntegrationConnectionNotFoundError:
            return Response(
                {"detail": "La integración no fue encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"connection": connection},
            status=status.HTTP_200_OK,
        )

    def delete(self, request, connection_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            self.connection_dependencies.disconnect_user_connection(
                user_id=str(authenticated_user.id),
                connection_id=str(connection_id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except IntegrationConnectionNotFoundError:
            return Response(
                {"detail": "La integración no fue encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except IntegrationAuthorizationError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class DeleteIntegrationConnectionRecordView(AuthenticatedAPIView):
    """Deletes an inactive connection record owned by the user."""

    connection_dependencies: ConnectionDependencies | None = None

    def delete(self, request, connection_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            self.connection_dependencies.delete_inactive_user_connection(
                user_id=str(authenticated_user.id),
                connection_id=str(connection_id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except IntegrationConnectionNotFoundError:
            return Response(
                {"detail": "La integración no fue encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except IntegrationAuthorizationError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class ReauthorizeIntegrationConnectionView(AuthenticatedAPIView):
    """Creates a new OAuth flow for a connection requiring authorization."""

    connection_dependencies: ConnectionDependencies | None = None
    oauth_dependencies: OAuthDependencies | None = None

    def post(self, request, connection_id):
        serializer = ReauthorizeIntegrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            connection = self.connection_dependencies.get_user_connection(
                user_id=str(authenticated_user.id),
                connection_id=str(connection_id),
            )
            provider = connection["provider"]
            requested_capabilities = normalize_capabilities(
                serializer.validated_data["capabilities"]
                or connection["capabilities"]
            )
            requested_scopes = get_identity_scopes(
                provider,
                requested_capabilities,
            )
            oauth_request = create_authorization_request(
                request=request,
                authenticated_user=authenticated_user,
                provider=provider,
                requested_scopes=requested_scopes,
                requested_capabilities=requested_capabilities,
                client_channel=serializer.validated_data[
                    "client_channel"
                ],
                existing_connection_id=str(connection_id),
                dependencies=self.oauth_dependencies,
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except IntegrationConnectionNotFoundError:
            return Response(
                {"detail": "La integración no fue encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except (
            IntegrationAuthorizationError,
            IntegrationConfigurationError,
        ):
            return Response(
                {"detail": "No fue posible iniciar la reconexión."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            build_authorization_response_payload(
                oauth_request=oauth_request,
                dependencies=self.oauth_dependencies,
            ),
            status=status.HTTP_201_CREATED,
        )
