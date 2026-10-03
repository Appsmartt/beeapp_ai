from __future__ import annotations

from unittest.mock import patch

from calendar_refactor_test_support import (
    FakeSupabase,
    assert_equal,
)
from apps.calendar.exceptions import (
    CalendarEventNotFoundError,
    CalendarEventUpdateError,
)
from apps.calendar.services.calendar_service_modules import access


def test_calendar_share_permission_failure_is_hidden():
    with patch.object(
        access,
        "get_supabase",
        return_value=FakeSupabase(
            {"calendar_shares": type("Response", (), {"data": []})()}
        ),
    ):
        assert_equal(
            access.get_calendar_share_permission(
                calendar_id="calendar",
                user_id="user",
            ),
            None,
            "share_permission",
        )

    with patch.object(
        access,
        "get_supabase",
        return_value=FakeSupabase(
            {"calendar_shares": type("Response", (), {"data": []})()}
        ),
    ), patch.object(
        access,
        "extract_single",
        side_effect=RuntimeError("database unavailable"),
    ):
        assert_equal(
            access.get_calendar_share_permission(
                calendar_id="calendar",
                user_id="user",
            ),
            None,
            "share_permission_error",
        )


def test_private_event_blocks_shared_editor():
    event = {
        "id": "event",
        "calendar_id": "calendar",
        "organizer_id": "organizer",
        "is_private": True,
    }
    calendar = {"id": "calendar", "owner_id": "owner"}

    with patch.object(access, "get_event_row", return_value=event), patch.object(
        access,
        "get_calendar_row",
        return_value=calendar,
    ), patch.object(
        access,
        "get_user_attendee_row",
        return_value=None,
    ), patch.object(
        access,
        "get_calendar_share_permission",
        return_value="editor",
    ):
        try:
            access.get_event_access(
                user_id="shared-editor",
                event_id="event",
            )
        except CalendarEventNotFoundError:
            return

    raise AssertionError("private event exposed to shared editor")


def test_shared_editor_restrictions():
    access_context = {"is_editor": True}

    try:
        access.require_editor_can_manage_related_data(
            access=access_context,
            payload={"reminders": []},
        )
    except CalendarEventUpdateError as error:
        assert_equal(
            str(error),
            "Shared-calendar editors cannot modify "
            "another organizer's reminders.",
            "reminder_restriction",
        )
    else:
        raise AssertionError("shared editor changed reminders")

    try:
        access.require_editor_can_manage_related_data(
            access=access_context,
            payload={"tag_ids": []},
        )
    except CalendarEventUpdateError:
        return

    raise AssertionError("shared editor changed tags")


def test_owner_can_access_archived_calendar():
    calendar = {
        "id": "calendar",
        "owner_id": "owner",
        "is_archived": True,
    }

    with patch.object(
        access,
        "get_calendar_row",
        return_value=calendar,
    ):
        result = access.get_calendar_access(
            user_id="owner",
            calendar_id="calendar",
        )

    assert_equal(result["permission"], "owner", "owner_permission")
    assert_equal(result["can_create_events"], True, "owner_creation")


def test_shared_user_cannot_access_archived_calendar():
    calendar = {
        "id": "calendar",
        "owner_id": "owner",
        "is_archived": True,
    }

    with patch.object(
        access,
        "get_calendar_row",
        return_value=calendar,
    ):
        try:
            access.get_calendar_access(
                user_id="shared-user",
                calendar_id="calendar",
            )
        except CalendarEventNotFoundError:
            raise AssertionError("wrong_exception_type")
        except Exception as error:
            assert_equal(
                error.__class__.__name__,
                "CalendarNotFoundError",
                "archived_shared_error",
            )
            return

    raise AssertionError("archived calendar exposed to shared user")


def test_shared_viewer_cannot_create_events():
    calendar = {
        "id": "calendar",
        "owner_id": "owner",
        "is_archived": False,
    }

    with patch.object(
        access,
        "get_calendar_row",
        return_value=calendar,
    ), patch.object(
        access,
        "get_calendar_share_permission",
        return_value="viewer",
    ):
        result = access.get_calendar_access(
            user_id="viewer",
            calendar_id="calendar",
        )

    assert_equal(result["can_create_events"], False, "viewer_creation")


def test_event_editor_can_edit_public_event_only():
    event = {
        "id": "event",
        "calendar_id": "calendar",
        "organizer_id": "organizer",
        "is_private": False,
    }
    calendar = {"id": "calendar", "owner_id": "owner"}

    with patch.object(access, "get_event_row", return_value=event), patch.object(
        access,
        "get_calendar_row",
        return_value=calendar,
    ), patch.object(
        access,
        "get_user_attendee_row",
        return_value=None,
    ), patch.object(
        access,
        "get_calendar_share_permission",
        return_value="editor",
    ):
        result = access.get_event_access(
            user_id="shared-editor",
            event_id="event",
        )

    assert_equal(result["can_edit"], True, "editor_public_edit")
    assert_equal(result["can_delete"], False, "editor_public_delete")


def test_shared_editor_cannot_change_related_data():
    try:
        access.require_editor_can_manage_related_data(
            access={"is_editor": True},
            payload={"conferences": []},
        )
    except CalendarEventUpdateError:
        return

    raise AssertionError("shared editor changed conferences")


ACCESS_TESTS = [
    test_calendar_share_permission_failure_is_hidden,
    test_private_event_blocks_shared_editor,
    test_shared_editor_restrictions,
    test_owner_can_access_archived_calendar,
    test_shared_user_cannot_access_archived_calendar,
    test_shared_viewer_cannot_create_events,
    test_event_editor_can_edit_public_event_only,
    test_shared_editor_cannot_change_related_data,
]
