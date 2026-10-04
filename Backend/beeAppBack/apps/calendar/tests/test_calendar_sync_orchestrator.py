from __future__ import annotations

from datetime import datetime, timezone
from unittest import TestCase
from unittest.mock import MagicMock, patch

from apps.calendar.exceptions import CalendarError
from apps.calendar.services.calendar_sync import (
    sync_calendar_integration,
    sync_due_calendar_integrations,
)
from apps.calendar.services.calendar_sync.orchestrator import (
    sync_selected_external_calendar,
    upsert_external_event,
)


class CalendarSyncOrchestratorTests(TestCase):
    def setUp(self):
        self.integration = {
            "id": "integration-1",
            "user_id": "user-1",
            "provider": "google",
            "integration_connection_id": "connection-1",
        }
        self.external_calendar = {
            "id": "external-calendar-1",
            "provider_calendar_id": "provider-calendar-1",
            "timezone": "America/Bogota",
            "display_color": "#2563EB",
            "metadata": {
                "beeapp_calendar_id": "beeapp-calendar-1",
            },
        }
        self.timed_event = {
            "provider_event_id": "event-1",
            "provider_change_key": "change-1",
            "provider_updated_at": "2026-10-04T04:00:00Z",
            "title": "Planning",
            "description": "Sprint planning",
            "is_all_day": False,
            "starts_at": "2026-10-05T14:00:00Z",
            "ends_at": "2026-10-05T15:00:00Z",
            "starts_on": None,
            "ends_on": None,
            "timezone": "America/Bogota",
            "status": "confirmed",
            "event_kind": "virtual",
            "metadata": {"source_key": "source-value"},
        }

    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.persist_external_event"
    )
    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.find_existing_external_event"
    )
    def test_upsert_creates_event_when_missing(
        self,
        find_existing_external_event,
        persist_external_event,
    ):
        find_existing_external_event.return_value = None
        persist_external_event.return_value = (
            "new-event-1",
            True,
        )

        result = upsert_external_event(
            integration=self.integration,
            external_calendar=self.external_calendar,
            provider_event=self.timed_event,
        )

        self.assertEqual(
            result,
            ("new-event-1", True, False),
        )
        persist_external_event.assert_called_once()

    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.mark_external_calendar_sync_success"
    )
    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.upsert_external_event"
    )
    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator._get_calendar_provider"
    )
    def test_selected_calendar_counts_are_preserved(
        self,
        get_calendar_provider,
        upsert,
        mark_success,
    ):
        provider = MagicMock()
        provider.list_events.return_value = [
            self.timed_event,
            {
                **self.timed_event,
                "provider_event_id": "event-2",
            },
            {
                **self.timed_event,
                "provider_event_id": "event-3",
            },
        ]
        get_calendar_provider.return_value = provider
        upsert.side_effect = [
            ("created-1", True, False),
            ("updated-1", False, False),
            (None, False, True),
        ]

        result = sync_selected_external_calendar(
            integration=self.integration,
            external_calendar=self.external_calendar,
            access_token="token",
            range_start=datetime(2026, 1, 1, tzinfo=timezone.utc),
            range_end=datetime(2026, 1, 2, tzinfo=timezone.utc),
        )

        self.assertEqual(
            result,
            {
                "fetched": 3,
                "created": 1,
                "updated": 1,
                "skipped": 1,
            },
        )
        mark_success.assert_called_once()

    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.mark_integration_sync_success"
    )
    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.sync_calendar_integration_from_connection"
    )
    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.sync_selected_external_calendar"
    )
    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.get_external_calendars_to_sync"
    )
    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator._get_valid_access_token"
    )
    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator._require_active_calendar_integration"
    )
    def test_integration_result_contract_is_preserved(
        self,
        require_active,
        get_access_token,
        get_external_calendars,
        sync_selected,
        refresh_integration,
        mark_success,
    ):
        require_active.return_value = self.integration
        get_access_token.return_value = "token"
        get_external_calendars.return_value = [
            self.external_calendar
        ]
        sync_selected.return_value = {
            "fetched": 4,
            "created": 2,
            "updated": 1,
            "skipped": 1,
        }
        refresh_integration.return_value = {
            **self.integration,
            "status": "active",
        }

        result = sync_calendar_integration(
            user_id="user-1",
            integration_id="integration-1",
            force_full_sync=True,
        )

        self.assertEqual(
            result["synced_external_calendar_count"],
            1,
        )
        self.assertEqual(result["fetched_event_count"], 4)
        self.assertEqual(result["created_event_count"], 2)
        self.assertEqual(result["updated_event_count"], 1)
        self.assertEqual(result["skipped_event_count"], 1)
        self.assertEqual(result["synced_events_count"], 3)
        self.assertEqual(
            result["integration"]["status"],
            "active",
        )
        mark_success.assert_called_once()

    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.mark_integration_sync_failure"
    )
    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator._require_active_calendar_integration"
    )
    def test_integration_error_marks_failure_and_reraises(
        self,
        require_active,
        mark_failure,
    ):
        require_active.side_effect = CalendarError("blocked")

        with self.assertRaisesRegex(CalendarError, "^blocked$"):
            sync_calendar_integration(
                user_id="user-1",
                integration_id="integration-1",
            )

        mark_failure.assert_called_once()

    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.sync_calendar_integration"
    )
    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.get_due_calendar_integrations"
    )
    def test_due_sync_isolates_failures(
        self,
        get_due_integrations,
        sync_integration,
    ):
        get_due_integrations.return_value = [
            {"id": "integration-1", "user_id": "user-1"},
            {"id": "integration-2", "user_id": "user-2"},
        ]
        sync_integration.side_effect = [
            {"synced_events_count": 3},
            CalendarError("provider error"),
        ]

        result = sync_due_calendar_integrations()

        self.assertEqual(
            result,
            {
                "processed_integration_count": 2,
                "synced_integration_count": 1,
                "failed_integration_count": 1,
                "synced_event_count": 3,
            },
        )
