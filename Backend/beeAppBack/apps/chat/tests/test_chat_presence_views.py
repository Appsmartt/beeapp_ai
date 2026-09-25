from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import ChatIdentityNotFoundError
from apps.chat.presence_views import (
    ChatPresenceSnapshotView,
    ChatPresenceStateView,
)


IDENTITY = "11111111-1111-4111-8111-111111111111"
OTHER_IDENTITY = "22222222-2222-4222-8222-222222222222"


class ChatPresenceViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth = patch.object(
            AuthenticatedAPIView,
            "get_authenticated_user",
            return_value=SimpleNamespace(id=IDENTITY),
        )
        self.token = patch.object(
            AuthenticatedAPIView,
            "get_bearer_access_token",
            return_value="test-token",
        )
        self.auth.start()
        self.token.start()
        self.addCleanup(self.auth.stop)
        self.addCleanup(self.token.stop)

    def test_state_updates_only_requested_identity(self):
        with patch(
            "apps.chat.presence_views.set_chat_identity_presence",
            return_value=True,
        ) as service:
            request = self.factory.post(
                "/api/chat/presence/state/",
                {"identity_id": IDENTITY, "online": True},
                format="json",
                HTTP_AUTHORIZATION="Bearer test-token",
            )
            response = ChatPresenceStateView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"online": True})
        service.assert_called_once_with(
            user_id=IDENTITY,
            access_token="test-token",
            identity_id=IDENTITY,
            online=True,
        )

    def test_snapshot_rejects_more_than_one_hundred_targets(self):
        request = self.factory.post(
            "/api/chat/presence/snapshot/",
            {
                "viewer_identity_id": IDENTITY,
                "target_identity_ids": [OTHER_IDENTITY] * 101,
            },
            format="json",
            HTTP_AUTHORIZATION="Bearer test-token",
        )
        response = ChatPresenceSnapshotView.as_view()(request)
        self.assertEqual(response.status_code, 400)

    def test_snapshot_rejects_foreign_viewer(self):
        with patch(
            "apps.chat.presence_views.list_chat_inbox_presence",
            side_effect=ChatIdentityNotFoundError(
                "Identity is not owned."
            ),
        ):
            request = self.factory.post(
                "/api/chat/presence/snapshot/",
                {
                    "viewer_identity_id": IDENTITY,
                    "target_identity_ids": [OTHER_IDENTITY],
                },
                format="json",
                HTTP_AUTHORIZATION="Bearer test-token",
            )
            response = ChatPresenceSnapshotView.as_view()(request)

        self.assertEqual(response.status_code, 404)

    def test_state_rejects_invalid_session(self):
        with patch.object(
            AuthenticatedAPIView,
            "get_authenticated_user",
            side_effect=AccountAuthenticationError(
                "Invalid session."
            ),
        ):
            request = self.factory.post(
                "/api/chat/presence/state/",
                {"identity_id": IDENTITY, "online": True},
                format="json",
                HTTP_AUTHORIZATION="Bearer test-token",
            )
            response = ChatPresenceStateView.as_view()(request)

        self.assertEqual(response.status_code, 401)
