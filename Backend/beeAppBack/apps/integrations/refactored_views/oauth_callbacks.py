"""OAuth browser, provider callback, and confirmation views."""

from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.integrations.exceptions import (
    IntegrationAuthorizationError,
    IntegrationConfigurationError,
    IntegrationCredentialError,
    IntegrationProviderError,
)

from .dependencies import OAuthDependencies
from .oauth_redirects import (
    BeeAppRedirectResponse,
    build_callback_failure_response,
    build_callback_redirect_response,
    callback_cookie_name,
    delete_callback_cookie,
    set_callback_cookie,
)


class BrowserOAuthStartView(APIView):
    """Starts a browser-bound OAuth authorization flow."""

    permission_classes = []
    oauth_dependencies: OAuthDependencies | None = None

    def get(self, request):
        browser_start_token = str(
            request.query_params.get("token", "")
        ).strip()
        if not browser_start_token:
            return build_callback_failure_response(
                provider_name="OAuth",
                detail="Browser authorization token is missing.",
            )

        try:
            oauth_request = (
                self.oauth_dependencies.start_browser_oauth_request(
                    browser_start_token=browser_start_token
                )
            )
            authorization_url = (
                self.oauth_dependencies.build_provider_authorization_url(
                    provider=oauth_request["provider"],
                    state=oauth_request["state"],
                    code_challenge=oauth_request["code_challenge"],
                    requested_scopes=oauth_request["requested_scopes"],
                )
            )
            response = BeeAppRedirectResponse(authorization_url)
            set_callback_cookie(response, request, oauth_request)
            return response
        except (
            IntegrationAuthorizationError,
            IntegrationConfigurationError,
            IntegrationCredentialError,
        ) as error:
            return build_callback_failure_response(
                provider_name="OAuth",
                detail=str(error),
            )


class ProviderOAuthCallbackView(APIView):
    """Validates a provider callback and returns the client redirect."""

    permission_classes = []
    oauth_dependencies: OAuthDependencies | None = None
    provider = ""
    provider_name = ""

    def get(self, request):
        return self.handle_provider_callback(request=request)

    def handle_provider_callback(self, *, request):
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
            request.query_params.get("error_description", "")
        ).strip()

        if not state_value:
            return build_callback_failure_response(
                provider_name=self.provider_name,
                detail="Provider response is incomplete.",
            )

        request_id = None
        return_path = None

        try:
            preliminary = (
                self.oauth_dependencies.find_callback_oauth_request(
                    provider=self.provider,
                    state=state_value,
                )
            )
            request_id = str(preliminary["id"])
        except IntegrationAuthorizationError:
            pass

        binding_secret = (
            request.COOKIES.get(callback_cookie_name(request_id))
            if request_id
            else None
        )

        try:
            oauth_request = (
                self.oauth_dependencies.get_callback_oauth_request(
                    provider=self.provider,
                    state=state_value,
                    browser_binding_secret=str(binding_secret or ""),
                )
            )
        except IntegrationAuthorizationError:
            response = build_callback_failure_response(
                provider_name=self.provider_name,
                detail="Browser authorization binding is invalid.",
            )
            delete_callback_cookie(response, request_id)
            return response

        request_id = str(oauth_request["id"])
        return_path = oauth_request.get("return_path")

        try:
            if provider_error:
                self.oauth_dependencies.cancel_oauth_request(
                    oauth_request_id=request_id,
                    provider_error_code=provider_error,
                    provider_error_description=provider_error_description,
                )
                response = build_callback_failure_response(
                    provider_name=self.provider_name,
                    detail=provider_error_description or provider_error,
                    return_path=return_path,
                    request_id=request_id,
                )
            elif not authorization_code:
                self.oauth_dependencies.cancel_oauth_request(
                    oauth_request_id=request_id,
                    provider_error_code="missing_code",
                    provider_error_description=(
                        "Provider response is incomplete."
                    ),
                )
                response = build_callback_failure_response(
                    provider_name=self.provider_name,
                    detail="Provider response is incomplete.",
                    return_path=return_path,
                    request_id=request_id,
                )
            else:
                confirmation_token = (
                    self.oauth_dependencies.record_provider_callback(
                        oauth_request_id=request_id,
                        authorization_code=authorization_code,
                    )
                )
                response = build_callback_redirect_response(
                    outcome="success",
                    request_id=request_id,
                    confirmation_token=confirmation_token,
                    return_path=return_path,
                )
        except (
            IntegrationAuthorizationError,
            IntegrationConfigurationError,
            IntegrationCredentialError,
            IntegrationProviderError,
        ) as error:
            response = build_callback_failure_response(
                provider_name=self.provider_name,
                detail=str(error),
                return_path=return_path,
                request_id=request_id,
            )

        delete_callback_cookie(response, request_id)
        return response


