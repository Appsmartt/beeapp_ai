from django.test import SimpleTestCase

from apps.chat.serializers import (
    CreateChatGroupInviteSerializer,
    CreateChatGroupSerializer,
    CreateDirectConversationSerializer,
    CreateReactionSerializer,
    DeactivateChatGroupSerializer,
    SendChatMessageSerializer,
    SetChatGroupParticipantRoleSerializer,
    TransferChatGroupOwnershipSerializer,
    UpdateChatGroupSerializer,
    UploadChatAttachmentSerializer,
)


class CreateDirectConversationSerializerTests(
    SimpleTestCase,
):
    def test_rejects_same_sender_and_recipient(self):
        serializer = CreateDirectConversationSerializer(
            data={
                "sender_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "recipient_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "recipient_identity_id",
            serializer.errors,
        )

    def test_accepts_different_identities(self):
        serializer = CreateDirectConversationSerializer(
            data={
                "sender_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "recipient_identity_id": (
                    "22222222-2222-2222-2222-222222222222"
                ),
            }
        )

        self.assertTrue(serializer.is_valid())


class CreateChatGroupSerializerTests(SimpleTestCase):
    def test_rejects_blank_group_name(self):
        serializer = CreateChatGroupSerializer(
            data={
                "creator_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "name": "   ",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

    def test_defaults_to_all_members_policy(self):
        serializer = CreateChatGroupSerializer(
            data={
                "creator_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "name": "Clientes",
            }
        )

        self.assertTrue(serializer.is_valid())
        self.assertEqual(
            serializer.validated_data["posting_policy"],
            "all_members",
        )

    def test_accepts_admins_only_policy(self):
        serializer = CreateChatGroupSerializer(
            data={
                "creator_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "name": "Anuncios",
                "posting_policy": "admins_only",
            }
        )

        self.assertTrue(serializer.is_valid())
        self.assertEqual(
            serializer.validated_data["posting_policy"],
            "admins_only",
        )

    def test_rejects_unknown_posting_policy(self):
        serializer = CreateChatGroupSerializer(
            data={
                "creator_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "name": "Clientes",
                "posting_policy": "creator_only",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("posting_policy", serializer.errors)

    def test_normalizes_group_description(self):
        serializer = CreateChatGroupSerializer(
            data={
                "creator_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "name": "Clientes",
                "description": "  Noticias del grupo  ",
            }
        )

        self.assertTrue(serializer.is_valid())
        self.assertEqual(
            serializer.validated_data["description"],
            "Noticias del grupo",
        )


class UpdateChatGroupSerializerTests(SimpleTestCase):
    def test_requires_at_least_one_mutable_field(self):
        serializer = UpdateChatGroupSerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "non_field_errors",
            serializer.errors,
        )

    def test_accepts_posting_policy_change(self):
        serializer = UpdateChatGroupSerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "posting_policy": "admins_only",
            }
        )

        self.assertTrue(serializer.is_valid())

    def test_rejects_blank_name(self):
        serializer = UpdateChatGroupSerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "name": "   ",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)


class CreateChatGroupInviteSerializerTests(
    SimpleTestCase,
):
    def test_rejects_inviting_acting_identity(self):
        serializer = CreateChatGroupInviteSerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "invited_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "invited_identity_id",
            serializer.errors,
        )

    def test_accepts_different_actor_and_invited_identity(self):
        serializer = CreateChatGroupInviteSerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "invited_identity_id": (
                    "22222222-2222-2222-2222-222222222222"
                ),
            }
        )

        self.assertTrue(serializer.is_valid())


class SetChatGroupParticipantRoleSerializerTests(
    SimpleTestCase,
):
    def test_accepts_admin_role(self):
        serializer = SetChatGroupParticipantRoleSerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "role": "admin",
            }
        )

        self.assertTrue(serializer.is_valid())

    def test_accepts_member_role(self):
        serializer = SetChatGroupParticipantRoleSerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "role": "member",
            }
        )

        self.assertTrue(serializer.is_valid())

    def test_rejects_owner_role(self):
        serializer = SetChatGroupParticipantRoleSerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "role": "owner",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("role", serializer.errors)


class TransferChatGroupOwnershipSerializerTests(
    SimpleTestCase,
):
    def test_rejects_same_current_and_new_owner(self):
        serializer = TransferChatGroupOwnershipSerializer(
            data={
                "current_owner_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "new_owner_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "new_owner_identity_id",
            serializer.errors,
        )

    def test_accepts_different_owners(self):
        serializer = TransferChatGroupOwnershipSerializer(
            data={
                "current_owner_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "new_owner_identity_id": (
                    "22222222-2222-2222-2222-222222222222"
                ),
            }
        )

        self.assertTrue(serializer.is_valid())


class DeactivateChatGroupSerializerTests(SimpleTestCase):
    def test_accepts_owner_identity(self):
        serializer = DeactivateChatGroupSerializer(
            data={
                "owner_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
            }
        )

        self.assertTrue(serializer.is_valid())


class SendChatMessageSerializerTests(SimpleTestCase):
    def test_rejects_empty_text_message(self):
        serializer = SendChatMessageSerializer(
            data={
                "sender_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "message_type": "text",
                "body": "   ",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("body", serializer.errors)

    def test_accepts_text_message(self):
        serializer = SendChatMessageSerializer(
            data={
                "sender_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "message_type": "text",
                "body": "Hola BeeApp",
                "metadata": {},
            }
        )

        self.assertTrue(serializer.is_valid())

    def test_rejects_image_without_attachment(self):
        serializer = SendChatMessageSerializer(
            data={
                "sender_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "message_type": "image",
                "body": None,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "attachment_file_id",
            serializer.errors,
        )

    def test_rejects_partial_reference(self):
        serializer = SendChatMessageSerializer(
            data={
                "sender_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "message_type": "quotation",
                "reference_type": "quotation",
                "metadata": {},
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("reference_id", serializer.errors)


class CreateReactionSerializerTests(SimpleTestCase):
    def test_rejects_blank_emoji(self):
        serializer = CreateReactionSerializer(
            data={
                "identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "emoji": "   ",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("emoji", serializer.errors)

    def test_accepts_emoji(self):
        serializer = CreateReactionSerializer(
            data={
                "identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "emoji": "👍",
            }
        )

        self.assertTrue(serializer.is_valid())


class UploadChatAttachmentSerializerTests(
    SimpleTestCase,
):
    def test_requires_attachment_message_type(self):
        serializer = UploadChatAttachmentSerializer(
            data={
                "sender_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "message_type": "text",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("message_type", serializer.errors)
