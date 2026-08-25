from django.test import SimpleTestCase

from apps.chat.services.chat_conversation_service import (
    _build_conversation_permissions,
)


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
