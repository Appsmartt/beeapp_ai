from __future__ import annotations

from unittest.mock import Mock

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.integrations.refactored_views.dependencies import (
    ConnectionDependencies,
    OAuthDependencies,
)
from apps.integrations.refactored_views.factory import build_view_classes


REQUEST_ID = "11111111-1111-4111-8111-111111111111"


def build_oauth_dependencies(record_callback: Mock) -> OAuthDependencies:
    return OAuthDependencies(
        build_provider_authorization_url=Mock(
            return_value="https://provider.example/authorize"
        ),
        create_oauth_request=Mock(),
        start_browser_oauth_request=Mock(),
        find_callback_oauth_request=Mock(
            return_value={"id": REQUEST_ID}
        ),
        get_callback_oauth_request=Mock(
            return_value={
                "id": REQUEST_ID,
                "provider": "google",
                "return_path": "/(main)/profile/integrations",
            }
        ),
        cancel_oauth_request=Mock(),
        record_provider_callback=record_callback,
        get_mobile_confirmation_context=Mock(),
        finalize_mobile_confirmation=Mock(),
        exchange_google_authorization_code=Mock(),
        get_google_user_info=Mock(),
        exchange_microsoft_authorization_code=Mock(),
        get_microsoft_user_info=Mock(),
        upsert_google_connection=Mock(),
        upsert_microsoft_connection=Mock(),
    )


def build_connection_dependencies() -> ConnectionDependencies:
    return ConnectionDependencies(
        list_user_connections=Mock(return_value=[]),
        get_user_connection=Mock(),
        disconnect_user_connection=Mock(),
        delete_inactive_user_connection=Mock(),
    )


class RefactoredViewFactoryContractTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_callback_receives_fresh_dependencies_for_each_request(self):
        first_record_callback = Mock(return_value="first-token")
        second_record_callback = Mock(return_value="second-token")
        oauth_factory = Mock(
            side_effect=[
                build_oauth_dependencies(first_record_callback),
                build_oauth_dependencies(second_record_callback),
            ]
        )
        classes = build_view_classes(
            oauth_dependency_factory=oauth_factory,
            connection_dependency_factory=build_connection_dependencies,
        )
        view = classes["GoogleOAuthCallbackView"].as_view()

        first_request = self.factory.get(
            "/api/integrations/oauth/callback/google/"
            "?state=first-state&code=first-code"
        )
        first_request.COOKIES[
            "beeapp_oauth_binding_" + REQUEST_ID
        ] = "first-binding"

        second_request = self.factory.get(
            "/api/integrations/oauth/callback/google/"
            "?state=second-state&code=second-code"
        )
        second_request.COOKIES[
            "beeapp_oauth_binding_" + REQUEST_ID
        ] = "second-binding"

        first_response = view(first_request)
        second_response = view(second_request)

        self.assertEqual(first_response.status_code, 302)
        self.assertEqual(second_response.status_code, 302)
        self.assertEqual(oauth_factory.call_count, 2)
        first_record_callback.assert_called_once_with(
            oauth_request_id=REQUEST_ID,
            authorization_code="first-code",
        )
        second_record_callback.assert_called_once_with(
            oauth_request_id=REQUEST_ID,
            authorization_code="second-code",
        )
