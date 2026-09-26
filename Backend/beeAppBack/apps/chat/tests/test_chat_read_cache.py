from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from apps.chat.services.chat_message_service import (
    mark_chat_conversation_read,
)


class ChatReadInboxCacheTests(SimpleTestCase):
    def read_message(self, cache_error=None):
        client = Mock()
        client.rpc.return_value.execute.return_value = Mock(data=True)
        with (
            patch(
                "apps.chat.services.chat_message_service.get_owned_chat_identity"
            ),
            patch(
                "apps.chat.services.chat_message_service."
                "_require_identity_active_participant"
            ),
            patch(
                "apps.chat.services.chat_message_service._get_message_row",
                return_value={"conversation_id": "conversation-1"},
            ),
            patch(
                "apps.chat.services.chat_message_service._user_supabase",
                return_value=client,
            ),
            patch(
                "apps.chat.services.chat_message_service."
                "bump_inbox_cache_version",
                side_effect=cache_error,
            ) as invalidate,
        ):
            result = mark_chat_conversation_read(
                user_id="user-1",
                access_token="token-1",
                conversation_id="conversation-1",
                identity_id="identity-1",
                last_read_message_id="message-1",
            )
        return result, client, invalidate

    def test_confirmed_read_invalidates_own_inbox(self):
        result, client, invalidate = self.read_message()
        self.assertTrue(result)
        client.rpc.assert_called_once_with(
            "mark_chat_conversation_read",
            {
                "p_conversation_id": "conversation-1",
                "p_identity_id": "identity-1",
                "p_last_read_message_id": "message-1",
            },
        )
        invalidate.assert_called_once_with(identity_id="identity-1")

    def test_cache_failure_does_not_fail_confirmed_read(self):
        result, _, invalidate = self.read_message(
            cache_error=RuntimeError("cache unavailable")
        )
        self.assertTrue(result)
        invalidate.assert_called_once_with(identity_id="identity-1")
