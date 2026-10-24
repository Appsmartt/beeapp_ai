from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatGroupError,
    ChatGroupInviteError,
)
from apps.chat.services.chat_group import (
    create_chat_group,
    deactivate_chat_group,
    invite_identity_to_chat_group,
    leave_chat_group,
    set_chat_group_participant_role,
    transfer_chat_group_ownership,
)
from apps.chat.services.chat_group.validation import (
    _extract_rpc_uuid,
    _is_future_timestamp,
    _normalize_description,
    _normalize_manageable_role,
    _normalize_posting_policy,
    _normalize_required_name,
)


class ChatGroupValidationTests(SimpleTestCase):
    def test_name_normalization_preserves_valid_name(self):
        self.assertEqual(
            _normalize_required_name("  Bee group  "),
            "Bee group",
        )

    def test_name_normalization_rejects_empty_name(self):
        with self.assertRaises(ChatGroupError):
            _normalize_required_name("   ")

    def test_name_normalization_rejects_name_over_limit(self):
        with self.assertRaises(ChatGroupError):
            _normalize_required_name("a" * 121)

    def test_description_normalization_handles_blank_and_limit(self):
        self.assertIsNone(_normalize_description("   "))
        self.assertEqual(
            _normalize_description("  Description  "),
            "Description",
        )

        with self.assertRaises(ChatGroupError):
            _normalize_description("a" * 2001)

    def test_policy_and_role_normalization_reject_invalid_values(self):
        self.assertEqual(
            _normalize_posting_policy("admins_only"),
            "admins_only",
        )
        self.assertEqual(
            _normalize_manageable_role("admin"),
            "admin",
        )

        with self.assertRaises(ChatGroupError):
            _normalize_posting_policy("public")

        with self.assertRaises(ChatGroupError):
            _normalize_manageable_role("owner")

    def test_timestamp_and_rpc_uuid_helpers(self):
        future_value = (
            datetime.now(timezone.utc) + timedelta(minutes=5)
        ).isoformat()

        self.assertTrue(_is_future_timestamp(future_value))
        self.assertEqual(
            _extract_rpc_uuid(
                [{"create_group_chat": "conversation-id"}],
                "create_group_chat",
            ),
            "conversation-id",
        )
        self.assertEqual(
            _extract_rpc_uuid({"id": "fallback-id"}, "missing"),
            "fallback-id",
        )
        self.assertIsNone(_extract_rpc_uuid([], "missing"))


class ChatGroupManagementBehaviorTests(SimpleTestCase):
    @patch(
        "apps.chat.services.chat_group.management.get_conversation"
    )
    @patch(
        "apps.chat.services.chat_group.management._user_supabase"
    )
    @patch(
        "apps.chat.services.chat_group.management.get_owned_chat_identity"
    )
    def test_create_group_uses_expected_rpc_parameters(
        self,
        mock_owned_identity,
        mock_user_supabase,
        mock_get_conversation,
    ):
        rpc_response = SimpleNamespace(data="conversation-id")
        rpc_call = MagicMock()
        rpc_call.execute.return_value = rpc_response
        user_client = MagicMock()
        user_client.rpc.return_value = rpc_call
        mock_user_supabase.return_value = user_client
        mock_get_conversation.return_value = {
            "id": "conversation-id",
        }

        result = create_chat_group(
            user_id="user-id",
            access_token="test-token",
            creator_identity_id="identity-id",
            name="  Bee group  ",
            posting_policy="admins_only",
            description="  Group description  ",
        )

        self.assertEqual(result, {"id": "conversation-id"})
        mock_owned_identity.assert_called_once_with(
            user_id="user-id",
            identity_id="identity-id",
        )
        user_client.rpc.assert_called_once_with(
            "create_group_chat",
            {
                "p_creator_identity_id": "identity-id",
                "p_name": "Bee group",
                "p_posting_policy": "admins_only",
                "p_description": "Group description",
                "p_image_file_id": None,
            },
        )
        mock_get_conversation.assert_called_once_with(
            user_id="user-id",
            conversation_id="conversation-id",
            include_participants=True,
        )

    @patch(
        "apps.chat.services.chat_group.management._get_group_conversation"
    )
    @patch(
        "apps.chat.services.chat_group.management._user_supabase"
    )
    @patch(
        "apps.chat.services.chat_group.management.get_owned_chat_identity"
    )
    def test_deactivate_group_selects_sole_owner_rpc(
        self,
        mock_owned_identity,
        mock_user_supabase,
        mock_group_conversation,
    ):
        rpc_call = MagicMock()
        rpc_call.execute.return_value = SimpleNamespace(data=True)
        user_client = MagicMock()
        user_client.rpc.return_value = rpc_call
        mock_user_supabase.return_value = user_client

        deactivate_chat_group(
            user_id="user-id",
            access_token="test-token",
            conversation_id="conversation-id",
            owner_identity_id="owner-id",
            sole_owner_only=True,
        )

        user_client.rpc.assert_called_once_with(
            "deactivate_chat_group_if_sole_owner",
            {
                "p_conversation_id": "conversation-id",
                "p_owner_identity_id": "owner-id",
            },
        )


