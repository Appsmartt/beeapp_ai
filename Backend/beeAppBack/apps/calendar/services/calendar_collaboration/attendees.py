from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import (
    CalendarError,
    CalendarEventNotFoundError,
)

from .access import (
    get_event_access,
    get_user_attendee_row,
    require_event_manager,
)
from .helpers import (
    ATTENDEE_COLUMNS,
    extract_single,
    get_supabase,
    response_data,
    utc_now_iso,
)
from .notifications import safe_calendar_notification


def create_or_reactivate_attendee(
    *,
    event_id: str,
    attendee_user_id: str,
) -> dict[str, Any]:
    try:
        supabase = get_supabase()
        existing = get_user_attendee_row(
            event_id=event_id,
            user_id=attendee_user_id,
            include_removed=True,
        )

        if existing:
            if existing["is_organizer"]:
                raise CalendarError(
                    "The organizer is already an attendee."
                )

            if existing["response_status"] != "removed":
                raise CalendarError(
                    "This user is already an attendee "
                    "of the event."
                )

            response = (
                supabase.table("calendar_event_attendees")
                .update(
                    {
                        "response_status": "pending",
                        "responded_at": None,
                        "hidden_at": None,
                        "invitation_sent_at": utc_now_iso(),
                        "invitation_read_at": None,
                    }
                )
                .eq("id", existing["id"])
                .execute()
            )
            attendee = extract_single(response)

            if not attendee:
                raise CalendarError(
                    "Could not reactivate event attendee."
                )

            return attendee

        response = (
            supabase.table("calendar_event_attendees")
            .insert(
                {
                    "event_id": event_id,
                    "attendee_kind": "beeapp_user",
                    "attendee_user_id": attendee_user_id,
                    "is_organizer": False,
                    "response_status": "pending",
                    "invitation_sent_at": utc_now_iso(),
                }
            )
            .execute()
        )
        attendee = extract_single(response)

        if not attendee:
            raise CalendarError(
                "Could not add event attendee."
            )

        return attendee

    except CalendarError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not create event attendee."
        ) from error


def list_event_attendees(
    *,
    user_id: str,
    event_id: str,
) -> list[dict[str, Any]]:
    get_event_access(
        user_id=user_id,
        event_id=event_id,
    )

    try:
        response = (
            get_supabase()
            .table("calendar_event_attendees")
            .select(ATTENDEE_COLUMNS)
            .eq("event_id", event_id)
            .neq("response_status", "removed")
            .order("is_organizer", desc=True)
            .order("created_at")
            .execute()
        )
        return response_data(response)

    except Exception as error:
        raise CalendarError(
            "Could not retrieve event attendees."
        ) from error


def respond_to_event_invitation(
    *,
    user_id: str,
    event_id: str,
    response_status: str,
) -> dict[str, Any]:
    if response_status not in ("accepted", "declined"):
        raise CalendarError(
            "Only accepted or declined RSVP responses are allowed."
        )

    access = get_event_access(
        user_id=user_id,
        event_id=event_id,
    )
    event = access["event"]
    attendee = access["attendee"]

    if not attendee or attendee.get("is_organizer"):
        raise CalendarEventNotFoundError(
            "Event invitation was not found."
        )

    try:
        response = (
            get_supabase()
            .table("calendar_event_attendees")
            .update(
                {
                    "response_status": response_status,
                    "invitation_read_at": utc_now_iso(),
                    "hidden_at": None,
                }
            )
            .eq("id", attendee["id"])
            .eq("event_id", event_id)
            .eq("attendee_user_id", user_id)
            .eq("attendee_kind", "beeapp_user")
            .neq("is_organizer", True)
            .neq("response_status", "removed")
            .execute()
        )
        updated_attendee = extract_single(response)

        if not updated_attendee:
            raise CalendarEventNotFoundError(
                "Event invitation was not found."
            )

    except CalendarEventNotFoundError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not update event invitation response."
        ) from error

    safe_calendar_notification(
        recipient_id=event["organizer_id"],
        notification_type=(
            "event_rsvp_accepted"
            if response_status == "accepted"
            else "event_rsvp_declined"
        ),
        title=(
            "Invitación aceptada"
            if response_status == "accepted"
            else "Invitación rechazada"
        ),
        body=(
            "Un invitado respondió al evento "
            f"“{event['title']}”."
        ),
        metadata={
            "event_id": event_id,
            "calendar_id": event["calendar_id"],
            "attendee_user_id": user_id,
            "response_status": response_status,
        },
    )

    return updated_attendee


def set_declined_event_hidden(
    *,
    user_id: str,
    event_id: str,
    hidden: bool,
) -> dict[str, Any]:
    attendee = get_user_attendee_row(
        event_id=event_id,
        user_id=user_id,
    )

    if (
        not attendee
        or attendee.get("response_status") != "declined"
        or attendee.get("is_organizer")
    ):
        raise CalendarEventNotFoundError(
            "Declined event was not found."
        )

    try:
        response = (
            get_supabase()
            .table("calendar_event_attendees")
            .update(
                {
                    "hidden_at": utc_now_iso() if hidden else None,
                }
            )
            .eq("id", attendee["id"])
            .eq("event_id", event_id)
            .eq("attendee_user_id", user_id)
            .eq("response_status", "declined")
            .neq("is_organizer", True)
            .execute()
        )
        updated_attendee = extract_single(response)

        if not updated_attendee:
            raise CalendarEventNotFoundError(
                "Declined event was not found."
            )

        return updated_attendee

    except CalendarEventNotFoundError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not update declined event visibility."
        ) from error


def remove_event_attendee(
    *,
    user_id: str,
    event_id: str,
    attendee_user_id: str,
) -> dict[str, Any]:
    event = require_event_manager(
        user_id=user_id,
        event_id=event_id,
    )

    if str(attendee_user_id) == str(event["organizer_id"]):
        raise CalendarError(
            "The organizer cannot be removed from the event."
        )

    try:
        response = (
            get_supabase()
            .table("calendar_event_attendees")
            .update(
                {
                    "response_status": "removed",
                    "hidden_at": utc_now_iso(),
                }
            )
            .eq("event_id", event_id)
            .eq("attendee_user_id", attendee_user_id)
            .eq("attendee_kind", "beeapp_user")
            .neq("is_organizer", True)
            .neq("response_status", "removed")
            .execute()
        )
        attendee = extract_single(response)

        if not attendee:
            raise CalendarEventNotFoundError(
                "Event attendee was not found."
            )

    except CalendarEventNotFoundError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not remove event attendee."
        ) from error

    safe_calendar_notification(
        recipient_id=attendee_user_id,
        notification_type="event_attendee_removed",
        title="Ya no estás invitado",
        body=f"Fuiste removido del evento “{event['title']}”.",
        metadata={
            "event_id": event_id,
            "calendar_id": event["calendar_id"],
        },
    )

    return attendee
