from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.integrations.exceptions import (
    IntegrationAuthorizationError,
    IntegrationProviderError,
)
from apps.integrations.views import (
    BrowserOAuthStartView,
    ConfirmIntegrationOAuthView,
    GoogleOAuthCallbackView,
    MicrosoftOAuthCallbackView,
)


REQUEST_ID = "11111111-1111-4111-8111-111111111111"
USER_ID = "22222222-2222-4222-8222-222222222222"


class OAuthCallbackV2Tests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.oauth_request = {
            "id": REQUEST_ID,
            "user_id": USER_ID,
            "provider": "google",
            "return_path": "/(main)/profile/integrations",
            "state": "state-value",
            "code_challenge": "challenge-value",
            "browser_binding_secret": "binding-secret",
            "requested_scopes": ["openid", "email"],
        }

    @patch(
        "apps.integrations.views.build_provider_authorization_url"
    )
    @patch(
        "apps.integrations.views.start_browser_oauth_request"
    )
    def test_browser_start_sets_http_only_binding_cookie(
        self,
        start_browser_request,
        build_authorization_url,
    ):
        start_browser_request.return_value = self.oauth_request
        build_authorization_url.return_value = (
            "https://provider.example/authorize"
        )

        request = self.factory.get(
            "/api/integrations/oauth/browser-start/?token=start-token",
            HTTP_HOST="192.168.1.5:8000",
        )

        response = BrowserOAuthStartView.as_view()(request)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response["Location"],
            "https://provider.example/authorize",
        )

        cookie = response.cookies[
            "beeapp_oauth_binding_" + REQUEST_ID
        ]

        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(
            cookie["path"],
            "/api/integrations/oauth/callback/",
        )

    @patch(
        "apps.integrations.views.record_provider_callback"
    )
    @patch(
        "apps.integrations.views.get_callback_oauth_request"
    )
    @patch(
        "apps.integrations.views.find_callback_oauth_request"
    )
    def test_callback_without_browser_cookie_is_generic_and_safe(
        self,
        find_callback_request,
        get_callback_request,
        record_callback,
    ):
        find_callback_request.return_value = {
            "id": REQUEST_ID,
            "return_path": "/(main)/profile/integrations",
        }
        get_callback_request.side_effect = IntegrationAuthorizationError(
            "Binding is missing."
        )

        request = self.factory.get(
            (
                "/api/integrations/oauth/callback/google/"
                "?state=state-value&code=provider-code"
            )
        )

        response = GoogleOAuthCallbackView.as_view()(request)

        self.assertEqual(response.status_code, 302)
        self.assertNotIn("request_id=", response["Location"])
        self.assertNotIn("state-value", response["Location"])
        record_callback.assert_not_called()

    @patch(
        "apps.integrations.views.record_provider_callback"
    )
    @patch(
        "apps.integrations.views.get_callback_oauth_request"
    )
    @patch(
        "apps.integrations.views.find_callback_oauth_request"
    )
    def test_callback_with_tampered_cookie_never_records_code(
        self,
        find_callback_request,
        get_callback_request,
        record_callback,
    ):
        find_callback_request.return_value = {
            "id": REQUEST_ID,
            "return_path": "/(main)/profile/integrations",
        }
        get_callback_request.side_effect = IntegrationAuthorizationError(
            "Binding is invalid."
        )

        request = self.factory.get(
            (
                "/api/integrations/oauth/callback/google/"
                "?state=state-value&code=provider-code"
            )
        )
        request.COOKIES[
            "beeapp_oauth_binding_" + REQUEST_ID
        ] = "tampered-secret"

        response = GoogleOAuthCallbackView.as_view()(request)

        self.assertEqual(response.status_code, 302)
        self.assertNotIn("request_id=", response["Location"])
        record_callback.assert_not_called()

    @patch(
        "apps.integrations.views.record_provider_callback"
    )
    @patch(
        "apps.integrations.views.get_callback_oauth_request"
    )
    @patch(
        "apps.integrations.views.find_callback_oauth_request"
    )
    def test_google_callback_with_valid_cookie_stores_code_once(
        self,
        find_callback_request,
        get_callback_request,
        record_callback,
    ):
        find_callback_request.return_value = {
            "id": REQUEST_ID,
            "return_path": "/(main)/profile/integrations",
        }
        get_callback_request.return_value = self.oauth_request
        record_callback.return_value = "confirmation-token"

        request = self.factory.get(
            (
                "/api/integrations/oauth/callback/google/"
                "?state=state-value&code=provider-code"
            )
        )
        request.COOKIES[
            "beeapp_oauth_binding_" + REQUEST_ID
        ] = "binding-secret"

        response = GoogleOAuthCallbackView.as_view()(request)

        self.assertEqual(response.status_code, 302)
        self.assertIn("request_id=" + REQUEST_ID, response["Location"])
        self.assertIn(
            "confirmation_token=confirmation-token",
            response["Location"],
        )
        record_callback.assert_called_once_with(
            oauth_request_id=REQUEST_ID,
            authorization_code="provider-code",
        )

    @patch(
        "apps.integrations.views.cancel_oauth_request"
    )
    @patch(
        "apps.integrations.views.get_callback_oauth_request"
    )
    @patch(
        "apps.integrations.views.find_callback_oauth_request"
    )
    def test_microsoft_provider_error_never_emits_confirmation_token(
        self,
        find_callback_request,
        get_callback_request,
        cancel_request,
    ):
        microsoft_request = {
            **self.oauth_request,
            "provider": "microsoft",
        }
        find_callback_request.return_value = {
            "id": REQUEST_ID,
            "return_path": "/(main)/profile/integrations",
        }
        get_callback_request.return_value = microsoft_request

        request = self.factory.get(
            (
                "/api/integrations/oauth/callback/microsoft/"
                "?state=state-value&error=access_denied"
            )
        )
        request.COOKIES[
            "beeapp_oauth_binding_" + REQUEST_ID
        ] = "binding-secret"

        response = MicrosoftOAuthCallbackView.as_view()(request)

        self.assertEqual(response.status_code, 302)
        self.assertNotIn("confirmation_token=", response["Location"])
        cancel_request.assert_called_once_with(
            oauth_request_id=REQUEST_ID,
            provider_error_code="access_denied",
            provider_error_description="",
        )

    @patch.object(
        ConfirmIntegrationOAuthView,
        "get_authenticated_user_and_access_token",
    )
    @patch(
        "apps.integrations.views.get_mobile_confirmation_context"
    )
    def test_confirmation_rejects_other_session_or_replayed_token(
        self,
        get_confirmation_context,
        authenticated,
    ):
        authenticated.return_value = (
            SimpleNamespace(id=USER_ID),
            "other-device-access-token",
        )
        get_confirmation_context.side_effect = (
            IntegrationAuthorizationError(
                "Authorization confirmation is invalid or expired."
            )
        )

        request = self.factory.post(
            "/api/integrations/oauth/confirm/",
            {
                "request_id": REQUEST_ID,
                "confirmation_token": "stolen-or-replayed-token",
            },
            format="json",
            HTTP_AUTHORIZATION="Bearer other-device-access-token",
        )

        response = ConfirmIntegrationOAuthView.as_view()(request)

        self.assertEqual(response.status_code, 400)

    @patch.object(
        ConfirmIntegrationOAuthView,
        "get_authenticated_user_and_access_token",
    )
    @patch(
        "apps.integrations.views.finalize_mobile_confirmation"
    )
    @patch(
        "apps.integrations.views.upsert_google_connection"
    )
    @patch(
        "apps.integrations.views.get_google_user_info"
    )
    @patch(
        "apps.integrations.views.exchange_google_authorization_code"
    )
    @patch(
        "apps.integrations.views.get_mobile_confirmation_context"
    )
    def test_valid_confirmation_links_then_consumes_once(
        self,
        get_confirmation_context,
        exchange_authorization_code,
        get_user_info,
        upsert_connection,
        finalize_confirmation,
        authenticated,
    ):
        authenticated.return_value = (
            SimpleNamespace(id=USER_ID),
            "access-token",
        )
        get_confirmation_context.return_value = {
            "provider": "google",
            "user_id": USER_ID,
            "authorization_code": "provider-code",
            "code_verifier": "pkce-verifier",
            "requested_capabilities": ["mail"],
        }
        exchange_authorization_code.return_value = {
            "access_token": "provider-token",
        }
        get_user_info.return_value = {"sub": "external-user"}
        upsert_connection.return_value = {"id": "connection-id"}

        request = self.factory.post(
            "/api/integrations/oauth/confirm/",
            {
                "request_id": REQUEST_ID,
                "confirmation_token": "valid-token",
            },
            format="json",
            HTTP_AUTHORIZATION="Bearer access-token",
        )

        response = ConfirmIntegrationOAuthView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["connection"]["id"],
            "connection-id",
        )
        exchange_authorization_code.assert_called_once_with(
            authorization_code="provider-code",
            code_verifier="pkce-verifier",
        )
        upsert_connection.assert_called_once()
        finalize_confirmation.assert_called_once_with(
            request_id=REQUEST_ID,
            confirmation_token="valid-token",
        )

    @patch.object(
        ConfirmIntegrationOAuthView,
        "get_authenticated_user_and_access_token",
    )
    @patch(
        "apps.integrations.views.finalize_mobile_confirmation"
    )
    @patch(
        "apps.integrations.views.upsert_google_connection"
    )
    @patch(
        "apps.integrations.views.get_google_user_info"
    )
    @patch(
        "apps.integrations.views.exchange_google_authorization_code"
    )
    @patch(
        "apps.integrations.views.get_mobile_confirmation_context"
    )
    def test_provider_failure_does_not_consume_confirmation(
        self,
        get_confirmation_context,
        exchange_authorization_code,
        get_user_info,
        upsert_connection,
        finalize_confirmation,
        authenticated,
    ):
        authenticated.return_value = (
            SimpleNamespace(id=USER_ID),
            "access-token",
        )
        get_confirmation_context.return_value = {
            "provider": "google",
            "user_id": USER_ID,
            "authorization_code": "provider-code",
            "code_verifier": "pkce-verifier",
        }
        exchange_authorization_code.side_effect = (
            IntegrationProviderError("Temporary provider failure.")
        )

        request = self.factory.post(
            "/api/integrations/oauth/confirm/",
            {
                "request_id": REQUEST_ID,
                "confirmation_token": "valid-token",
            },
            format="json",
            HTTP_AUTHORIZATION="Bearer access-token",
        )

        response = ConfirmIntegrationOAuthView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        get_user_info.assert_not_called()
        upsert_connection.assert_not_called()
        finalize_confirmation.assert_not_called()
