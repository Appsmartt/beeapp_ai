from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from calendar_refactor_test_support import (
    FakeSupabase,
    assert_equal,
)
from apps.calendar.exceptions import CalendarEventCreateError
from apps.calendar.services.calendar_service_modules import (
    event_command_helpers,
)
from apps.calendar.services.calendar_service_modules import (
    event_create_commands,
)


def test_duplicate_validation():
    valid_timed = {
        "is_all_day": False,
        "starts_at": "2026-10-03T10:00:00+00:00",
        "ends_at": "2026-10-03T11:00:00+00:00",
        "starts_on": None,
        "ends_on": None,
    }
    event_command_helpers.validate_duplicate_payload(valid_timed)

    invalid_timed = {
        **valid_timed,
        "ends_at": "2026-10-03T09:00:00+00:00",
    }

    try:
        event_command_helpers.validate_duplicate_payload(invalid_timed)
    except CalendarEventCreateError:
        return

    raise AssertionError("invalid duplicate was accepted")


def test_duplicate_rejects_mixed_date_fields():
    payload = {
        "is_all_day": True,
        "starts_on": "2026-10-03",
        "ends_on": "2026-10-04",
        "starts_at": "2026-10-03T10:00:00+00:00",
        "ends_at": None,
    }

    try:
        event_command_helpers.validate_duplicate_payload(payload)
    except CalendarEventCreateError:
        return

    raise AssertionError("mixed all-day fields were accepted")


def test_create_event_rolls_back_on_relation_failure():
    event = {
        "id": "new-event",
        "timezone": "America/Bogota",
        "notifications_enabled": False,
    }
    fake_supabase = FakeSupabase(
        {"calendar_events": SimpleNamespace(data=[event])}
    )
    payload = {
        "calendar_id": "calendar",
        "event_kind": "meeting",
        "title": "Test",
        "color": "#6025D2",
        "is_all_day": False,
        "starts_at": "2026-10-03T10:00:00+00:00",
        "ends_at": "2026-10-03T11:00:00+00:00",
        "starts_on": None,
        "ends_on": None,
        "timezone": "America/Bogota",
        "is_private": False,
        "notifications_enabled": False,
        "tag_ids": ["missing-tag"],
    }
    calendar_access = {
        "can_create_events": True,
        "calendar": {"is_archived": False},
        "is_editor": False,
    }

    with patch.object(
        event_create_commands,
        "get_calendar_access",
        return_value=calendar_access,
    ), patch.object(
        event_create_commands,
        "get_supabase",
        return_value=fake_supabase,
    ), patch.object(
        event_create_commands,
        "assign_event_tags",
        side_effect=CalendarEventCreateError("tag failure"),
    ), patch.object(
        event_create_commands,
        "delete_event_safely",
    ) as delete_mock:
        try:
            event_create_commands.create_calendar_event(
                user_id="owner",
                payload=payload,
            )
        except CalendarEventCreateError:
            pass
        else:
            raise AssertionError("relation failure did not fail creation")

        delete_mock.assert_called_once_with(event_id="new-event")


def test_safe_notification_never_raises():
    from apps.calendar.services.calendar_service_modules import (
        event_reminders,
    )

    with patch.object(
        event_reminders,
        "create_calendar_notification",
        side_effect=RuntimeError("notification failure"),
    ):
        event_reminders.safe_calendar_notification(
            recipient_id="recipient",
            notification_type="event_updated",
            title="Title",
            body="Body",
            metadata={"event_id": "event"},
        )


COMMAND_TESTS = [
    test_duplicate_validation,
    test_duplicate_rejects_mixed_date_fields,
    test_create_event_rolls_back_on_relation_failure,
    test_safe_notification_never_raises,
]
