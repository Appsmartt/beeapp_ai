from __future__ import annotations

from datetime import datetime, timezone
from unittest import TestCase
from unittest.mock import Mock, patch

from apps.mail.exceptions import MailSyncError
from apps.mail.services.mail_provider_service import MailProviderError
from apps.mail.services.mail_sync import (
    sync_due_mail_integrations,
    sync_mail_integration,
)

from .fixtures import provider_message


class MailSyncOrchestratorTests(TestCase):
    def setUp(self):
        self.integration = {
            "id": "integration-1",
            "provider": "google",
            "initial_sync_completed_at": (
                "2026-01-01T00:00:00+00:00"
            ),
        }
        self.source_counts = {
            "normal_message_count": 1,
            "spam_message_count": 0,
            "unique_message_count": 1,
        }

    def _configure_sync_dependencies(
        self,
        mocked_get_integration,
        mocked_get_window,
        mocked_create_run,
        mocked_get_token,
        mocked_get_provider,
        mocked_get_message_ids,
        mocked_mark_run_success,
    ):
        mocked_get_integration.return_value = self.integration
        mocked_get_window.return_value = (
            datetime.now(timezone.utc),
            10,
            10,
            False,
        )
        mocked_create_run.return_value = {"id": "run-1"}
        mocked_get_token.return_value = "redacted"
        mocked_get_provider.return_value = Mock()
        mocked_get_message_ids.return_value = (
            ["provider-message-1"],
            "cursor-1",
            self.source_counts,
        )
        mocked_mark_run_success.return_value = {"id": "run-1"}

    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "create_new_mail_notification"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "upsert_provider_message"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_provider_message"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_provider_message_ids"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_mail_provider"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_valid_access_token"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "mark_sync_run_succeeded"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "mark_mail_integration_sync_success"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "create_sync_run"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_sync_window"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_mail_integration"
    )
    def test_sync_creates_and_notifies(
        self,
        mocked_get_integration,
        mocked_get_window,
        mocked_create_run,
        mocked_mark_integration_success,
        mocked_mark_run_success,
        mocked_get_token,
        mocked_get_provider,
        mocked_get_message_ids,
        mocked_get_message,
        mocked_upsert,
        mocked_notification,
    ):
        self._configure_sync_dependencies(
            mocked_get_integration,
            mocked_get_window,
            mocked_create_run,
            mocked_get_token,
            mocked_get_provider,
            mocked_get_message_ids,
            mocked_mark_run_success,
        )
        mocked_get_message.return_value = provider_message()
        mocked_upsert.return_value = (True, False, "saved-message-1")

        result = sync_mail_integration(
            user_id="user-1",
            integration_id="integration-1",
        )

        self.assertEqual(result["created_message_count"], 1)
        self.assertEqual(result["updated_message_count"], 0)
        self.assertEqual(result["skipped_message_count"], 0)
        mocked_mark_integration_success.assert_called_once()
        mocked_notification.assert_called_once()

    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "upsert_provider_message"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_provider_message"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_provider_message_ids"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_mail_provider"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_valid_access_token"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "mark_sync_run_succeeded"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "mark_mail_integration_sync_success"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "create_sync_run"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_sync_window"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_mail_integration"
    )
    def test_sync_skips_provider_message_error(
        self,
        mocked_get_integration,
        mocked_get_window,
        mocked_create_run,
        mocked_mark_integration_success,
        mocked_mark_run_success,
        mocked_get_token,
        mocked_get_provider,
        mocked_get_message_ids,
        mocked_get_message,
        mocked_upsert,
    ):
        self._configure_sync_dependencies(
            mocked_get_integration,
            mocked_get_window,
            mocked_create_run,
            mocked_get_token,
            mocked_get_provider,
            mocked_get_message_ids,
            mocked_mark_run_success,
        )
        mocked_get_message.side_effect = MailProviderError(
            "provider error"
        )

        result = sync_mail_integration(
            user_id="user-1",
            integration_id="integration-1",
        )

        self.assertEqual(result["fetched_message_count"], 0)
        self.assertEqual(result["skipped_message_count"], 1)
        mocked_upsert.assert_not_called()
        mocked_mark_integration_success.assert_called_once()

    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "sync_mail_integration"
    )
    @patch(
        "apps.mail.services.mail_sync.orchestrator."
        "get_due_mail_integrations"
    )
    def test_due_sync_counts_results(
        self,
        mocked_get_due_integrations,
        mocked_sync,
    ):
        mocked_get_due_integrations.return_value = [
            {"id": "integration-1", "user_id": "user-1"},
            {"id": "integration-2", "user_id": "user-2"},
        ]
        mocked_sync.side_effect = [
            {
                "created_message_count": 2,
                "updated_message_count": 1,
            },
            MailSyncError("sync error"),
        ]

        result = sync_due_mail_integrations()

        self.assertEqual(result["processed_integration_count"], 2)
        self.assertEqual(result["synced_integration_count"], 1)
        self.assertEqual(result["failed_integration_count"], 1)
        self.assertEqual(result["synced_message_count"], 3)
