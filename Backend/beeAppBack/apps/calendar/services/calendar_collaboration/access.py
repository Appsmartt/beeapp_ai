from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import (
    CalendarError,
    CalendarEventNotFoundError,
    CalendarNotFoundError,
)

from .helpers import (
    ATTENDEE_COLUMNS,
    CALENDAR_COLUMNS,
    EVENT_COLUMNS,
    extract_single,
    get_supabase,
)


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
        return permission if permission in ("viewer", "editor") else None

    except Exception:
        return None


def get_user_attendee_row(
    *,
    event_id: str,
    user_id: str,
    include_removed: bool = False,
) -> dict[str, Any] | None:
    try:
        query = (
            get_supabase()
            .table("calendar_event_attendees")
            .select(ATTENDEE_COLUMNS)
            .eq("event_id", event_id)
            .eq("attendee_kind", "beeapp_user")
            .eq("attendee_user_id", user_id)
        )

        if not include_removed:
            query = query.neq("response_status", "removed")

        return extract_single(query.maybe_single().execute())

    except Exception:
        return None


def get_event_access(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    event = get_event_row(event_id=event_id)
    calendar = get_calendar_row(calendar_id=event["calendar_id"])

    is_owner = str(calendar["owner_id"]) == str(user_id)
    is_organizer = str(event["organizer_id"]) == str(user_id)
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
    is_shared_editor = (
        share_permission == "editor"
        and not event["is_private"]
    )
    is_shared_viewer = (
        share_permission == "viewer"
        and not event["is_private"]
    )
    can_view = (
        is_owner
        or is_organizer
        or is_attendee
        or is_shared_editor
        or is_shared_viewer
    )

    if not can_view:
        raise CalendarEventNotFoundError(
            "Event was not found or is not accessible."
        )

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
        "is_shared_editor": is_shared_editor,
        "is_shared_viewer": is_shared_viewer,
        "can_view": can_view,
        "can_edit": (
            is_owner
            or is_organizer
            or is_shared_editor
        ),
        "can_manage_attendees": (
            is_owner
            or is_organizer
        ),
    }


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


def require_accepted_attendee(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    attendee = get_user_attendee_row(
        event_id=event_id,
        user_id=user_id,
    )

    if (
        not attendee
        or attendee.get("response_status") != "accepted"
    ):
        raise CalendarEventNotFoundError(
            "You must accept the event invitation first."
        )

    return attendee


def require_existing_profile(
    *,
    user_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase()
            .table("profile")
            .select(
                "id,first_name,last_name,email,phone_dial_code,"
                "phone_number,normalized_phone"
            )
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        profile = extract_single(response)

        if not profile:
            raise CalendarError(
                "BeeApp user was not found."
            )

        return profile

    except CalendarError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not verify BeeApp user."
        ) from error
