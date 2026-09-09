from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from apps.chat.services.chat_conversation_service import (
    INBOX_TTL_SECONDS,
    _attach_commercial_inbox_metadata,
    _build_conversation_permissions,
    _load_commercial_inbox_links,
    get_chat_inbox,
)


class ChatCommercialInboxIntegrationTests(SimpleTestCase):
    def test_cache_miss_enriches_commercial_conversation_before_avatar_and_cache(
        self,
    ):
        client = Mock()
        rpc_query = Mock()
        client.rpc.return_value = rpc_query
        rpc_query.execute.return_value = Mock(
            data=[
                {
                    "id": "conversation-1",
                    "last_message_at": "2026-09-09T06:00:00+00:00",
                }
            ]
        )
        commercial_link = {
            "commercial_profile_id": "business-1",
            "client_profile_id": "client-1",
            "owner_profile_id": "owner-1",
            "display_name": "Negocio Uno",
            "logo_file_id": "logo-1",
        }

        def attach_avatar(*, conversations):
            self.assertTrue(conversations[0]["is_commercial"])
            self.assertEqual(
                conversations[0]["commercial"],
                commercial_link,
            )
            conversations[0]["avatar_url"] = (
                "https://cdn.example/logo-1"
            )

        with patch(
            "apps.chat.services.chat_conversation_service.get_owned_chat_identity"
        ) as get_owned_identity, patch(
            "apps.chat.services.chat_conversation_service.inbox_cache_key",
            return_value="chat:inbox:test",
        ) as make_cache_key, patch(
            "apps.chat.services.chat_conversation_service.get_cached_value",
            return_value=None,
        ) as get_cache, patch(
            "apps.chat.services.chat_conversation_service._user_supabase",
            return_value=client,
        ) as user_supabase, patch(
            "apps.chat.services.chat_conversation_service._load_commercial_inbox_links",
            return_value={"conversation-1": commercial_link},
        ) as load_commercial_links, patch(
            "apps.chat.services.chat_conversation_service._attach_inbox_avatar_urls",
            side_effect=attach_avatar,
        ) as attach_avatars, patch(
            "apps.chat.services.chat_conversation_service.set_cached_value"
        ) as set_cache:
            result = get_chat_inbox(
                user_id="user-1",
                access_token="token-1",
                identity_id="identity-1",
                limit=25,
                before_last_message_at=(
                    "2026-09-09T05:00:00+00:00"
                ),
            )

        get_owned_identity.assert_called_once_with(
            user_id="user-1",
            identity_id="identity-1",
        )
        make_cache_key.assert_called_once_with(
            user_id="user-1",
            identity_id="identity-1",
            limit=25,
            before_last_message_at="2026-09-09T05:00:00+00:00",
        )
        get_cache.assert_called_once_with(key="chat:inbox:test")
        user_supabase.assert_called_once_with(access_token="token-1")
        client.rpc.assert_called_once_with(
            "get_chat_inbox",
            {
                "p_identity_id": "identity-1",
                "p_limit": 25,
                "p_before_last_message_at": (
                    "2026-09-09T05:00:00+00:00"
                ),
            },
        )
        load_commercial_links.assert_called_once_with(
            access_token="token-1",
            conversation_ids=["conversation-1"],
        )
        attach_avatars.assert_called_once()

        expected_conversation = {
            "id": "conversation-1",
            "last_message_at": "2026-09-09T06:00:00+00:00",
            "is_commercial": True,
            "commercial": commercial_link,
            "avatar_url": "https://cdn.example/logo-1",
        }
        expected_inbox = {
            "identity_id": "identity-1",
            "conversations": [expected_conversation],
            "limit": 25,
            "next_before_last_message_at": (
                "2026-09-09T06:00:00+00:00"
            ),
        }

        self.assertEqual(result, expected_inbox)
        set_cache.assert_called_once_with(
            key="chat:inbox:test",
            value=expected_inbox,
            timeout=INBOX_TTL_SECONDS,
        )


