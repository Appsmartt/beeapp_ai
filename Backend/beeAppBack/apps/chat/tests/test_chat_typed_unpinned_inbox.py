from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from apps.chat.exceptions import ChatInboxError
from apps.chat.serializers import ChatTypedInboxQuerySerializer
from apps.chat.services.chat_conversation.inbox import (
    get_chat_unpinned_inbox_by_type,
)


IDENTITY_ID = "11111111-1111-1111-1111-111111111111"
BEFORE_ID = "22222222-2222-2222-2222-222222222222"
SORT_AT = "2026-09-25T12:00:00+00:00"


class ChatTypedInboxSerializerTests(SimpleTestCase):
    def test_accepts_first_page_and_cursor_page(self):
        for data in (
            {
                "identity_id": IDENTITY_ID,
                "conversation_type": "direct",
                "limit": 10,
            },
            {
                "identity_id": IDENTITY_ID,
                "conversation_type": "group",
                "limit": 5,
                "before_sort_at": SORT_AT,
                "before_id": BEFORE_ID,
            },
        ):
            with self.subTest(data=data):
                serializer = ChatTypedInboxQuerySerializer(data=data)
                self.assertTrue(
                    serializer.is_valid(),
                    serializer.errors,
                )

    def test_rejects_invalid_type_limit_and_partial_cursor(self):
        base = {
            "identity_id": IDENTITY_ID,
            "conversation_type": "direct",
        }
        for extra in (
            {"conversation_type": "other"},
            {"limit": 6},
            {"before_sort_at": SORT_AT},
            {"before_id": BEFORE_ID},
        ):
            with self.subTest(extra=extra):
                serializer = ChatTypedInboxQuerySerializer(
                    data={**base, **extra},
                )
                self.assertFalse(serializer.is_valid())


class ChatTypedInboxServiceTests(SimpleTestCase):
    def test_queries_requested_identity_and_returns_composite_cursor(self):
        client = Mock()
        client.rpc.return_value.execute.return_value = Mock(
            data=[
                {
                    "conversation_id": BEFORE_ID,
                    "conversation_type": "group",
                    "sort_at": SORT_AT,
                    "is_pinned": False,
                }
            ]
        )
        with patch(
            "apps.chat.services.chat_conversation.inbox."
            "get_owned_chat_identity"
        ) as owned, patch(
            "apps.chat.services.chat_conversation.inbox."
            "_user_supabase",
            return_value=client,
        ), patch(
            "apps.chat.services.chat_conversation.inbox_enrichment."
            "_load_commercial_inbox_links",
            return_value={},
        ), patch(
            "apps.chat.services.chat_conversation.inbox_enrichment."
            "_attach_inbox_avatar_urls"
        ):
            result = get_chat_unpinned_inbox_by_type(
                user_id="user-1",
                access_token="token-1",
                identity_id=IDENTITY_ID,
                conversation_type="group",
                limit=5,
                before_sort_at=SORT_AT,
                before_id=BEFORE_ID,
            )

        owned.assert_called_once_with(
            user_id="user-1",
            identity_id=IDENTITY_ID,
        )
        client.rpc.assert_called_once_with(
            "get_chat_unpinned_inbox_by_type",
            {
                "p_identity_id": IDENTITY_ID,
                "p_conversation_type": "group",
                "p_limit": 5,
                "p_before_sort_at": SORT_AT,
                "p_before_id": BEFORE_ID,
            },
        )
        self.assertEqual(result["conversations"][0]["id"], BEFORE_ID)
        self.assertEqual(result["next_before_sort_at"], SORT_AT)
        self.assertEqual(result["next_before_id"], BEFORE_ID)
        self.assertFalse(result["has_more"])

    def test_rejects_invalid_type_and_partial_cursor_before_rpc(self):
        for options in (
            {"conversation_type": "other", "limit": 10},
            {"conversation_type": "direct", "limit": 6},
            {
                "conversation_type": "direct",
                "limit": 5,
                "before_sort_at": SORT_AT,
            },
        ):
            with self.subTest(options=options):
                with self.assertRaises(ChatInboxError):
                    get_chat_unpinned_inbox_by_type(
                        user_id="user-1",
                        access_token="token-1",
                        identity_id=IDENTITY_ID,
                        **options,
                    )

from types import SimpleNamespace

from rest_framework.test import APIRequestFactory

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import ChatConversationAccessError
from apps.chat.views import ChatTypedInboxView


class ChatTypedInboxViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.url = "/api/chat/inbox/by-type/"

    def test_get_passes_type_cursor_and_attaches_receipts(self):
        request = self.factory.get(
            self.url,
            {
                "identity_id": IDENTITY_ID,
                "conversation_type": "group",
                "limit": 5,
                "before_sort_at": SORT_AT,
                "before_id": BEFORE_ID,
            },
            HTTP_AUTHORIZATION="Bearer test-token",
        )
        inbox = {
            "identity_id": IDENTITY_ID,
            "conversation_type": "group",
            "conversations": [{"id": BEFORE_ID}],
            "limit": 5,
            "has_more": False,
            "next_before_sort_at": SORT_AT,
            "next_before_id": BEFORE_ID,
        }
        with patch.object(
            AuthenticatedAPIView,
            "get_authenticated_user",
            return_value=SimpleNamespace(id="user-1"),
        ), patch(
            "apps.chat.views._get_access_token",
            return_value="test-token",
        ), patch(
            "apps.chat.views.get_chat_unpinned_inbox_by_type",
            return_value=inbox,
        ) as service, patch(
            "apps.chat.views.attach_chat_inbox_receipts",
            return_value={**inbox, "receipts_attached": True},
        ) as receipts:
            response = ChatTypedInboxView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["receipts_attached"])
        service.assert_called_once_with(
            user_id="user-1",
            access_token="test-token",
            identity_id=IDENTITY_ID,
            conversation_type="group",
            limit=5,
            before_sort_at=SORT_AT,
            before_id=BEFORE_ID,
        )
        receipts.assert_called_once_with(
            inbox=inbox,
            identity_id=IDENTITY_ID,
        )

    def test_foreign_identity_returns_not_found(self):
        request = self.factory.get(
            self.url,
            {
                "identity_id": IDENTITY_ID,
                "conversation_type": "direct",
            },
            HTTP_AUTHORIZATION="Bearer test-token",
        )
        with patch.object(
            AuthenticatedAPIView,
            "get_authenticated_user",
            return_value=SimpleNamespace(id="user-1"),
        ), patch(
            "apps.chat.views._get_access_token",
            return_value="test-token",
        ), patch(
            "apps.chat.views.get_chat_unpinned_inbox_by_type",
            side_effect=ChatConversationAccessError("Not owned"),
        ):
            response = ChatTypedInboxView.as_view()(request)

        self.assertEqual(response.status_code, 404)

    def test_invalid_session_returns_unauthorized(self):
        request = self.factory.get(
            self.url,
            {
                "identity_id": IDENTITY_ID,
                "conversation_type": "direct",
            },
            HTTP_AUTHORIZATION="Bearer test-token",
        )
        with patch.object(
            AuthenticatedAPIView,
            "get_authenticated_user",
            side_effect=AccountAuthenticationError("Invalid"),
        ):
            response = ChatTypedInboxView.as_view()(request)

        self.assertEqual(response.status_code, 401)