class GoogleOAuthCallbackView(ProviderOAuthCallbackView):
    """Processes callbacks from Google OAuth."""

    provider = "google"
    provider_name = "Google"


class MicrosoftOAuthCallbackView(ProviderOAuthCallbackView):
    """Processes callbacks from Microsoft OAuth."""

    provider = "microsoft"
    provider_name = "Microsoft"


class ConfirmIntegrationOAuthView(AuthenticatedAPIView):
    """Completes a validated OAuth authorization for the signed-in user."""

    oauth_dependencies: OAuthDependencies | None = None

    def post(self, request):
        request_id = str(request.data.get("request_id", "")).strip()
        confirmation_token = str(
            request.data.get("confirmation_token", "")
        ).strip()
        if not request_id or not confirmation_token:
            return Response(
                {"detail": "Authorization confirmation is incomplete."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            authenticated_user, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            oauth_request = (
                self.oauth_dependencies.get_mobile_confirmation_context(
                    user_id=str(authenticated_user.id),
                    access_token=access_token,
                    request_id=request_id,
                    confirmation_token=confirmation_token,
                )
            )
            connection = self._connect_provider(oauth_request)
            self.oauth_dependencies.finalize_mobile_confirmation(
                request_id=request_id,
                confirmation_token=confirmation_token,
            )
        except (
            AccountAuthenticationError,
            IntegrationAuthorizationError,
        ):
            return Response(
                {"detail": "Authorization confirmation failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except (
            IntegrationConfigurationError,
            IntegrationCredentialError,
            IntegrationProviderError,
        ):
            return Response(
                {"detail": "No fue posible completar la conexión."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"connection": connection},
            status=status.HTTP_200_OK,
        )

    def _connect_provider(
        self,
        oauth_request: dict[str, Any],
    ) -> dict[str, Any]:
        provider = oauth_request["provider"]
        authorization_code = oauth_request["authorization_code"]
        code_verifier = oauth_request["code_verifier"]

        if provider == "google":
            token_data = (
                self.oauth_dependencies.exchange_google_authorization_code(
                    authorization_code=authorization_code,
                    code_verifier=code_verifier,
                )
            )
            user_info = self.oauth_dependencies.get_google_user_info(
                access_token=token_data["access_token"]
            )
            return self.oauth_dependencies.upsert_google_connection(
                user_id=oauth_request["user_id"],
                oauth_request=oauth_request,
                token_data=token_data,
                user_info=user_info,
            )

        if provider == "microsoft":
            token_data = (
                self.oauth_dependencies.exchange_microsoft_authorization_code(
                    authorization_code=authorization_code,
                    code_verifier=code_verifier,
                )
            )
            user_info = self.oauth_dependencies.get_microsoft_user_info(
                access_token=token_data["access_token"]
            )
            return self.oauth_dependencies.upsert_microsoft_connection(
                user_id=oauth_request["user_id"],
                oauth_request=oauth_request,
                token_data=token_data,
                user_info=user_info,
            )

        raise IntegrationAuthorizationError(
            "Unsupported integration provider."
        )
