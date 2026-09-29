from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from apps.chat.services.chat_message_service import (
    create_chat_message_reaction,
    delete_chat_message_reaction,
)


class ChatMessageReactionCacheTests(SimpleTestCase):
    def test_create_invalidates_conversation_messages(self):
        client = Mock()
        reaction = {
            "id": "reaction-1",
            "message_id": "message-1",
            "identity_id": "identity-1",
            "emoji": "❤️",
        }
        with (
            patch("apps.chat.services.chat_message_service.get_owned_chat_identity"),
            patch("apps.chat.services.chat_message_service._require_identity_active_participant"),
            patch("apps.chat.services.chat_message_service._get_message_row",
                  return_value={"conversation_id": "conversation-1"}),
            patch("apps.chat.services.chat_message_service._user_supabase",
                  return_value=client),
            patch("apps.chat.services.chat_message_service._extract_first_row",
                  return_value=reaction),
            patch("apps.chat.services.chat_message_service._enrich_reactions",
                  return_value=[reaction]),
            patch("apps.chat.services.chat_message_service.bump_conversation_cache_version") as bump,
        ):
            result = create_chat_message_reaction(
                user_id="user-1", access_token="token-1",
                message_id="message-1", identity_id="identity-1", emoji="❤️",
            )
        self.assertEqual(result, reaction)
        bump.assert_called_once_with(conversation_id="conversation-1")

    def test_delete_invalidates_conversation_messages(self):
        client = Mock()
        with (
            patch("apps.chat.services.chat_message_service.get_owned_chat_identity"),
            patch("apps.chat.services.chat_message_service._require_user_conversation_access"),
            patch("apps.chat.services.chat_message_service._get_message_row",
                  return_value={"conversation_id": "conversation-1"}),
            patch("apps.chat.services.chat_message_service._user_supabase",
                  return_value=client),
            patch("apps.chat.services.chat_message_service._response_rows",
                  return_value=[{"id": "reaction-1"}]),
            patch("apps.chat.services.chat_message_service.bump_conversation_cache_version") as bump,
        ):
            delete_chat_message_reaction(
                user_id="user-1", access_token="token-1",
                message_id="message-1", identity_id="identity-1", emoji="❤️",
            )
        bump.assert_called_once_with(conversation_id="conversation-1")

    def test_reaction_batch_reads_second_page(self):
        from apps.chat.services.chat_message_service import (
            _get_reactions_by_message_ids,
        )

        first = [
            {"id": f"reaction-{i}", "message_id": "message-1"}
            for i in range(500)
        ]
        second = [{"id": "reaction-500", "message_id": "message-1"}]
        with (
            patch("apps.chat.services.chat_message_service._supabase") as client,
            patch("apps.chat.services.chat_message_service._response_rows",
                  side_effect=[first, second]),
            patch("apps.chat.services.chat_message_service._enrich_reactions",
                  side_effect=lambda reactions: reactions),
        ):
            result = _get_reactions_by_message_ids(message_ids=["message-1"])
        self.assertEqual(len(result["message-1"]), 501)
        query = client.return_value.table.return_value.select.return_value
        query = query.in_.return_value.order.return_value.order.return_value
        self.assertEqual(query.range.call_count, 2)
        query.range.assert_any_call(0, 499)
        query.range.assert_any_call(500, 999)

    def test_identity_enrichment_queries_in_batches(self):
        from apps.chat.services.chat_message_service import _get_identities_by_ids
        ids = [f"identity-{i}" for i in range(401)]
        rows = [[{"id": x} for x in ids[i:i + 200]] for i in range(0, 401, 200)]
        with patch("apps.chat.services.chat_message_service._supabase") as client, patch(
            "apps.chat.services.chat_message_service._response_rows", side_effect=rows
        ), patch(
            "apps.chat.services.chat_message_service._get_profiles_by_ids", return_value={}
        ), patch(
            "apps.chat.services.chat_message_service._get_commercial_profiles_by_ids", return_value={}
        ), patch(
            "apps.chat.services.chat_message_service._serialize_chat_identity",
            side_effect=lambda identity, profile, commercial_profile: {"id": identity["id"]}
        ):
            result = _get_identities_by_ids(identity_ids=ids)
        self.assertEqual(len(result), 401)
        query = client.return_value.table.return_value.select.return_value
        self.assertEqual(query.in_.call_count, 3)
