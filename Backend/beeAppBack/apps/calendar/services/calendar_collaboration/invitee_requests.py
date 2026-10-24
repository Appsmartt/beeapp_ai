from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import (
    CalendarError,
    CalendarEventNotFoundError,
)

from .access import (
    get_event_row,
    get_user_attendee_row,
    require_accepted_attendee,
    require_event_manager,
    require_existing_profile,
)
from .attendees import create_or_reactivate_attendee
from .helpers import (
    INVITEE_REQUEST_COLUMNS,
    extract_single,
    get_supabase,
    response_data,
    utc_now_iso,
)
from .notifications import safe_calendar_notification


def create_invitee_request(
    *,
    user_id: str,
    event_id: str,
    requested_user_id: str,
    note: str | None = None,
) -> dict[str, Any]:
    event = get_event_row(event_id=event_id)

    if str(requested_user_id) == str(user_id):
        raise CalendarError(
            "You cannot request yourself."
        )

    require_accepted_attendee(
        user_id=user_id,
        event_id=event_id,
    )
    require_existing_profile(user_id=requested_user_id)

    existing_attendee = get_user_attendee_row(
        event_id=event_id,
        user_id=requested_user_id,
        include_removed=True,
    )

    if (
        existing_attendee
        and existing_attendee["response_status"] != "removed"
    ):
        raise CalendarError(
            "This user is already an attendee of the event."
        )

    try:
        response = (
            get_supabase()
            .table("calendar_event_invitee_requests")
            .insert(
                {
                    "event_id": event_id,
                    "requested_by_user_id": user_id,
                    "requested_user_id": requested_user_id,
                    "status": "pending_organizer_approval",
                    "note": note or None,
                }
            )
            .execute()
        )
        request_row = extract_single(response)

        if not request_row:
            raise CalendarError(
                "Could not create attendee request."
            )

    except CalendarError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not create attendee request."
        ) from error

    safe_calendar_notification(
        recipient_id=event["organizer_id"],
        notification_type="event_invitee_request",
        title="Solicitud para añadir invitado",
        body=(
            "Un invitado solicitó añadir a otra persona al "
            f"evento “{event['title']}”."
        ),
        metadata={
            "event_id": event_id,
            "calendar_id": event["calendar_id"],
            "invitee_request_id": request_row["id"],
            "requested_by_user_id": user_id,
            "requested_user_id": requested_user_id,
        },
    )

    return request_row


def list_event_invitee_requests(
    *,
    user_id: str,
    event_id: str,
) -> list[dict[str, Any]]:
    require_event_manager(
        user_id=user_id,
        event_id=event_id,
    )

    try:
        response = (
            get_supabase()
            .table("calendar_event_invitee_requests")
            .select(INVITEE_REQUEST_COLUMNS)
            .eq("event_id", event_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response_data(response)

    except Exception as error:
        raise CalendarError(
            "Could not retrieve attendee requests."
        ) from error


def review_invitee_request(
    *,
    user_id: str,
    request_id: str,
    approved: bool,
) -> dict[str, Any]:
    try:
        request_response = (
            get_supabase()
            .table("calendar_event_invitee_requests")
            .select(INVITEE_REQUEST_COLUMNS)
            .eq("id", request_id)
            .maybe_single()
            .execute()
        )
        request_row = extract_single(request_response)

        if not request_row:
            raise CalendarError(
                "Invitee request was not found."
            )

        event = require_event_manager(
            user_id=user_id,
            event_id=request_row["event_id"],
        )

        if (
            request_row["status"]
            != "pending_organizer_approval"
        ):
            raise CalendarError(
                "Invitee request was already reviewed."
            )

        require_existing_profile(
            user_id=request_row["requested_user_id"],
        )

        new_status = "approved" if approved else "rejected"

        update_response = (
            get_supabase()
            .table("calendar_event_invitee_requests")
            .update(
                {
                    "status": new_status,
                    "reviewed_by_user_id": user_id,
                    "reviewed_at": utc_now_iso(),
                }
            )
            .eq("id", request_id)
            .eq(
                "status",
                "pending_organizer_approval",
            )
            .execute()
        )
        reviewed_request = extract_single(update_response)

        if not reviewed_request:
            raise CalendarError(
                "Could not review invitee request."
            )

        if approved:
            create_or_reactivate_attendee(
                event_id=event["id"],
                attendee_user_id=(
                    request_row["requested_user_id"]
                ),
            )

    except (
        CalendarError,
        CalendarEventNotFoundError,
    ):
        raise

    except Exception as error:
        raise CalendarError(
            "Could not review attendee request."
        ) from error

    if approved:
        safe_calendar_notification(
            recipient_id=request_row["requested_user_id"],
            notification_type="event_invitation",
            title="Nueva invitación",
            body=f"Te invitaron al evento “{event['title']}”.",
            metadata={
                "event_id": event["id"],
                "calendar_id": event["calendar_id"],
                "action": "rsvp",
            },
        )

    safe_calendar_notification(
        recipient_id=request_row["requested_by_user_id"],
        notification_type=(
            "event_invitee_request_approved"
            if approved
            else "event_invitee_request_rejected"
        ),
        title=(
            "Solicitud aprobada"
            if approved
            else "Solicitud rechazada"
        ),
        body=(
            "Tu solicitud para añadir un invitado al evento "
            f"“{event['title']}” fue "
            f"{'aprobada' if approved else 'rechazada'}."
        ),
        metadata={
            "event_id": event["id"],
            "calendar_id": event["calendar_id"],
            "invitee_request_id": request_id,
        },
    )

    return reviewed_request
