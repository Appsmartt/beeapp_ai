from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import patch
from uuid import UUID

from django.urls import resolve
from rest_framework.test import APIRequestFactory

from apps.accounts.exceptions import AccountAuthenticationError
from apps.commercial.exceptions import CommercialAccessError, CommercialNotFoundError
from apps.commercial.views import CommercialProfileChatView


class CommercialProfileChatViewTests(unittest.TestCase):
    def setUp(self) -> None:
        self.factory = APIRequestFactory()
        self.profile_id = UUID("11111111-1111-1111-1111-111111111111")
        self.user = SimpleNamespace(id=UUID("22222222-2222-2222-2222-222222222222"))
        self.url = f"/api/commercial/profiles/{self.profile_id}/chat/"

    def _request(self):
        return self.factory.post(self.url, {}, format="json")

    def _result(self, created):
        return {
            "conversation_id": "33333333-3333-3333-3333-333333333333",
            "commercial_profile_id": str(self.profile_id),
            "client_profile_id": str(self.user.id),
            "created": created,
        }

    def _call(self, service_result=None, auth_error=None, commercial_error=None):
        view = CommercialProfileChatView.as_view()
        with patch.object(
            CommercialProfileChatView,
            "get_authenticated_user_and_access_token",
            side_effect=auth_error or [(self.user, "test-token")],
        ), patch(
            "apps.commercial.views.open_or_create_commercial_chat_conversation",
            side_effect=commercial_error or [service_result],
        ): 
            return view(self._request(), profile_id=self.profile_id)

    def test_resolves_commercial_profile_chat_url(self) -> None:
        match = resolve(self.url)
        self.assertEqual(match.url_name, "commercial-profile-chat")
        self.assertEqual(match.kwargs["profile_id"], self.profile_id)

    def test_rejects_get_method(self) -> None:
        response = CommercialProfileChatView.as_view()(
            self.factory.get(self.url),
            profile_id=self.profile_id,
        )
        self.assertEqual(response.status_code, 405)

    def test_returns_201_when_chat_is_created(self) -> None:
        response = self._call(service_result=self._result(True))
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["created"])

    def test_returns_200_when_chat_already_exists(self) -> None:
        response = self._call(service_result=self._result(False))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["created"])

    def test_returns_401_when_authentication_fails(self) -> None:
        response = self._call(
            auth_error=AccountAuthenticationError("invalid token"),
        )
        self.assertEqual(response.status_code, 401)

    def test_returns_403_when_commercial_access_is_denied(self) -> None:
        response = self._call(
            commercial_error=CommercialAccessError("forbidden"),
        )
        self.assertEqual(response.status_code, 403)

    def test_returns_404_when_commercial_profile_is_unavailable(self) -> None:
        response = self._call(
            commercial_error=CommercialNotFoundError("not found"),
        )
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
