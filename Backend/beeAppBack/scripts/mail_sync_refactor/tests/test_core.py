from __future__ import annotations

from datetime import datetime, timezone
from unittest import TestCase
from unittest.mock import Mock, patch

from apps.mail.exceptions import MailSyncError
from apps.mail.services.mail_sync import (
    persist_provider_mail_message,
    sync_due_mail_integrations,
    sync_mail_integration,
)
from apps.mail.services.mail_sync.message_payloads import (
    build_message_payload,
    provider_message_is_unchanged,
)
from apps.mail.services.mail_sync.notifications import (
    is_notifiable_incoming_message,
)
from apps.mail.services.mail_sync.providers import (
    get_provider_message_ids,
)

from .fixtures import provider_message


class MailSyncCoreTests(TestCase):
    def test_public_api_is_callable(self):
        self.assertTrue(callable(sync_mail_integration))
        self.assertTrue(callable(sync_due_mail_integrations))
        self.assertTrue(callable(persist_provider_mail_message))

    def test_message_unchanged_by_change_key(self):
        self.assertTrue(
            provider_message_is_unchanged(
                existing_message={"provider_change_key": "change-1"},
                provider_message=provider_message(),
            )
        )

    def test_message_unchanged_by_etag(self):
        message = provider_message()
        message["provider_change_key"] = None

        self.assertTrue(
            provider_message_is_unchanged(
                existing_message={"provider_etag": "etag-1"},
                provider_message=message,
            )
        )

    def test_message_changed_without_versions(self):
        self.assertFalse(
            provider_message_is_unchanged(
                existing_message={"provider_etag": "old"},
                provider_message=provider_message(),
            )
        )

    def test_payload_preserves_metadata_and_provider_star_state(self):
        payload = build_message_payload(
            user_id="user-1",
            integration={"id": "integration-1", "provider": "google"},
            provider_message=provider_message(),
            existing_message={
                "metadata": {"previous": "value"},
                "is_starred": True,
                "is_deleted_permanently": False,
            },
        )

        self.assertEqual(payload["metadata"]["previous"], "value")
        self.assertEqual(payload["metadata"]["source"], "test")
        self.assertFalse(payload["is_starred"])
        self.assertEqual(payload["provider"], "google")

    def test_payload_preserves_existing_star_when_provider_omits_it(self):
        message = provider_message()
        message.pop("is_starred")

        payload = build_message_payload(
            user_id="user-1",
            integration={"id": "integration-1", "provider": "google"},
            provider_message=message,
            existing_message={
                "metadata": {},
                "is_starred": True,
                "is_deleted_permanently": False,
            },
        )

        self.assertTrue(payload["is_starred"])

    def test_inbound_notification_filter(self):
        self.assertTrue(
            is_notifiable_incoming_message(
                provider_message=provider_message()
            )
        )
        message = provider_message()
        message["is_spam"] = True

        self.assertFalse(
            is_notifiable_incoming_message(provider_message=message)
        )

    def test_provider_ids_are_unique(self):
        provider = Mock()
        provider.list_message_ids.return_value = (
            ["one", "two", "one"],
            "cursor-1",
        )
        provider.list_spam_message_ids.return_value = ["two", "three"]

        ids, cursor, counts = get_provider_message_ids(
            provider=provider,
            access_token="redacted",
            after=datetime.now(timezone.utc),
            max_messages=10,
            max_spam_messages=10,
        )

        self.assertEqual(ids, ["one", "two", "three"])
        self.assertEqual(cursor, "cursor-1")
        self.assertEqual(counts["unique_message_count"], 3)

    @patch(
        "apps.mail.services.mail_sync.message_persistence."
        "replace_message_attachments"
    )
    @patch(
        "apps.mail.services.mail_sync.message_persistence."
        "replace_message_recipients"
    )
    @patch(
        "apps.mail.services.mail_sync.message_persistence.get_supabase"
    )
    def test_persist_provider_message_creates_message(
        self,
        mocked_get_supabase,
        mocked_replace_recipients,
        mocked_replace_attachments,
    ):
        response = Mock()
        response.data = {"id": "saved-message-1"}
        table = Mock()
        existing_response = Mock()
        existing_response.data = None
        (
            table.select.return_value.eq.return_value.eq.return_value
            .eq.return_value.maybe_single.return_value.execute.return_value
        ) = existing_response
        table.insert.return_value.execute.return_value = response
        mocked_get_supabase.return_value.table.return_value = table

        result = persist_provider_mail_message(
            user_id="user-1",
            integration={"id": "integration-1", "provider": "google"},
            provider_message=provider_message(),
        )

        self.assertEqual(result, {"id": "saved-message-1"})
        mocked_replace_recipients.assert_called_once()
        mocked_replace_attachments.assert_called_once()

    def test_persist_rejects_missing_provider_identifier(self):
        message = provider_message()
        message["provider_message_id"] = ""

        with self.assertRaises(MailSyncError):
            persist_provider_mail_message(
                user_id="user-1",
                integration={"id": "integration-1", "provider": "google"},
                provider_message=message,
            )
