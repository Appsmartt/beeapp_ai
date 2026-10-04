from __future__ import annotations

import unittest
from unittest.mock import patch

from apps.mail.exceptions import MailSyncError
from apps.mail.services.mail_draft import operations
from apps.mail.services.mail_draft.attachments import (
    validate_draft_storage_attachment_access,
)
from apps.mail.services.mail_draft.recipients import (
    get_google_draft_id,
    normalize_draft_recipients,
)
from apps.storage.exceptions import StorageFileNotFoundError


class MailDraftAttachmentSecurityTests(unittest.TestCase):
    def test_rejects_storage_attachment_without_file_id(self) -> None:
        with self.assertRaisesRegex(
            MailSyncError,
            "ya no está disponible",
        ):
            validate_draft_storage_attachment_access(
                user_id="user-1",
                attachments=[{"source": "storage"}],
            )

    @patch(
        "apps.mail.services.mail_draft.attachments.get_accessible_file"
    )
    def test_rejects_inaccessible_storage_attachment(
        self,
        mocked_get_accessible_file,
    ) -> None:
        mocked_get_accessible_file.side_effect = (
            StorageFileNotFoundError("missing")
        )

        with self.assertRaisesRegex(
            MailSyncError,
            "ya no está disponible",
        ):
            validate_draft_storage_attachment_access(
                user_id="user-1",
                attachments=[
                    {
                        "source": "storage",
                        "storage_file_id": "file-1",
                    }
                ],
            )

        mocked_get_accessible_file.assert_called_once_with(
            user_id="user-1",
            file_id="file-1",
        )

    @patch(
        "apps.mail.services.mail_draft.attachments.get_accessible_file"
    )
    def test_skips_provider_attachment_access_check(
        self,
        mocked_get_accessible_file,
    ) -> None:
        validate_draft_storage_attachment_access(
            user_id="user-1",
            attachments=[
                {
                    "source": "provider",
                    "storage_file_id": "file-1",
                }
            ],
        )

        mocked_get_accessible_file.assert_not_called()


class MailDraftRecipientTests(unittest.TestCase):
    def test_normalizes_and_deduplicates_recipients(self) -> None:
        recipients = normalize_draft_recipients(
            [
                {
                    "email": " First@Example.com ",
                    "display_name": " First User ",
                },
                {
                    "email": "first@example.com",
                    "display_name": "Duplicate",
                },
                {
                    "email": "second@example.com",
                    "display_name": "",
                },
                {"display_name": "Missing email"},
                "invalid",
            ]
        )

        self.assertEqual(
            recipients,
            [
                {
                    "email": "first@example.com",
                    "display_name": "First User",
                },
                {
                    "email": "second@example.com",
                    "display_name": None,
                },
            ],
        )

    def test_extracts_google_draft_id_only_from_metadata(self) -> None:
        self.assertIsNone(get_google_draft_id(message={}))
        self.assertIsNone(
            get_google_draft_id(
                message={"metadata": "invalid"}
            )
        )
        self.assertEqual(
            get_google_draft_id(
                message={
                    "metadata": {
                        "gmail_draft_id": " draft-1 "
                    }
                }
            ),
            "draft-1",
        )


class MailDraftSendOrderTests(unittest.TestCase):
    @patch(
        "apps.mail.services.mail_draft.operations."
        "get_valid_access_token"
    )
    @patch(
        "apps.mail.services.mail_draft.operations."
        "get_mail_provider"
    )
    @patch(
        "apps.mail.services.mail_draft.operations."
        "validate_sendable_draft"
    )
    @patch(
        "apps.mail.services.mail_draft.operations."
        "validate_draft_storage_attachment_access"
    )
    @patch(
        "apps.mail.services.mail_draft.operations."
        "build_draft_snapshot"
    )
    @patch(
        "apps.mail.services.mail_draft.operations."
        "get_active_mail_integration"
    )
    @patch(
        "apps.mail.services.mail_draft.operations."
        "get_draft_message"
    )
    def test_validates_attachments_before_token_and_provider(
        self,
        mocked_get_draft_message,
        mocked_get_active_integration,
        mocked_build_snapshot,
        mocked_validate_attachment_access,
        mocked_validate_sendable_draft,
        mocked_get_mail_provider,
        mocked_get_valid_access_token,
    ) -> None:
        mocked_get_draft_message.return_value = {
            "id": "draft-1",
            "mail_integration_id": "integration-1",
            "provider": "google",
            "provider_message_id": "provider-message-1",
        }
        mocked_get_active_integration.return_value = {
            "id": "integration-1",
            "provider": "google",
        }
        mocked_build_snapshot.return_value = {
            "attachments": [{"source": "storage"}],
            "recipients": {
                "to": [{"email": "to@example.com"}],
                "cc": [],
                "bcc": [],
            },
        }
        mocked_validate_attachment_access.side_effect = MailSyncError(
            "blocked attachment"
        )

        with self.assertRaisesRegex(
            MailSyncError,
            "blocked attachment",
        ):
            operations.send_mail_draft(
                user_id="user-1",
                message_id="draft-1",
            )

        mocked_validate_sendable_draft.assert_not_called()
        mocked_get_mail_provider.assert_not_called()
        mocked_get_valid_access_token.assert_not_called()


if __name__ == "__main__":
    unittest.main()