class ChatCommercialInboxLinksLoaderTests(SimpleTestCase):
    def test_returns_empty_without_conversation_ids(self):
        with patch(
            "apps.chat.services.chat_conversation_service._user_supabase"
        ) as user_supabase:
            result = _load_commercial_inbox_links(
                access_token="token-1",
                conversation_ids=[],
            )

        self.assertEqual(result, {})
        user_supabase.assert_not_called()

    def test_returns_commercial_link_with_profile_metadata(self):
        client = Mock()
        links_query = Mock()
        profiles_query = Mock()
        client.table.side_effect = [links_query, profiles_query]
        links_query.select.return_value = links_query
        links_query.in_.return_value = links_query
        links_query.execute.return_value = Mock(
            data=[
                {
                    "conversation_id": "conversation-1",
                    "commercial_profile_id": "business-1",
                    "client_profile_id": "client-1",
                }
            ]
        )
        profiles_query.select.return_value = profiles_query
        profiles_query.in_.return_value = profiles_query
        profiles_query.execute.return_value = Mock(
            data=[
                {
                    "id": "business-1",
                    "owner_id": "owner-1",
                    "display_name": "Negocio Uno",
                    "logo_file_id": "logo-1",
                }
            ]
        )

        with patch(
            "apps.chat.services.chat_conversation_service._user_supabase",
            return_value=client,
        ) as user_supabase:
            result = _load_commercial_inbox_links(
                access_token="token-1",
                conversation_ids=["conversation-1"],
            )

        self.assertEqual(
            result,
            {
                "conversation-1": {
                    "commercial_profile_id": "business-1",
                    "client_profile_id": "client-1",
                    "owner_profile_id": "owner-1",
                    "display_name": "Negocio Uno",
                    "logo_file_id": "logo-1",
                }
            },
        )
        user_supabase.assert_called_once_with(access_token="token-1")
        self.assertEqual(
            client.table.call_args_list[0].args,
            ("commerce_chat_conversations",),
        )
        self.assertEqual(
            client.table.call_args_list[1].args,
            ("commercial_profiles",),
        )

    def test_omits_link_when_profile_is_not_accessible(self):
        client = Mock()
        links_query = Mock()
        profiles_query = Mock()
        client.table.side_effect = [links_query, profiles_query]
        links_query.select.return_value = links_query
        links_query.in_.return_value = links_query
        links_query.execute.return_value = Mock(
            data=[
                {
                    "conversation_id": "conversation-1",
                    "commercial_profile_id": "business-1",
                    "client_profile_id": "client-1",
                }
            ]
        )
        profiles_query.select.return_value = profiles_query
        profiles_query.in_.return_value = profiles_query
        profiles_query.execute.return_value = Mock(data=[])

        with patch(
            "apps.chat.services.chat_conversation_service._user_supabase",
            return_value=client,
        ):
            result = _load_commercial_inbox_links(
                access_token="token-1",
                conversation_ids=["conversation-1"],
            )

        self.assertEqual(result, {})


class ChatCommercialInboxMetadataTests(SimpleTestCase):
    def test_marks_commercial_conversation_with_context(self):
        conversations = [
            {"id": "conversation-commercial"},
        ]
        commercial_link = {
            "commercial_profile_id": "business-1",
            "client_profile_id": "client-1",
            "owner_profile_id": "owner-1",
            "display_name": "Negocio Uno",
            "logo_file_id": "logo-1",
        }

        _attach_commercial_inbox_metadata(
            conversations=conversations,
            commercial_links_by_conversation_id={
                "conversation-commercial": commercial_link,
            },
        )

        self.assertTrue(conversations[0]["is_commercial"])
        self.assertEqual(conversations[0]["commercial"], commercial_link)

    def test_marks_non_commercial_conversation_with_null_context(self):
        conversations = [
            {"id": "conversation-private"},
        ]

        _attach_commercial_inbox_metadata(
            conversations=conversations,
            commercial_links_by_conversation_id={},
        )

        self.assertFalse(conversations[0]["is_commercial"])
        self.assertIsNone(conversations[0]["commercial"])


