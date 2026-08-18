from __future__ import annotations

from urllib.parse import urlencode

from django.conf import settings
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.integrations.exceptions import (
    IntegrationAuthorizationError,
    IntegrationConfigurationError,
    IntegrationConnectionNotFoundError,
    IntegrationCredentialError,
    IntegrationProviderError,
)
from apps.integrations.serializers import (
    ReauthorizeIntegrationSerializer,
    StartIntegrationAuthorizationSerializer,
)
from apps.integrations.services.google_oauth_service import (
    exchange_google_authorization_code,
    get_google_user_info,
)
from apps.integrations.services.integration_connection_service import (
    delete_inactive_user_connection,
    disconnect_user_connection,
    get_user_connection,
    list_user_connections,
    upsert_google_connection,
)
from apps.integrations.services.oauth_request_service import (
    consume_oauth_request,
    create_oauth_request,
)
from apps.integrations.services.provider_registry import (
    build_provider_authorization_url,
)


GOOGLE_IDENTITY_SCOPES = [
    "openid",
    "email",
    "profile",
]


class BeeAppRedirectResponse(HttpResponseRedirect):
    """
    Django only permits http, https, and ftp redirects by default.
    BeeApp uses a fixed custom URL scheme to return from browser OAuth
    to the installed mobile application.
    """

    allowed_schemes = [
        "http",
        "https",
        "beeapp",
    ]


def build_mobile_redirect(
    *,
    base_url: str,
    outcome: str,
    request_id: str | None = None,
    detail: str | None = None,
) -> str:
    query = {
        "outcome": outcome,
    }

    if request_id:
        query["request_id"] = request_id

    if detail:
        query["detail"] = detail[:200]

    separator = "&" if "?" in base_url else "?"

    return (
        f"{base_url}{separator}{urlencode(query)}"
    )


def unauthorized_response() -> Response:
    return Response(
        {
            "detail": "Invalid or expired access token.",
        },
        status=status.HTTP_401_UNAUTHORIZED,
    )


class IntegrationCatalogView(AuthenticatedAPIView):
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
                        "status": "coming_soon",
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


