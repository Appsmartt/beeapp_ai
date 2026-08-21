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
    GOOGLE_CALENDAR_SCOPES,
    GOOGLE_IDENTITY_SCOPES,
    GOOGLE_MAIL_SCOPES,
    exchange_google_authorization_code,
    get_google_user_info,
)
from apps.integrations.services.integration_connection_service import (
    delete_inactive_user_connection,
    disconnect_user_connection,
    get_user_connection,
    list_user_connections,
    upsert_google_connection,
    upsert_microsoft_connection,
)
from apps.integrations.services.microsoft_oauth_service import (
    MICROSOFT_IDENTITY_SCOPES,
    exchange_microsoft_authorization_code,
    get_microsoft_user_info,
)
from apps.integrations.services.oauth_request_service import (
    consume_oauth_request,
    create_oauth_request,
)
from apps.integrations.services.provider_registry import (
    build_provider_authorization_url,
)


MOBILE_RETURN_PATH = "/(main)/profile/integrations"
WEB_RETURN_PATH = "/app/profile/integrations/result"


class BeeAppRedirectResponse(HttpResponseRedirect):
    allowed_schemes = [
        "http",
        "https",
        "beeapp",
    ]


def build_redirect_url(
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

    return f"{base_url}{separator}{urlencode(query)}"


def get_web_result_redirect_url() -> str:
    return getattr(
        settings,
        "INTEGRATION_WEB_RESULT_REDIRECT",
        "",
    ).strip()


def get_mobile_result_redirect_url(
    *,
    outcome: str,
) -> str:
    if outcome == "success":
        return getattr(
            settings,
            "INTEGRATION_MOBILE_SUCCESS_REDIRECT",
            "",
        ).strip()

    return getattr(
        settings,
        "INTEGRATION_MOBILE_FAILURE_REDIRECT",
        "",
    ).strip()


def get_callback_redirect_base_url(
    *,
    return_path: str | None,
    outcome: str,
) -> str:
    if return_path == WEB_RETURN_PATH:
        return get_web_result_redirect_url()

    if return_path == MOBILE_RETURN_PATH:
        return get_mobile_result_redirect_url(
            outcome=outcome,
        )

    return get_mobile_result_redirect_url(
        outcome=outcome,
    )


def build_callback_redirect_response(
    *,
    outcome: str,
    request_id: str | None = None,
    detail: str | None = None,
    return_path: str | None = None,
) -> BeeAppRedirectResponse:
    base_url = get_callback_redirect_base_url(
        return_path=return_path,
        outcome=outcome,
    )

    if not base_url:
        raise IntegrationConfigurationError(
            "Integration callback redirect is not configured."
        )

    return BeeAppRedirectResponse(
        build_redirect_url(
            base_url=base_url,
            outcome=outcome,
            request_id=request_id,
            detail=detail,
        )
    )


def unauthorized_response() -> Response:
    return Response(
        {
            "detail": "Invalid or expired access token.",
        },
        status=status.HTTP_401_UNAUTHORIZED,
    )


def _normalize_capabilities(
    capabilities: list[str] | None,
) -> list[str]:
    normalized: list[str] = []

    for capability in capabilities or []:
        value = str(capability).strip().lower()

        if value and value not in normalized:
            normalized.append(value)

    return normalized


def _append_unique_scopes(
    scopes: list[str],
    additional_scopes: tuple[str, ...] | list[str],
) -> None:
    for scope in additional_scopes:
        normalized_scope = str(scope).strip()

        if normalized_scope and normalized_scope not in scopes:
            scopes.append(normalized_scope)


def get_identity_scopes(
    provider: str,
    capabilities: list[str] | None = None,
) -> list[str]:
    normalized_capabilities = _normalize_capabilities(
        capabilities
    )

    if provider == "google":
        scopes = list(GOOGLE_IDENTITY_SCOPES)

        if "calendar" in normalized_capabilities:
            _append_unique_scopes(
                scopes,
                GOOGLE_CALENDAR_SCOPES,
            )

        if "mail" in normalized_capabilities:
            _append_unique_scopes(
                scopes,
                GOOGLE_MAIL_SCOPES,
            )

        return scopes

    if provider == "microsoft":
        return list(MICROSOFT_IDENTITY_SCOPES)

    raise IntegrationConfigurationError(
        f"Unsupported integration provider: {provider}"
    )


def build_callback_failure_response(
    *,
    provider_name: str,
    detail: str,
    return_path: str | None = None,
    request_id: str | None = None,
) -> BeeAppRedirectResponse:
    try:
        return build_callback_redirect_response(
            outcome="failure",
            request_id=request_id,
            detail=f"{provider_name}: {detail}",
            return_path=return_path,
        )
    except IntegrationConfigurationError:
        return BeeAppRedirectResponse(
            "beeapp://integrations/result?outcome=failure"
        )


def get_callback_request_context(
    *,
    provider: str,
    state_value: str,
) -> tuple[dict | None, BeeAppRedirectResponse | None]:
    try:
        oauth_request = consume_oauth_request(
            provider=provider,
            state=state_value,
        )

        return oauth_request, None
    except (
        IntegrationAuthorizationError,
        IntegrationConfigurationError,
        IntegrationCredentialError,
        IntegrationProviderError,
    ) as error:
        return None, build_callback_failure_response(
            provider_name=provider.title(),
            detail=str(error),
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

            normalized_provider = (
                serializer.validated_data["provider"]
            )
            requested_capabilities = (
                serializer.validated_data["capabilities"]
            )

            requested_scopes = get_identity_scopes(
                normalized_provider,
                requested_capabilities,
            )

            oauth_request = create_oauth_request(
                user_id=str(authenticated_user.id),
                provider=normalized_provider,
                requested_scopes=requested_scopes,
                requested_capabilities=requested_capabilities,
                client_channel=serializer.validated_data[
                    "client_channel"
                ],
            )

            authorization_url = build_provider_authorization_url(
                provider=normalized_provider,
                state=oauth_request["state"],
                code_challenge=oauth_request["code_challenge"],
                requested_scopes=requested_scopes,
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

        if not state_value:
            return build_callback_failure_response(
                provider_name="Google",
                detail="Respuesta de Google incompleta.",
            )

        oauth_request, failure_response = (
            get_callback_request_context(
                provider="google",
                state_value=state_value,
            )
        )

        if failure_response:
            return failure_response

        if not oauth_request:
            return build_callback_failure_response(
                provider_name="Google",
                detail="Solicitud de autorización inválida.",
            )

        return_path = oauth_request.get("return_path")
        request_id = oauth_request.get("id")

        if provider_error:
            return build_callback_failure_response(
                provider_name="Google",
                detail=(
                    provider_error_description
                    or provider_error
                ),
                return_path=return_path,
                request_id=request_id,
            )

        if not authorization_code:
            return build_callback_failure_response(
                provider_name="Google",
                detail="Respuesta de Google incompleta.",
                return_path=return_path,
                request_id=request_id,
            )

        try:
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

            return build_callback_redirect_response(
                outcome="success",
                request_id=request_id,
                detail=connection["id"],
                return_path=return_path,
            )
        except (
            IntegrationAuthorizationError,
            IntegrationConfigurationError,
            IntegrationCredentialError,
            IntegrationProviderError,
        ) as error:
            return build_callback_failure_response(
                provider_name="Google",
                detail=str(error),
                return_path=return_path,
                request_id=request_id,
            )


class MicrosoftOAuthCallbackView(APIView):
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

        if not state_value:
            return build_callback_failure_response(
                provider_name="Microsoft",
                detail="Respuesta de Microsoft incompleta.",
            )

        oauth_request, failure_response = (
            get_callback_request_context(
                provider="microsoft",
                state_value=state_value,
            )
        )

        if failure_response:
            return failure_response

        if not oauth_request:
            return build_callback_failure_response(
                provider_name="Microsoft",
                detail="Solicitud de autorización inválida.",
            )

        return_path = oauth_request.get("return_path")
        request_id = oauth_request.get("id")

        if provider_error:
            return build_callback_failure_response(
                provider_name="Microsoft",
                detail=(
                    provider_error_description
                    or provider_error
                ),
                return_path=return_path,
                request_id=request_id,
            )

        if not authorization_code:
            return build_callback_failure_response(
                provider_name="Microsoft",
                detail="Respuesta de Microsoft incompleta.",
                return_path=return_path,
                request_id=request_id,
            )

        try:
            token_data = exchange_microsoft_authorization_code(
                authorization_code=authorization_code,
                code_verifier=oauth_request["code_verifier"],
            )

            user_info = get_microsoft_user_info(
                access_token=token_data["access_token"],
            )

            connection = upsert_microsoft_connection(
                user_id=oauth_request["user_id"],
                oauth_request=oauth_request,
                token_data=token_data,
                user_info=user_info,
            )

            return build_callback_redirect_response(
                outcome="success",
                request_id=request_id,
                detail=connection["id"],
                return_path=return_path,
            )
        except (
            IntegrationAuthorizationError,
            IntegrationConfigurationError,
            IntegrationCredentialError,
            IntegrationProviderError,
        ) as error:
            return build_callback_failure_response(
                provider_name="Microsoft",
                detail=str(error),
                return_path=return_path,
                request_id=request_id,
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

            provider = connection["provider"]

            requested_capabilities = _normalize_capabilities(
                serializer.validated_data["capabilities"]
                or connection["capabilities"]
            )

            requested_scopes = get_identity_scopes(
                provider,
                requested_capabilities,
            )

            oauth_request = create_oauth_request(
                user_id=str(authenticated_user.id),
                provider=provider,
                requested_scopes=requested_scopes,
                requested_capabilities=requested_capabilities,
                client_channel=serializer.validated_data[
                    "client_channel"
                ],
                existing_connection_id=str(connection_id),
            )

            authorization_url = build_provider_authorization_url(
                provider=provider,
                state=oauth_request["state"],
                code_challenge=oauth_request["code_challenge"],
                requested_scopes=requested_scopes,
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