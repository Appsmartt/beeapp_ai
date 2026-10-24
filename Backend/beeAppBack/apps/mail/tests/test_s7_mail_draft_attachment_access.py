from contextlib import ExitStack
from unittest import TestCase
from unittest.mock import Mock, patch

from apps.mail.exceptions import MailSyncError
from apps.mail.services import mail_draft as draft_service
from apps.storage.exceptions import StorageFileNotFoundError


class S7MailDraftAttachmentAccessTests(TestCase):
    def _send(self, attachments, *, inaccessible_ids=()):
        inaccessible_ids = set(inaccessible_ids)
        provider = Mock()
        provider.send_draft.return_value = {"provider_message_id": "sent"}
        snapshot = {
            "recipients": {
                "to": ["recipient@example.invalid"],
                "cc": [],
                "bcc": [],
            },
            "attachments": attachments,
        }

        with ExitStack() as stack:
            def mocked(target, value):
                return stack.enter_context(patch(target, value))

            mocked(
                "apps.mail.services.mail_draft.operations."
                "get_draft_message",
                Mock(return_value={
                    "id": "draft-id",
                    "mail_integration_id": "integration-id",
                    "provider": "google",
                    "provider_message_id": "provider-id",
                }),
            )
            mocked(
                "apps.mail.services.mail_draft.operations."
                "get_active_mail_integration",
                Mock(return_value={"provider": "google"}),
            )
            mocked(
                "apps.mail.services.mail_draft.operations."
                "build_draft_snapshot",
                Mock(return_value=snapshot),
            )
            mocked(
                "apps.mail.services.mail_draft.operations."
                "get_mail_provider",
                Mock(return_value=provider),
            )
            token = mocked(
                "apps.mail.services.mail_draft.operations."
                "get_valid_access_token",
                Mock(return_value="test-token"),
            )
            mocked(
                "apps.mail.services.mail_draft.operations."
                "normalize_recipients",
                lambda values: values,
            )
            mocked(
                "apps.mail.services.mail_draft.operations."
                "validate_sendable_draft",
                Mock(),
            )
            mocked(
                "apps.mail.services.mail_draft.operations."
                "get_google_draft_id",
                Mock(return_value="draft-provider-id"),
            )
            mocked(
                "apps.mail.services.mail_draft.operations."
                "persist_sent_provider_message",
                Mock(return_value="sent-id"),
            )
            mocked(
                "apps.mail.services.mail_draft.operations."
                "serialize_message",
                Mock(return_value={"id": "sent-id"}),
            )

            def accessible(*, user_id, file_id):
                self.assertEqual(user_id, "recipient-user")
                if file_id in inaccessible_ids:
                    raise StorageFileNotFoundError("Access denied")
                return {"id": file_id}

            access = mocked(
                "apps.mail.services.mail_draft.attachments."
                "get_accessible_file",
                Mock(side_effect=accessible),
            )

            try:
                result = draft_service.send_mail_draft(
                    user_id="recipient-user",
                    message_id="draft-id",
                )
            except MailSyncError:
                self.assertFalse(provider.send_draft.called)
                self.assertFalse(token.called)
                return False, access.call_args_list

            provider.send_draft.assert_called_once()
            self.assertTrue(token.called)
            self.assertEqual(result, {"id": "sent-id"})
            return True, access.call_args_list

    def test_expired_share_blocks_provider(self):
        sent, calls = self._send(
            [{"source": "storage", "storage_file_id": "expired"}],
            inaccessible_ids={"expired"},
        )
        self.assertFalse(sent)
        self.assertEqual(len(calls), 1)

    def test_own_attachment_still_sends(self):
        sent, calls = self._send(
            [{"source": "storage", "storage_file_id": "own"}]
        )
        self.assertTrue(sent)
        self.assertEqual(len(calls), 1)

    def test_valid_share_still_sends(self):
        sent, calls = self._send(
            [{"source": "storage", "storage_file_id": "shared"}]
        )
        self.assertTrue(sent)
        self.assertEqual(len(calls), 1)

    def test_one_expired_attachment_blocks_entire_draft(self):
        sent, calls = self._send(
            [
                {"source": "storage", "storage_file_id": "own"},
                {"source": "storage", "storage_file_id": "expired"},
            ],
            inaccessible_ids={"expired"},
        )
        self.assertFalse(sent)
        self.assertEqual(len(calls), 2)

    def test_storage_attachment_without_file_id_blocks_provider(self):
        sent, calls = self._send([{"source": "storage"}])
        self.assertFalse(sent)
        self.assertEqual(calls, [])

    def test_provider_attachment_does_not_require_storage_access(self):
        sent, calls = self._send([{"source": "provider"}])
        self.assertTrue(sent)
        self.assertEqual(calls, [])
