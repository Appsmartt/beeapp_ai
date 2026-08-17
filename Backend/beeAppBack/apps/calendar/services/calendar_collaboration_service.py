from __future__ import annotations

from datetime import datetime
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.calendar.exceptions import (
    CalendarError,
    CalendarEventNotFoundError,
    CalendarNotFoundError,
)
from apps.notifications.services.notification_service import (
    create_calendar_notification,
)


CALENDAR_COLUMNS = (
    "id,owner_id,name,description,color,visibility,is_default,"
    "is_archived,timezone,created_at,updated_at"
)

EVENT_COLUMNS = (
    "id,calendar_id,organizer_id,source,status,event_kind,"
    "custom_type_name,title,description,color,is_all_day,"
    "starts_at,ends_at,starts_on,ends_on,timezone,location_name,"
    "location_address,location_maps_url,is_private,"
    "notifications_enabled,metadata,created_at,updated_at"
)

ATTENDEE_COLUMNS = (
    "id,event_id,attendee_kind,attendee_user_id,external_email,"
    "external_display_name,is_organizer,response_status,"
    "responded_at,invitation_sent_at,invitation_read_at,hidden_at,"
    "external_attendee_id,metadata,created_at,updated_at"
)

INVITEE_REQUEST_COLUMNS = (
    "id,event_id,requested_by_user_id,requested_user_id,status,"
    "reviewed_by_user_id,reviewed_at,note,created_at,updated_at"
)

CALENDAR_SHARE_COLUMNS = (
    "id,calendar_id,shared_with_user_id,permission,accepted_at,"
    "revoked_at,created_at,updated_at"
)


def _supabase():
    return get_supabase_admin_client()


