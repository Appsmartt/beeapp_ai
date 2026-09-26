from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from apps.chat.services.chat_receipt_service import (
    attach_chat_inbox_receipts,
)


class ChatInboxReceiptTests(SimpleTestCase):
    def setUp(self):
        self.row = {
            "id": "conversation-1",
            "last_message_id": "message-3",
            "last_message_sender_identity_id": "identity-own",
        }
        self.inbox = {
            "identity_id": "identity-own",
            "conversations": [self.row],
        }
        self.participants = [
            {
                "conversation_id": "conversation-1",
                "identity_id": "identity-other",
                "joined_at": "2026-09-01T00:00:00Z",
                "last_read_message_id": None,
                "last_delivered_message_id": None,
            }
        ]
        self.messages = [
            {
                "id": "message-3",
                "conversation_id": "conversation-1",
                "sequence_number": 3,
                "created_at": "2026-09-02T00:00:00Z",
            },
            {
                "id": "message-2",
                "conversation_id": "conversation-1",
                "sequence_number": 2,
                "created_at": "2026-09-01T12:00:00Z",
            },
        ]

    def calculate(self):
        client = Mock()

        def table(name):
            query = Mock()
            query.select.return_value = query
            query.in_.return_value = query
            query.is_.return_value = query
            query.execute.return_value = Mock(
                data=(
                    self.participants
                    if name == "chat_conversation_participants"
                    else self.messages
                )
            )
            return query

        client.table.side_effect = table
        with patch(
            "apps.chat.services.chat_receipt_service."
            "get_supabase_admin_client",
            return_value=client,
        ):
            result = attach_chat_inbox_receipts(
                self.inbox, "identity-own"
            )
        return result, client

    def test_sent_without_cursor_does_not_mutate_cached_inbox(self):
        result, _ = self.calculate()
        self.assertEqual(
            result["conversations"][0]["last_message_receipt_status"],
            "sent",
        )
        self.assertNotIn(
            "last_message_receipt_status", self.row
        )

    def test_delivered_then_read_for_last_message(self):
        self.participants[0]["last_delivered_message_id"] = "message-3"
        result, _ = self.calculate()
        self.assertEqual(
            result["conversations"][0]["last_message_receipt_status"],
            "delivered",
        )
        self.participants[0]["last_read_message_id"] = "message-3"
        result, _ = self.calculate()
        self.assertEqual(
            result["conversations"][0]["last_message_receipt_status"],
            "read",
        )

    def test_older_cursor_stays_sent(self):
        self.participants[0]["last_read_message_id"] = "message-2"
        result, _ = self.calculate()
        self.assertEqual(
            result["conversations"][0]["last_message_receipt_status"],
            "sent",
        )

    def test_incoming_message_skips_database(self):
        self.row["last_message_sender_identity_id"] = "identity-other"
        result, client = self.calculate()
        client.table.assert_not_called()
        self.assertEqual(
            result["conversations"][0]["last_message_receipt_status"],
            "sent",
        )

    def test_missing_sequence_and_no_recipient_stay_sent(self):
        self.messages[0]["sequence_number"] = None
        result, _ = self.calculate()
        self.assertEqual(
            result["conversations"][0]["last_message_receipt_status"],
            "sent",
        )
        self.messages[0]["sequence_number"] = 3
        self.participants.clear()
        result, _ = self.calculate()
        self.assertEqual(
            result["conversations"][0]["last_message_receipt_status"],
            "sent",
        )

    def test_group_requires_all_eligible_recipients(self):
        self.participants.append({
            "conversation_id": "conversation-1",
            "identity_id": "identity-third",
            "joined_at": "2026-09-01T00:00:00Z",
            "last_read_message_id": None,
            "last_delivered_message_id": None,
        })
        self.participants[0]["last_read_message_id"] = "message-3"
        result, _ = self.calculate()
        self.assertEqual(
            result["conversations"][0]["last_message_receipt_status"],
            "sent",
        )
        self.participants[1]["last_delivered_message_id"] = "message-3"
        result, _ = self.calculate()
        self.assertEqual(
            result["conversations"][0]["last_message_receipt_status"],
            "delivered",
        )



class ChatDeliveredAuthorizationTests(SimpleTestCase):
    def test_rejects_message_from_another_conversation_before_rpc(self):
        from apps.chat.exceptions import ChatMessageNotFoundError
        from apps.chat.services.chat_message_service import (
            mark_chat_conversation_delivered,
        )

        with patch(
            "apps.chat.services.chat_message_service.get_owned_chat_identity"
        ), patch(
            "apps.chat.services.chat_message_service."
            "_require_identity_active_participant"
        ), patch(
            "apps.chat.services.chat_message_service._get_message_row",
            return_value={"conversation_id": "conversation-other"},
        ), patch(
            "apps.chat.services.chat_message_service._user_supabase"
        ) as user_client:
            with self.assertRaises(ChatMessageNotFoundError):
                mark_chat_conversation_delivered(
                    user_id="user-1",
                    access_token="token-1",
                    conversation_id="conversation-1",
                    identity_id="identity-1",
                    last_delivered_message_id="message-1",
                )
        user_client.assert_not_called()

    def test_valid_message_calls_authenticated_delivery_rpc(self):
        from apps.chat.services.chat_message_service import (
            mark_chat_conversation_delivered,
        )

        client = Mock()
        client.rpc.return_value.execute.return_value = Mock(data=True)
        with patch(
            "apps.chat.services.chat_message_service.get_owned_chat_identity"
        ) as owned, patch(
            "apps.chat.services.chat_message_service."
            "_require_identity_active_participant"
        ) as participant, patch(
            "apps.chat.services.chat_message_service._get_message_row",
            return_value={"conversation_id": "conversation-1"},
        ), patch(
            "apps.chat.services.chat_message_service._user_supabase",
            return_value=client,
        ) as user_client:
            marked = mark_chat_conversation_delivered(
                user_id="user-1",
                access_token="token-1",
                conversation_id="conversation-1",
                identity_id="identity-1",
                last_delivered_message_id="message-1",
            )

        self.assertTrue(marked)
        owned.assert_called_once_with(
            user_id="user-1", identity_id="identity-1"
        )
        participant.assert_called_once_with(
            conversation_id="conversation-1",
            identity_id="identity-1",
        )
        user_client.assert_called_once_with(
            access_token="token-1"
        )
        client.rpc.assert_called_once_with(
            "mark_chat_conversation_delivered",
            {
                "p_conversation_id": "conversation-1",
                "p_identity_id": "identity-1",
                "p_last_delivered_message_id": "message-1",
            },
        )
