from __future__ import annotations

from unittest import TestCase
from unittest.mock import patch

from apps.calendar.services.calendar_sync.normalization import (
    is_incomplete_cancelled_event,
    normalize_event_color,
    normalize_text,
)
from apps.calendar.services.calendar_sync.orchestrator import (
    upsert_external_event,
)
from apps.calendar.services.calendar_sync.payloads import (
    build_external_event_payload,
)


class CalendarSyncRefactorTests(TestCase):
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

    def test_normalize_text_preserves_original_rules(self):
        self.assertEqual(
            normalize_text(
                "  value  ",
                max_length=10,
            ),
            "value",
        )
        self.assertEqual(
            normalize_text(
                "x" * 12,
                max_length=10,
            ),
            "x" * 10,
        )
        self.assertIsNone(
            normalize_text(
                "   ",
                max_length=10,
            )
        )
        self.assertEqual(
            normalize_text(
                None,
                max_length=10,
                fallback="fallback",
            ),
            "fallback",
        )

    def test_cancelled_incomplete_event_rules_are_preserved(self):
        cancelled_timed = {
            **self.timed_event,
            "status": "cancelled",
            "starts_at": None,
        }
        cancelled_all_day = {
            **self.timed_event,
            "status": "cancelled",
            "is_all_day": True,
            "starts_on": "2026-10-05",
            "ends_on": None,
        }

        self.assertTrue(
            is_incomplete_cancelled_event(cancelled_timed)
        )
        self.assertTrue(
            is_incomplete_cancelled_event(cancelled_all_day)
        )
        self.assertFalse(
            is_incomplete_cancelled_event(
                self.timed_event
            )
        )

    def test_build_payload_preserves_event_contract(self):
        payload = build_external_event_payload(
            integration=self.integration,
            external_calendar=self.external_calendar,
            provider_event=self.timed_event,
        )

        self.assertEqual(
            payload["calendar_id"],
            "beeapp-calendar-1",
        )
        self.assertEqual(payload["organizer_id"], "user-1")
        self.assertEqual(payload["source"], "google")
        self.assertEqual(payload["status"], "confirmed")
        self.assertEqual(payload["event_kind"], "virtual")
        self.assertEqual(payload["provider_event_id"], "event-1")
        self.assertEqual(
            payload["metadata"]["source_key"],
            "source-value",
        )
        self.assertEqual(
            payload["metadata"]["calendar_integration_id"],
            "integration-1",
        )

    def test_color_falls_back_deterministically(self):
        external_calendar = {
            **self.external_calendar,
            "display_color": "invalid",
            "provider_color": None,
        }

        first_color = normalize_event_color(
            external_calendar=external_calendar
        )
        second_color = normalize_event_color(
            external_calendar=external_calendar
        )

        self.assertEqual(first_color, second_color)
        self.assertTrue(first_color.startswith("#"))

    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.find_existing_external_event"
    )
    def test_incomplete_cancelled_event_is_skipped_when_missing(
        self,
        find_existing_external_event,
    ):
        find_existing_external_event.return_value = None
        cancelled_event = {
            **self.timed_event,
            "status": "cancelled",
            "starts_at": None,
            "ends_at": None,
        }

        result = upsert_external_event(
            integration=self.integration,
            external_calendar=self.external_calendar,
            provider_event=cancelled_event,
        )

        self.assertEqual(result, (None, False, True))

    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.mark_existing_event_cancelled"
    )
    @patch(
        "apps.calendar.services.calendar_sync."
        "orchestrator.find_existing_external_event"
    )
    def test_incomplete_cancelled_event_cancels_existing(
        self,
        find_existing_external_event,
        mark_existing_event_cancelled,
    ):
        find_existing_external_event.return_value = {
            "id": "existing-event-1",
        }
        mark_existing_event_cancelled.return_value = (
            "existing-event-1"
        )
        cancelled_event = {
            **self.timed_event,
            "status": "cancelled",
            "starts_at": None,
            "ends_at": None,
        }

        result = upsert_external_event(
            integration=self.integration,
            external_calendar=self.external_calendar,
            provider_event=cancelled_event,
        )

        self.assertEqual(
            result,
            ("existing-event-1", False, False),
        )
        mark_existing_event_cancelled.assert_called_once()