def _extract_single(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if not data:
        return None

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _get_event(
    *,
    event_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("calendar_events")
        .select(EVENT_COLUMNS)
        .eq("id", event_id)
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise CalendarEventNotFoundError("Event was not found.")

    return response.data


def _get_calendar(
    *,
    calendar_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("calendars")
        .select(CALENDAR_COLUMNS)
        .eq("id", calendar_id)
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise CalendarNotFoundError("Calendar was not found.")

    return response.data


def _require_event_manager(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    event = _get_event(event_id=event_id)

    if str(event["organizer_id"]) == str(user_id):
        return event

    calendar = _get_calendar(calendar_id=event["calendar_id"])

    if str(calendar["owner_id"]) == str(user_id):
        return event

    raise CalendarEventNotFoundError(
        "Event was not found or cannot be managed."
    )


def _require_accepted_attendee(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("calendar_event_attendees")
        .select(ATTENDEE_COLUMNS)
        .eq("event_id", event_id)
        .eq("attendee_user_id", user_id)
        .eq("attendee_kind", "beeapp_user")
        .eq("response_status", "accepted")
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise CalendarEventNotFoundError(
            "You must accept the event invitation first."
        )

    return response.data


def _require_existing_profile(
    *,
    user_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("profile")
        .select(
            "id,first_name,last_name,email,phone_dial_code,"
            "phone_number,normalized_phone"
        )
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise CalendarError("BeeApp user was not found.")

    return response.data


def list_event_attendees(
    *,
    user_id: str,
    event_id: str,
) -> list[dict[str, Any]]:
    _get_event(event_id=event_id)

    response = (
        _supabase()
        .table("calendar_event_attendees")
        .select(ATTENDEE_COLUMNS)
        .eq("event_id", event_id)
        .order("is_organizer", desc=True)
        .order("created_at")
        .execute()
    )

    return response.data or []


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

    event = _get_event(event_id=event_id)

    response = (
        _supabase()
        .table("calendar_event_attendees")
        .update(
            {
                "response_status": response_status,
                "responded_at": datetime.now().isoformat(),
                "invitation_read_at": datetime.now().isoformat(),
            }
        )
        .eq("event_id", event_id)
        .eq("attendee_user_id", user_id)
        .eq("attendee_kind", "beeapp_user")
        .neq("is_organizer", True)
        .neq("response_status", "removed")
        .execute()
    )

    attendee = _extract_single(response)

    if not attendee:
        raise CalendarEventNotFoundError(
            "Event invitation was not found."
        )

    _safe_notify(
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
            f"Un invitado respondió al evento "
            f"“{event['title']}”."
        ),
        metadata={
            "event_id": event_id,
            "calendar_id": event["calendar_id"],
            "attendee_user_id": user_id,
            "response_status": response_status,
        },
    )

    return attendee


def set_declined_event_hidden(
    *,
    user_id: str,
    event_id: str,
    hidden: bool,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("calendar_event_attendees")
        .update(
            {
                "hidden_at": (
                    datetime.now().isoformat()
                    if hidden
                    else None
                )
            }
        )
        .eq("event_id", event_id)
        .eq("attendee_user_id", user_id)
        .eq("response_status", "declined")
        .execute()
    )

    attendee = _extract_single(response)

    if not attendee:
        raise CalendarEventNotFoundError(
            "Declined event was not found."
        )

    return attendee


def remove_event_attendee(
    *,
    user_id: str,
    event_id: str,
    attendee_user_id: str,
) -> dict[str, Any]:
    event = _require_event_manager(
        user_id=user_id,
        event_id=event_id,
    )

    if str(attendee_user_id) == str(event["organizer_id"]):
        raise CalendarError(
            "The organizer cannot be removed from the event."
        )

    response = (
        _supabase()
        .table("calendar_event_attendees")
        .update(
            {
                "response_status": "removed",
                "hidden_at": datetime.now().isoformat(),
            }
        )
        .eq("event_id", event_id)
        .eq("attendee_user_id", attendee_user_id)
        .eq("attendee_kind", "beeapp_user")
        .neq("is_organizer", True)
        .execute()
    )

    attendee = _extract_single(response)

    if not attendee:
        raise CalendarEventNotFoundError(
            "Event attendee was not found."
        )

    _safe_notify(
        recipient_id=attendee_user_id,
        notification_type="event_attendee_removed",
        title="Ya no estás invitado",
        body=(
            f"Fuiste removido del evento “{event['title']}”."
        ),
        metadata={
            "event_id": event_id,
            "calendar_id": event["calendar_id"],
        },
    )

    return attendee


def create_invitee_request(
    *,
    user_id: str,
    event_id: str,
    requested_user_id: str,
    note: str | None = None,
) -> dict[str, Any]:
    event = _get_event(event_id=event_id)

    if str(requested_user_id) == str(user_id):
        raise CalendarError("You cannot request yourself.")

    _require_accepted_attendee(
        user_id=user_id,
        event_id=event_id,
    )
    _require_existing_profile(user_id=requested_user_id)

    existing_attendee_response = (
        _supabase()
        .table("calendar_event_attendees")
        .select("id,response_status")
        .eq("event_id", event_id)
        .eq("attendee_user_id", requested_user_id)
        .maybe_single()
        .execute()
    )

    existing_attendee = existing_attendee_response.data

    if (
        existing_attendee
        and existing_attendee["response_status"] != "removed"
    ):
        raise CalendarError(
            "This user is already an attendee of the event."
        )

    response = (
        _supabase()
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

    request_row = _extract_single(response)

    if not request_row:
        raise CalendarError(
            "Could not create attendee request."
        )

    _safe_notify(
        recipient_id=event["organizer_id"],
        notification_type="event_invitee_request",
        title="Solicitud para añadir invitado",
        body=(
            f"Un invitado solicitó añadir a otra persona al "
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
    _require_event_manager(
        user_id=user_id,
        event_id=event_id,
    )

    response = (
        _supabase()
        .table("calendar_event_invitee_requests")
        .select(INVITEE_REQUEST_COLUMNS)
        .eq("event_id", event_id)
        .order("created_at", desc=True)
        .execute()
    )

    return response.data or []


def review_invitee_request(
    *,
    user_id: str,
    request_id: str,
    approved: bool,
) -> dict[str, Any]:
    request_response = (
        _supabase()
        .table("calendar_event_invitee_requests")
        .select(INVITEE_REQUEST_COLUMNS)
        .eq("id", request_id)
        .maybe_single()
        .execute()
    )

    request_row = request_response.data

    if not request_row:
        raise CalendarError("Invitee request was not found.")

    event = _require_event_manager(
        user_id=user_id,
        event_id=request_row["event_id"],
    )

    if request_row["status"] != "pending_organizer_approval":
        raise CalendarError(
            "Invitee request was already reviewed."
        )

    new_status = "approved" if approved else "rejected"

    update_response = (
        _supabase()
        .table("calendar_event_invitee_requests")
        .update(
            {
                "status": new_status,
                "reviewed_by_user_id": user_id,
                "reviewed_at": datetime.now().isoformat(),
            }
        )
        .eq("id", request_id)
        .eq("status", "pending_organizer_approval")
        .execute()
    )

    reviewed_request = _extract_single(update_response)

    if not reviewed_request:
        raise CalendarError(
            "Could not review invitee request."
        )

    if approved:
        attendee_response = (
            _supabase()
            .table("calendar_event_attendees")
            .insert(
                {
                    "event_id": event["id"],
                    "attendee_kind": "beeapp_user",
                    "attendee_user_id": (
                        request_row["requested_user_id"]
                    ),
                    "is_organizer": False,
                    "response_status": "pending",
                    "invitation_sent_at": (
                        datetime.now().isoformat()
                    ),
                }
            )
            .execute()
        )

        if not attendee_response.data:
            raise CalendarError(
                "Could not add approved attendee."
            )

        _safe_notify(
            recipient_id=request_row["requested_user_id"],
            notification_type="event_invitation",
            title="Nueva invitación",
            body=(
                f"Te invitaron al evento “{event['title']}”."
            ),
            metadata={
                "event_id": event["id"],
                "calendar_id": event["calendar_id"],
                "action": "rsvp",
            },
        )

    _safe_notify(
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
            f"Tu solicitud para añadir un invitado al evento "
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


def create_calendar_share(
    *,
    user_id: str,
    calendar_id: str,
    shared_with_user_id: str,
    permission: str,
) -> dict[str, Any]:
    calendar = _get_calendar(calendar_id=calendar_id)

    if str(calendar["owner_id"]) != str(user_id):
        raise CalendarNotFoundError(
            "Calendar was not found or cannot be shared."
        )

    if str(shared_with_user_id) == str(user_id):
        raise CalendarError(
            "You cannot share a calendar with yourself."
        )

    if permission not in ("viewer", "editor"):
        raise CalendarError(
            "Calendar permission must be viewer or editor."
        )

    _require_existing_profile(user_id=shared_with_user_id)

    try:
        response = (
            _supabase()
            .rpc(
                "create_calendar_share_for_backend",
                {
                    "p_owner_id": user_id,
                    "p_calendar_id": calendar_id,
                    "p_shared_with_user_id": shared_with_user_id,
                    "p_permission": permission,
                },
            )
            .execute()
        )

        share = _extract_single(response)

        if not share:
            raise CalendarError(
                "Could not create calendar share."
            )

    except CalendarError:
        raise

    except Exception as error:
        raise CalendarError(
            f"Could not create calendar share: {error}"
        ) from error

    _safe_notify(
        recipient_id=shared_with_user_id,
        notification_type="calendar_share_invitation",
        title="Invitación a calendario",
        body=(
            f"Te invitaron al calendario “{calendar['name']}”."
        ),
        metadata={
            "calendar_id": calendar_id,
            "calendar_share_id": share["id"],
            "permission": permission,
        },
    )

    return share


def list_calendar_shares(
    *,
    user_id: str,
    calendar_id: str,
) -> list[dict[str, Any]]:
    calendar = _get_calendar(calendar_id=calendar_id)

    if str(calendar["owner_id"]) != str(user_id):
        raise CalendarNotFoundError(
            "Calendar was not found or cannot be managed."
        )

    response = (
        _supabase()
        .table("calendar_shares")
        .select(CALENDAR_SHARE_COLUMNS)
        .eq("calendar_id", calendar_id)
        .order("created_at", desc=True)
        .execute()
    )

    return response.data or []


def accept_calendar_share(
    *,
    user_id: str,
    share_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("calendar_shares")
        .update(
            {
                "accepted_at": datetime.now().isoformat(),
            }
        )
        .eq("id", share_id)
        .eq("shared_with_user_id", user_id)
        .is_("revoked_at", "null")
        .execute()
    )

    share = _extract_single(response)

    if not share:
        raise CalendarNotFoundError(
            "Calendar share invitation was not found."
        )

    return share


def revoke_calendar_share(
    *,
    user_id: str,
    share_id: str,
) -> dict[str, Any]:
    share_response = (
        _supabase()
        .table("calendar_shares")
        .select(CALENDAR_SHARE_COLUMNS)
        .eq("id", share_id)
        .maybe_single()
        .execute()
    )

    share = share_response.data

    if not share:
        raise CalendarNotFoundError("Calendar share was not found.")

    calendar = _get_calendar(calendar_id=share["calendar_id"])

    if str(calendar["owner_id"]) != str(user_id):
        raise CalendarNotFoundError(
            "Calendar share was not found or cannot be revoked."
        )

    response = (
        _supabase()
        .table("calendar_shares")
        .update(
            {
                "revoked_at": datetime.now().isoformat(),
            }
        )
        .eq("id", share_id)
        .execute()
    )

    revoked_share = _extract_single(response)

    if not revoked_share:
        raise CalendarError("Could not revoke calendar share.")

    _safe_notify(
        recipient_id=share["shared_with_user_id"],
        notification_type="calendar_share_revoked",
        title="Acceso a calendario revocado",
        body=(
            f"Ya no tienes acceso al calendario "
            f"“{calendar['name']}”."
        ),
        metadata={
            "calendar_id": calendar["id"],
            "calendar_share_id": share_id,
        },
    )

    return revoked_share


def _safe_notify(
    *,
    recipient_id: str,
    notification_type: str,
    title: str,
    body: str,
    metadata: dict[str, Any],
) -> None:
    try:
        create_calendar_notification(
            recipient_id=recipient_id,
            notification_type=notification_type,
            title=title,
            body=body,
            metadata=metadata,
        )
    except Exception:
        return