class ChatConversationPermissionsTests(SimpleTestCase):
    def _conversation(
        self,
        *,
        conversation_type: str,
        posting_policy: str,
    ) -> dict:
        return {
            "conversation_type": conversation_type,
            "posting_policy": posting_policy,
        }

    def _participant(self, role: str) -> dict:
        return {
            "role": role,
        }

    def test_direct_participant_can_send_messages(self):
        permissions = _build_conversation_permissions(
            conversation=self._conversation(
                conversation_type="direct",
                posting_policy="all_members",
            ),
            own_participant=self._participant("member"),
        )

        self.assertTrue(permissions["can_send_messages"])
        self.assertFalse(permissions["can_invite_members"])
        self.assertFalse(permissions["can_update_group"])

    def test_normal_group_member_can_send_messages(self):
        permissions = _build_conversation_permissions(
            conversation=self._conversation(
                conversation_type="group",
                posting_policy="all_members",
            ),
            own_participant=self._participant("member"),
        )

        self.assertTrue(permissions["can_send_messages"])
        self.assertFalse(permissions["can_invite_members"])
        self.assertTrue(permissions["can_leave_group"])

    def test_normal_group_admin_can_send_and_manage(self):
        permissions = _build_conversation_permissions(
            conversation=self._conversation(
                conversation_type="group",
                posting_policy="all_members",
            ),
            own_participant=self._participant("admin"),
        )

        self.assertTrue(permissions["can_send_messages"])
        self.assertTrue(permissions["can_invite_members"])
        self.assertTrue(permissions["can_remove_members"])
        self.assertTrue(permissions["can_promote_members"])
        self.assertFalse(permissions["can_demote_admins"])
        self.assertFalse(permissions["can_update_group"])
        self.assertTrue(permissions["can_leave_group"])

    def test_normal_group_owner_has_full_group_permissions(self):
        permissions = _build_conversation_permissions(
            conversation=self._conversation(
                conversation_type="group",
                posting_policy="all_members",
            ),
            own_participant=self._participant("owner"),
        )

        self.assertTrue(permissions["can_send_messages"])
        self.assertTrue(permissions["can_invite_members"])
        self.assertTrue(permissions["can_remove_members"])
        self.assertTrue(permissions["can_promote_members"])
        self.assertTrue(permissions["can_demote_admins"])
        self.assertTrue(permissions["can_update_group"])
        self.assertTrue(permissions["can_transfer_ownership"])
        self.assertTrue(permissions["can_deactivate_group"])
        self.assertFalse(permissions["can_leave_group"])

    def test_broadcast_member_cannot_send_but_can_leave(self):
        permissions = _build_conversation_permissions(
            conversation=self._conversation(
                conversation_type="group",
                posting_policy="admins_only",
            ),
            own_participant=self._participant("member"),
        )

        self.assertFalse(permissions["can_send_messages"])
        self.assertFalse(permissions["can_invite_members"])
        self.assertFalse(permissions["can_remove_members"])
        self.assertFalse(permissions["can_promote_members"])
        self.assertFalse(permissions["can_demote_admins"])
        self.assertTrue(permissions["can_leave_group"])

    def test_broadcast_admin_can_send_and_manage_members(self):
        permissions = _build_conversation_permissions(
            conversation=self._conversation(
                conversation_type="group",
                posting_policy="admins_only",
            ),
            own_participant=self._participant("admin"),
        )

        self.assertTrue(permissions["can_send_messages"])
        self.assertTrue(permissions["can_invite_members"])
        self.assertTrue(permissions["can_remove_members"])
        self.assertTrue(permissions["can_promote_members"])
        self.assertFalse(permissions["can_demote_admins"])
        self.assertFalse(permissions["can_update_group"])
        self.assertFalse(permissions["can_transfer_ownership"])
        self.assertFalse(permissions["can_deactivate_group"])
        self.assertTrue(permissions["can_leave_group"])

    def test_broadcast_owner_can_send_and_cannot_leave(self):
        permissions = _build_conversation_permissions(
            conversation=self._conversation(
                conversation_type="group",
                posting_policy="admins_only",
            ),
            own_participant=self._participant("owner"),
        )

        self.assertTrue(permissions["can_send_messages"])
        self.assertTrue(permissions["can_update_group"])
        self.assertTrue(permissions["can_demote_admins"])
        self.assertTrue(permissions["can_transfer_ownership"])
        self.assertTrue(permissions["can_deactivate_group"])
        self.assertFalse(permissions["can_leave_group"])

    def test_non_participant_has_no_permissions(self):
        permissions = _build_conversation_permissions(
            conversation=self._conversation(
                conversation_type="group",
                posting_policy="all_members",
            ),
            own_participant=None,
        )

        self.assertIsNone(permissions["own_role"])
        self.assertFalse(permissions["is_active_participant"])
        self.assertFalse(permissions["can_send_messages"])
        self.assertFalse(permissions["can_invite_members"])
        self.assertFalse(permissions["can_remove_members"])
        self.assertFalse(permissions["can_promote_members"])
        self.assertFalse(permissions["can_demote_admins"])
        self.assertFalse(permissions["can_update_group"])
        self.assertFalse(permissions["can_transfer_ownership"])
        self.assertFalse(permissions["can_deactivate_group"])
        self.assertFalse(permissions["can_leave_group"])