class ChatGroupInvitationBehaviorTests(SimpleTestCase):
    @patch(
        "apps.chat.services.chat_group.invitations.get_chat_group_invite"
    )
    @patch(
        "apps.chat.services.chat_group.invitations._user_supabase"
    )
    @patch(
        "apps.chat.services.chat_group.invitations.get_chat_identity"
    )
    @patch(
        "apps.chat.services.chat_group.invitations._get_group_conversation"
    )
    @patch(
        "apps.chat.services.chat_group.invitations.get_owned_chat_identity"
    )
    def test_invite_group_member_uses_expected_rpc_parameters(
        self,
        mock_owned_identity,
        mock_group_conversation,
        mock_get_identity,
        mock_user_supabase,
        mock_get_invite,
    ):
        rpc_call = MagicMock()
        rpc_call.execute.return_value = SimpleNamespace(
            data="invite-id"
        )
        user_client = MagicMock()
        user_client.rpc.return_value = rpc_call
        mock_user_supabase.return_value = user_client
        mock_get_invite.return_value = {"id": "invite-id"}

        result = invite_identity_to_chat_group(
            user_id="user-id",
            access_token="test-token",
            conversation_id="conversation-id",
            actor_identity_id="actor-id",
            invited_identity_id="target-id",
        )

        self.assertEqual(result, {"id": "invite-id"})
        user_client.rpc.assert_called_once_with(
            "invite_identity_to_chat_group",
            {
                "p_conversation_id": "conversation-id",
                "p_actor_identity_id": "actor-id",
                "p_invited_identity_id": "target-id",
                "p_expires_at": None,
            },
        )

    def test_invite_rejects_actor_as_target_before_rpc(self):
        with patch(
            "apps.chat.services.chat_group.invitations.get_owned_chat_identity"
        ), patch(
            "apps.chat.services.chat_group.invitations._get_group_conversation"
        ), patch(
            "apps.chat.services.chat_group.invitations.get_chat_identity"
        ), patch(
            "apps.chat.services.chat_group.invitations._user_supabase"
        ) as mock_user_supabase:
            with self.assertRaises(ChatGroupInviteError):
                invite_identity_to_chat_group(
                    user_id="user-id",
                    access_token="test-token",
                    conversation_id="conversation-id",
                    actor_identity_id="same-id",
                    invited_identity_id="same-id",
                )

        mock_user_supabase.assert_not_called()


class ChatGroupMembershipBehaviorTests(SimpleTestCase):
    def test_transfer_rejects_same_owner_before_rpc(self):
        with patch(
            "apps.chat.services.chat_group.membership.get_owned_chat_identity"
        ), patch(
            "apps.chat.services.chat_group.membership._user_supabase"
        ) as mock_user_supabase:
            with self.assertRaises(ChatGroupError):
                transfer_chat_group_ownership(
                    user_id="user-id",
                    access_token="test-token",
                    conversation_id="conversation-id",
                    current_owner_identity_id="same-id",
                    new_owner_identity_id="same-id",
                )

        mock_user_supabase.assert_not_called()

    @patch(
        "apps.chat.services.chat_group.membership._get_group_conversation"
    )
    @patch(
        "apps.chat.services.chat_group.membership._user_supabase"
    )
    @patch(
        "apps.chat.services.chat_group.membership.get_owned_chat_identity"
    )
    def test_set_role_maps_permission_rpc_error(
        self,
        mock_owned_identity,
        mock_user_supabase,
        mock_group_conversation,
    ):
        rpc_call = MagicMock()
        rpc_call.execute.side_effect = Exception(
            "CHAT_ACTOR_CANNOT_CHANGE_TARGET_ROLE"
        )
        user_client = MagicMock()
        user_client.rpc.return_value = rpc_call
        mock_user_supabase.return_value = user_client

        with self.assertRaises(ChatConversationAccessError):
            set_chat_group_participant_role(
                user_id="user-id",
                access_token="test-token",
                conversation_id="conversation-id",
                actor_identity_id="actor-id",
                target_identity_id="target-id",
                role="admin",
            )

    @patch(
        "apps.chat.services.chat_group.membership._get_group_conversation"
    )
    @patch(
        "apps.chat.services.chat_group.membership._require_identity_active_participant"
    )
    @patch(
        "apps.chat.services.chat_group.membership._user_supabase"
    )
    @patch(
        "apps.chat.services.chat_group.membership.get_owned_chat_identity"
    )
    def test_leave_maps_owner_cannot_leave_error(
        self,
        mock_owned_identity,
        mock_user_supabase,
        mock_active_participant,
        mock_group_conversation,
    ):
        rpc_call = MagicMock()
        rpc_call.execute.side_effect = Exception(
            "CHAT_GROUP_OWNER_CANNOT_LEAVE"
        )
        user_client = MagicMock()
        user_client.rpc.return_value = rpc_call
        mock_user_supabase.return_value = user_client

        with self.assertRaisesRegex(
            ChatGroupError,
            "must transfer ownership",
        ):
            leave_chat_group(
                user_id="user-id",
                access_token="test-token",
                conversation_id="conversation-id",
                identity_id="owner-id",
            )

    @patch(
        "apps.chat.services.chat_group.membership._get_group_conversation"
    )
    @patch(
        "apps.chat.services.chat_group.membership._user_supabase"
    )
    @patch(
        "apps.chat.services.chat_group.membership.get_owned_chat_identity"
    )
    def test_set_role_maps_missing_group_rpc_error(
        self,
        mock_owned_identity,
        mock_user_supabase,
        mock_group_conversation,
    ):
        rpc_call = MagicMock()
        rpc_call.execute.side_effect = Exception(
            "CHAT_GROUP_NOT_FOUND_OR_INACTIVE"
        )
        user_client = MagicMock()
        user_client.rpc.return_value = rpc_call
        mock_user_supabase.return_value = user_client

        with self.assertRaises(ChatConversationNotFoundError):
            set_chat_group_participant_role(
                user_id="user-id",
                access_token="test-token",
                conversation_id="conversation-id",
                actor_identity_id="actor-id",
                target_identity_id="target-id",
                role="member",
            )