class IntegrationConnectionListView(
    AuthenticatedAPIView,
):
    def get(self, request):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            connections = list_user_connections(
                user_id=str(authenticated_user.id),
            )

        except AccountAuthenticationError:
            return unauthorized_response()

        except IntegrationConnectionNotFoundError:
            return Response(
                {
                    "detail": (
                        "No fue posible cargar las integraciones."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            return Response(
                {
                    "detail": (
                        "No fue posible cargar las integraciones."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "connections": connections,
            },
            status=status.HTTP_200_OK,
        )


class StartIntegrationAuthorizationView(
    AuthenticatedAPIView,
):
    def post(self, request, provider: str):
        serializer = StartIntegrationAuthorizationSerializer(
            data={
                **request.data,
                "provider": provider,
            }
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            oauth_request = create_oauth_request(
                user_id=str(authenticated_user.id),
                provider=serializer.validated_data["provider"],
                requested_scopes=GOOGLE_IDENTITY_SCOPES,
                requested_capabilities=serializer.validated_data[
                    "capabilities"
                ],
            )

            authorization_url = build_provider_authorization_url(
                provider=serializer.validated_data["provider"],
                state=oauth_request["state"],
                code_challenge=oauth_request["code_challenge"],
                requested_scopes=GOOGLE_IDENTITY_SCOPES,
            )

        except AccountAuthenticationError:
            return unauthorized_response()

        except IntegrationConfigurationError:
            return Response(
                {
                    "detail": (
                        "La integración no está configurada "
                        "correctamente."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        except IntegrationAuthorizationError:
            return Response(
                {
                    "detail": (
                        "No fue posible iniciar la autorización."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "request_id": oauth_request["request_id"],
                "authorization_url": authorization_url,
                "expires_at": oauth_request["expires_at"],
            },
            status=status.HTTP_201_CREATED,
        )


class GoogleOAuthCallbackView(APIView):
    permission_classes = []

    def get(self, request):
        authorization_code = str(
            request.query_params.get("code", "")
        ).strip()

        state_value = str(
            request.query_params.get("state", "")
        ).strip()

        provider_error = str(
            request.query_params.get("error", "")
        ).strip()

        provider_error_description = str(
            request.query_params.get(
                "error_description",
                "",
            )
        ).strip()

        success_redirect = getattr(
            settings,
            "INTEGRATION_MOBILE_SUCCESS_REDIRECT",
            "",
        )

        failure_redirect = getattr(
            settings,
            "INTEGRATION_MOBILE_FAILURE_REDIRECT",
            "",
        )

        if provider_error:
            return BeeAppRedirectResponse(
                build_mobile_redirect(
                    base_url=failure_redirect,
                    outcome="failure",
                    detail=(
                        provider_error_description
                        or provider_error
                    ),
                )
            )

        if not authorization_code or not state_value:
            return BeeAppRedirectResponse(
                build_mobile_redirect(
                    base_url=failure_redirect,
                    outcome="failure",
                    detail="Respuesta de Google incompleta.",
                )
            )

        try:
            oauth_request = consume_oauth_request(
                provider="google",
                state=state_value,
            )

            token_data = exchange_google_authorization_code(
                authorization_code=authorization_code,
                code_verifier=oauth_request["code_verifier"],
            )

            user_info = get_google_user_info(
                access_token=token_data["access_token"],
            )

            connection = upsert_google_connection(
                user_id=oauth_request["user_id"],
                oauth_request=oauth_request,
                token_data=token_data,
                user_info=user_info,
            )

            return BeeAppRedirectResponse(
                build_mobile_redirect(
                    base_url=success_redirect,
                    outcome="success",
                    request_id=oauth_request["id"],
                    detail=connection["id"],
                )
            )

        except (
            IntegrationAuthorizationError,
            IntegrationConfigurationError,
            IntegrationCredentialError,
            IntegrationProviderError,
        ) as error:
            return BeeAppRedirectResponse(
                build_mobile_redirect(
                    base_url=failure_redirect,
                    outcome="failure",
                    detail=str(error),
                )
            )


class IntegrationConnectionDetailView(
    AuthenticatedAPIView,
):
    def get(self, request, connection_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            connection = get_user_connection(
                user_id=str(authenticated_user.id),
                connection_id=str(connection_id),
            )

        except AccountAuthenticationError:
            return unauthorized_response()

        except IntegrationConnectionNotFoundError:
            return Response(
                {
                    "detail": "La integración no fue encontrada.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "connection": connection,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, connection_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            disconnect_user_connection(
                user_id=str(authenticated_user.id),
                connection_id=str(connection_id),
            )

        except AccountAuthenticationError:
            return unauthorized_response()

        except IntegrationConnectionNotFoundError:
            return Response(
                {
                    "detail": "La integración no fue encontrada.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except IntegrationCredentialError:
            return Response(
                {
                    "detail": (
                        "No fue posible desconectar la integración."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class DeleteIntegrationConnectionRecordView(
    AuthenticatedAPIView,
):
    def delete(self, request, connection_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            delete_inactive_user_connection(
                user_id=str(authenticated_user.id),
                connection_id=str(connection_id),
            )

        except AccountAuthenticationError:
            return unauthorized_response()

        except IntegrationConnectionNotFoundError:
            return Response(
                {
                    "detail": "La integración no fue encontrada.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except IntegrationCredentialError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class ReauthorizeIntegrationConnectionView(
    AuthenticatedAPIView,
):
    def post(self, request, connection_id):
        serializer = ReauthorizeIntegrationSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            connection = get_user_connection(
                user_id=str(authenticated_user.id),
                connection_id=str(connection_id),
            )

            if connection["provider"] != "google":
                return Response(
                    {
                        "detail": (
                            "Este proveedor todavía no está "
                            "disponible."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            oauth_request = create_oauth_request(
                user_id=str(authenticated_user.id),
                provider="google",
                requested_scopes=GOOGLE_IDENTITY_SCOPES,
                requested_capabilities=(
                    serializer.validated_data["capabilities"]
                    or connection["capabilities"]
                ),
                existing_connection_id=str(connection_id),
            )

            authorization_url = build_provider_authorization_url(
                provider="google",
                state=oauth_request["state"],
                code_challenge=oauth_request["code_challenge"],
                requested_scopes=GOOGLE_IDENTITY_SCOPES,
            )

        except AccountAuthenticationError:
            return unauthorized_response()

        except IntegrationConnectionNotFoundError:
            return Response(
                {
                    "detail": "La integración no fue encontrada.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except (
            IntegrationAuthorizationError,
            IntegrationConfigurationError,
        ):
            return Response(
                {
                    "detail": (
                        "No fue posible iniciar la reconexión."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "request_id": oauth_request["request_id"],
                "authorization_url": authorization_url,
                "expires_at": oauth_request["expires_at"],
            },
            status=status.HTTP_201_CREATED,
        )