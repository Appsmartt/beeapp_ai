from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import Mock

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.integrations.exceptions import (
    IntegrationAuthorizationError,
    IntegrationProviderError,
)
from apps.integrations.refactored_views.dependencies import OAuthDependencies
from apps.integrations.refactored_views.oauth_callbacks import (
    BrowserOAuthStartView,
    ConfirmIntegrationOAuthView,
    GoogleOAuthCallbackView,
)
from apps.integrations.refactored_views.oauth_redirects import (
    OAUTH_CALLBACK_COOKIE_PREFIX,
)


REQUEST_ID = "11111111-1111-4111-8111-111111111111"
USER_ID = "22222222-2222-4222-8222-222222222222"


def build_oauth_dependencies() -> OAuthDependencies:
    return OAuthDependencies(
        build_provider_authorization_url=Mock(
            return_value="https://provider.example/authorize"
        ),
        create_oauth_request=Mock(),
        start_browser_oauth_request=Mock(),
        find_callback_oauth_request=Mock(),
        get_callback_oauth_request=Mock(),
        cancel_oauth_request=Mock(),
        record_provider_callback=Mock(),
        get_mobile_confirmation_context=Mock(),
        finalize_mobile_confirmation=Mock(),
        exchange_google_authorization_code=Mock(),
        get_google_user_info=Mock(),
        exchange_microsoft_authorization_code=Mock(),
        get_microsoft_user_info=Mock(),
        upsert_google_connection=Mock(),
        upsert_microsoft_connection=Mock(),
    )


class RefactoredOAuthViewContractTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.dependencies = build_oauth_dependencies()
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

    def test_browser_start_sets_secure_binding_cookie(self):
        self.dependencies.start_browser_oauth_request.return_value = (
            self.oauth_request
        )

        class TestBrowserOAuthStartView(BrowserOAuthStartView):
            oauth_dependencies = self.dependencies

        request = self.factory.get(
            "/api/integrations/oauth/browser-start/?token=start-token",
            HTTP_HOST="beeappai-production.up.railway.app",
        )
        response = TestBrowserOAuthStartView.as_view()(request)

        cookie = response.cookies[
            OAUTH_CALLBACK_COOKIE_PREFIX + REQUEST_ID
        ]
        self.assertEqual(response.status_code, 302)
        self.assertTrue(cookie["secure"])
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")

    def test_callback_with_invalid_binding_never_records_code(self):
        self.dependencies.find_callback_oauth_request.return_value = {
            "id": REQUEST_ID
        }
        self.dependencies.get_callback_oauth_request.side_effect = (
            IntegrationAuthorizationError("Invalid binding.")
        )

        class TestGoogleOAuthCallbackView(GoogleOAuthCallbackView):
            oauth_dependencies = self.dependencies

        request = self.factory.get(
            "/api/integrations/oauth/callback/google/"
            "?state=state-value&code=provider-code"
        )
        request.COOKIES[
            OAUTH_CALLBACK_COOKIE_PREFIX + REQUEST_ID
        ] = "tampered-secret"
        response = TestGoogleOAuthCallbackView.as_view()(request)

        self.assertEqual(response.status_code, 302)
        self.assertNotIn("request_id=", response["Location"])
        self.dependencies.record_provider_callback.assert_not_called()

    def test_callback_with_valid_binding_records_code_once(self):
        self.dependencies.find_callback_oauth_request.return_value = {
            "id": REQUEST_ID
        }
        self.dependencies.get_callback_oauth_request.return_value = (
            self.oauth_request
        )
        self.dependencies.record_provider_callback.return_value = (
            "confirmation-token"
        )

        class TestGoogleOAuthCallbackView(GoogleOAuthCallbackView):
            oauth_dependencies = self.dependencies

        request = self.factory.get(
            "/api/integrations/oauth/callback/google/"
            "?state=state-value&code=provider-code"
        )
        request.COOKIES[
            OAUTH_CALLBACK_COOKIE_PREFIX + REQUEST_ID
        ] = "binding-secret"
        response = TestGoogleOAuthCallbackView.as_view()(request)

        self.assertEqual(response.status_code, 302)
        self.assertIn("request_id=" + REQUEST_ID, response["Location"])
        self.dependencies.record_provider_callback.assert_called_once_with(
            oauth_request_id=REQUEST_ID,
            authorization_code="provider-code",
        )

    def test_confirmation_links_before_consuming_token(self):
        self.dependencies.get_mobile_confirmation_context.return_value = {
            "provider": "google",
            "user_id": USER_ID,
            "authorization_code": "provider-code",
            "code_verifier": "pkce-verifier",
        }
        self.dependencies.exchange_google_authorization_code.return_value = {
            "access_token": "provider-token"
        }
        self.dependencies.get_google_user_info.return_value = {
            "sub": "external-user"
        }
        self.dependencies.upsert_google_connection.return_value = {
            "id": "connection-id"
        }

        class TestConfirmIntegrationOAuthView(
            ConfirmIntegrationOAuthView
        ):
            oauth_dependencies = self.dependencies

            def get_authenticated_user_and_access_token(self, request):
                return SimpleNamespace(id=USER_ID), "access-token"

        request = self.factory.post(
            "/api/integrations/oauth/confirm/",
            {
                "request_id": REQUEST_ID,
                "confirmation_token": "valid-token",
            },
            format="json",
        )
        response = TestConfirmIntegrationOAuthView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.dependencies.upsert_google_connection.assert_called_once()
        self.dependencies.finalize_mobile_confirmation.assert_called_once_with(
            request_id=REQUEST_ID,
            confirmation_token="valid-token",
        )

    def test_provider_failure_does_not_consume_confirmation(self):
        self.dependencies.get_mobile_confirmation_context.return_value = {
            "provider": "google",
            "user_id": USER_ID,
            "authorization_code": "provider-code",
            "code_verifier": "pkce-verifier",
        }
        self.dependencies.exchange_google_authorization_code.side_effect = (
            IntegrationProviderError("Provider failure.")
        )

        class TestConfirmIntegrationOAuthView(
            ConfirmIntegrationOAuthView
        ):
            oauth_dependencies = self.dependencies

            def get_authenticated_user_and_access_token(self, request):
                return SimpleNamespace(id=USER_ID), "access-token"

        request = self.factory.post(
            "/api/integrations/oauth/confirm/",
            {
                "request_id": REQUEST_ID,
                "confirmation_token": "valid-token",
            },
            format="json",
        )
        response = TestConfirmIntegrationOAuthView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.dependencies.upsert_google_connection.assert_not_called()
        self.dependencies.finalize_mobile_confirmation.assert_not_called()
