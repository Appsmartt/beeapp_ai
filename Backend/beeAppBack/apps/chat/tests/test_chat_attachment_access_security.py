from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, patch

from apps.chat.exceptions import ChatConversationAccessError
from apps.chat.services.chat_conversation_service import (
    _require_identity_active_participant,
)


class ChatAttachmentAccessSecurityTests(TestCase):
    @patch(
        "apps.chat.services.chat_conversation_service._supabase"
    )
    def test_inactive_participant_is_access_error(self, supabase):
        response = SimpleNamespace(data=None)
        query = Mock()
        query.select.return_value = query
        query.eq.return_value = query
        query.is_.return_value = query
        query.maybe_single.return_value = query
        query.execute.return_value = response
        supabase.return_value.table.return_value = query

        with self.assertRaises(ChatConversationAccessError):
            _require_identity_active_participant(
                conversation_id=(
                    "11111111-1111-1111-1111-111111111111"
                ),
                identity_id=(
                    "22222222-2222-2222-2222-222222222222"
                ),
            )

        supabase.return_value.table.assert_called_once_with(
            "chat_conversation_participants"
        )
