from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import (
    CalendarEventNotFoundError,
    CalendarEventUpdateError,
    CalendarNotFoundError,
)
from apps.calendar.services.calendar_service_modules.shared import (
    ATTENDEE_COLUMNS,
    CALENDAR_COLUMNS,
    EVENT_COLUMNS,
    extract_single,
    get_supabase,
)


def get_calendar_row(
    *,
    calendar_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase()
            .table("calendars")
            .select(CALENDAR_COLUMNS)
            .eq("id", calendar_id)
            .maybe_single()
            .execute()
        )

        calendar = extract_single(response)

        if not calendar:
            raise CalendarNotFoundError(
                "Calendar was not found."
            )

        return calendar

    except CalendarNotFoundError:
        raise

    except Exception as error:
        raise CalendarNotFoundError(
            "Could not retrieve calendar."
        ) from error


def get_calendar_share_permission(
    *,
    calendar_id: str,
    user_id: str,
) -> str | None:
    try:
        response = (
            get_supabase()
            .table("calendar_shares")
            .select("permission,accepted_at,revoked_at")
            .eq("calendar_id", calendar_id)
            .eq("shared_with_user_id", user_id)
            .not_.is_("accepted_at", "null")
            .is_("revoked_at", "null")
            .maybe_single()
            .execute()
        )

        share = extract_single(response)

        if not share:
            return None

        permission = share.get("permission")

        if permission in ("viewer", "editor"):
            return permission

        return None

    except Exception:
        return None


def get_calendar_access(
    *,
    user_id: str,
    calendar_id: str,
    require_owner: bool = False,
    require_editor: bool = False,
) -> dict[str, Any]:
    calendar = get_calendar_row(calendar_id=calendar_id)

    if str(calendar["owner_id"]) == str(user_id):
        return {
            "calendar": calendar,
            "permission": "owner",
            "is_owner": True,
            "is_editor": True,
            "can_view": True,
            "can_create_events": True,
        }

    if require_owner:
        raise CalendarNotFoundError(
            "Calendar was not found or is not owned by you."
        )

    if calendar["is_archived"]:
        raise CalendarNotFoundError(
            "Calendar is archived or unavailable."
        )

    share_permission = get_calendar_share_permission(
        calendar_id=calendar_id,
        user_id=user_id,
    )

    if share_permission is None:
        raise CalendarNotFoundError(
            "Calendar was not found or is not accessible."
        )

    if require_editor and share_permission != "editor":
        raise CalendarNotFoundError(
            "Calendar was not found or cannot be edited."
        )

    return {
        "calendar": calendar,
        "permission": share_permission,
        "is_owner": False,
        "is_editor": share_permission == "editor",
        "can_view": True,
        "can_create_events": share_permission == "editor",
    }


def get_calendar_for_user(
    *,
    user_id: str,
    calendar_id: str,
) -> dict[str, Any]:
    return get_calendar_access(
        user_id=user_id,
        calendar_id=calendar_id,
        require_owner=True,
    )["calendar"]


def get_event_row(
    *,
    event_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase()
            .table("calendar_events")
            .select(EVENT_COLUMNS)
            .eq("id", event_id)
            .maybe_single()
            .execute()
        )

        event = extract_single(response)

        if not event:
            raise CalendarEventNotFoundError(
                "Event was not found."
            )

        return event

    except CalendarEventNotFoundError:
        raise

    except Exception as error:
        raise CalendarEventNotFoundError(
            "Could not retrieve event."
        ) from error


def get_user_attendee_row(
    *,
    event_id: str,
    user_id: str,
) -> dict[str, Any] | None:
    try:
        response = (
            get_supabase()
            .table("calendar_event_attendees")
            .select(ATTENDEE_COLUMNS)
            .eq("event_id", event_id)
            .eq("attendee_user_id", user_id)
            .eq("attendee_kind", "beeapp_user")
            .neq("response_status", "removed")
            .maybe_single()
            .execute()
        )

        return extract_single(response)

    except Exception:
        return None


def get_event_access(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    event = get_event_row(event_id=event_id)
    calendar = get_calendar_row(
        calendar_id=event["calendar_id"],
    )

    is_organizer = (
        str(event["organizer_id"]) == str(user_id)
    )
    is_owner = (
        str(calendar["owner_id"]) == str(user_id)
    )

    attendee = None

    if not is_owner and not is_organizer:
        attendee = get_user_attendee_row(
            event_id=event_id,
            user_id=user_id,
        )

    share_permission = None

    if not is_owner and not is_organizer and not attendee:
        share_permission = get_calendar_share_permission(
            calendar_id=event["calendar_id"],
            user_id=user_id,
        )

    is_attendee = attendee is not None
    is_editor = (
        share_permission == "editor"
        and not event["is_private"]
    )
    is_viewer = (
        share_permission == "viewer"
        and not event["is_private"]
    )

    can_view = (
        is_owner
        or is_organizer
        or is_attendee
        or is_editor
        or is_viewer
    )

    if not can_view:
        raise CalendarEventNotFoundError(
            "Event was not found or is not accessible."
        )

    can_edit = is_owner or is_organizer or is_editor
    can_delete = is_owner or is_organizer
    can_manage_attendees = is_owner or is_organizer

    return {
        "event": event,
        "calendar": calendar,
        "attendee": attendee,
        "share_permission": (
            "owner"
            if is_owner
            else (
                "organizer"
                if is_organizer
                else share_permission
            )
        ),
        "is_owner": is_owner,
        "is_organizer": is_organizer,
        "is_attendee": is_attendee,
        "is_editor": is_editor,
        "can_view": can_view,
        "can_edit": can_edit,
        "can_delete": can_delete,
        "can_manage_attendees": can_manage_attendees,
    }


def get_event_for_user(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    return get_event_access(
        user_id=user_id,
        event_id=event_id,
    )["event"]


def require_event_editor(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    access = get_event_access(
        user_id=user_id,
        event_id=event_id,
    )

    if not access["can_edit"]:
        raise CalendarEventNotFoundError(
            "Event was not found or cannot be modified."
        )

    return access


def require_event_manager(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    access = get_event_access(
        user_id=user_id,
        event_id=event_id,
    )

    if not access["can_manage_attendees"]:
        raise CalendarEventNotFoundError(
            "Event was not found or cannot be managed."
        )

    return access["event"]


def require_event_deleter(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    access = get_event_access(
        user_id=user_id,
        event_id=event_id,
    )

    if not access["can_delete"]:
        raise CalendarEventNotFoundError(
            "Event was not found or cannot be deleted."
        )

    return access["event"]


def require_editor_can_manage_related_data(
    *,
    access: dict[str, Any],
    payload: dict[str, Any],
) -> None:
    if not access["is_editor"]:
        return

    restricted_fields = {
        "tag_ids",
        "conferences",
        "recurrence",
        "attendee_ids",
    }

    attempted_restricted_fields = sorted(
        restricted_fields.intersection(payload)
    )

    if attempted_restricted_fields:
        fields_label = ", ".join(
            attempted_restricted_fields
        )

        raise CalendarEventUpdateError(
            "Shared-calendar editors cannot modify "
            f"{fields_label}."
        )

    if "reminders" in payload:
        raise CalendarEventUpdateError(
            "Shared-calendar editors cannot modify "
            "another organizer's reminders."
        )
