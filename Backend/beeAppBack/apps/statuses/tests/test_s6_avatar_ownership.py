from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.chat.services.chat_conversation.avatars import (
    _attach_inbox_avatar_urls,
)
from apps.statuses.services.status_media_refactor.signed_urls import (
    create_status_avatar_signed_url,
)


class S6AvatarOwnershipTests(SimpleTestCase):
    def _client(self, *, reference, file_record):
        client = MagicMock()
        profile = MagicMock()
        commercial = MagicMock()
        files = MagicMock()
        profile.execute.return_value = SimpleNamespace(data=reference)
        commercial.execute.return_value = SimpleNamespace(data=reference)
        files.execute.return_value = SimpleNamespace(data=file_record)
        for query in (profile, commercial, files):
            query.select.return_value = query
            query.eq.return_value = query
            query.is_.return_value = query
            query.maybe_single.return_value = query
        client.table.side_effect = lambda name: {
            "profile": profile,
            "commercial_profiles": commercial,
            "files": files,
        }[name]
        return client, profile, commercial, files

    def test_personal_avatar_filters_owner_before_signing(self):
        client, profile, _, files = self._client(
            reference={"id": "owner-a"},
            file_record={
                "bucket_id": "beeapp-files",
                "storage_path": "owner-a/avatar.png",
            },
        )
        with patch(
            "apps.statuses.services.status_media_refactor.signed_urls."
            "execute_with_supabase_admin_retry",
            side_effect=lambda operation: operation(client),
        ), patch(
            "apps.statuses.services.status_media_refactor.signed_urls."
            "create_status_media_signed_url",
            return_value="https://signed.example/avatar",
        ) as signer:
            result = create_status_avatar_signed_url(
                avatar_file_id="file-a",
                actor_type="profile",
                actor_id="owner-a",
            )
        self.assertEqual(result, "https://signed.example/avatar")
        profile.eq.assert_any_call("avatar_file_id", "file-a")
        files.eq.assert_any_call("owner_id", "owner-a")
        files.eq.assert_any_call("kind", "image")
        signer.assert_called_once()

    def test_foreign_file_does_not_reach_signer(self):
        client, _, commercial, files = self._client(
            reference={"owner_id": "business-owner"},
            file_record=None,
        )
        with patch(
            "apps.statuses.services.status_media_refactor.signed_urls."
            "execute_with_supabase_admin_retry",
            side_effect=lambda operation: operation(client),
        ), patch(
            "apps.statuses.services.status_media_refactor.signed_urls."
            "create_status_media_signed_url",
        ) as signer:
            result = create_status_avatar_signed_url(
                avatar_file_id="victim-file",
                actor_type="commercial_profile",
                actor_id="business-a",
            )
        self.assertIsNone(result)
        commercial.eq.assert_any_call("logo_file_id", "victim-file")
        files.eq.assert_any_call("owner_id", "business-owner")
        signer.assert_not_called()

    def test_missing_actor_reference_does_not_read_file(self):
        client, _, _, _ = self._client(
            reference=None,
            file_record=None,
        )
        with patch(
            "apps.statuses.services.status_media_refactor.signed_urls."
            "execute_with_supabase_admin_retry",
            side_effect=lambda operation: operation(client),
        ), patch(
            "apps.statuses.services.status_media_refactor.signed_urls."
            "create_status_media_signed_url",
        ) as signer:
            result = create_status_avatar_signed_url(
                avatar_file_id="victim-file",
                actor_type="profile",
                actor_id="attacker",
            )
        self.assertIsNone(result)
        client.table.assert_called_once_with("profile")
        signer.assert_not_called()

    def test_group_inbox_rejects_foreign_file(self):
        client = MagicMock()
        conversation = MagicMock()
        identity = MagicMock()
        files = MagicMock()
        conversation.execute.return_value = SimpleNamespace(
            data={"created_by_identity_id": "creator"}
        )
        identity.execute.return_value = SimpleNamespace(
            data={"owner_id": "creator-owner"}
        )
        files.execute.return_value = SimpleNamespace(data=None)
        for query in (conversation, identity, files):
            query.select.return_value = query
            query.eq.return_value = query
            query.is_.return_value = query
            query.maybe_single.return_value = query
        client.table.side_effect = lambda name: {
            "chat_conversations": conversation,
            "chat_identities": identity,
            "files": files,
        }[name]
        rows = [{
            "id": "group-a",
            "conversation_type": "group",
            "group_image_file_id": "victim-file",
        }]
        with patch(
            "apps.chat.services.chat_conversation.avatars._supabase",
            return_value=client,
        ):
            _attach_inbox_avatar_urls(conversations=rows)
        self.assertIsNone(rows[0]["avatar_url"])
        conversation.eq.assert_any_call("image_file_id", "victim-file")
        files.eq.assert_any_call("owner_id", "creator-owner")
        client.storage.from_.assert_not_called()
