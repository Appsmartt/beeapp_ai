from __future__ import annotations

from datetime import datetime, timezone
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


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_single(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _response_data(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def _get_event(
    *,
    event_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("calendar_events")
            .select(EVENT_COLUMNS)
            .eq("id", event_id)
            .maybe_single()
            .execute()
        )

        event = _extract_single(response)

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


def _get_calendar(
    *,
    calendar_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("calendars")
            .select(CALENDAR_COLUMNS)
            .eq("id", calendar_id)
            .maybe_single()
            .execute()
        )

        calendar = _extract_single(response)

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


def _get_calendar_share_permission(
    *,
    calendar_id: str,
    user_id: str,
) -> str | None:
    try:
        response = (
            _supabase()
            .table("calendar_shares")
            .select("permission,accepted_at,revoked_at")
            .eq("calendar_id", calendar_id)
            .eq("shared_with_user_id", user_id)
            .not_.is_("accepted_at", "null")
            .is_("revoked_at", "null")
            .maybe_single()
            .execute()
        )

        share = _extract_single(response)

        if not share:
            return None

        permission = share.get("permission")

        if permission in ("viewer", "editor"):
            return permission

        return None

    except Exception:
        return None


def _get_user_attendee(
    *,
    event_id: str,
    user_id: str,
    include_removed: bool = False,
) -> dict[str, Any] | None:
    try:
        query = (
            _supabase()
            .table("calendar_event_attendees")
            .select(ATTENDEE_COLUMNS)
            .eq("event_id", event_id)
            .eq("attendee_kind", "beeapp_user")
            .eq("attendee_user_id", user_id)
        )

        if not include_removed:
            query = query.neq("response_status", "removed")

        response = query.maybe_single().execute()

        return _extract_single(response)

    except Exception:
        return None


def _get_event_access(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    event = _get_event(event_id=event_id)
    calendar = _get_calendar(calendar_id=event["calendar_id"])

    is_owner = str(calendar["owner_id"]) == str(user_id)
    is_organizer = (
        str(event["organizer_id"]) == str(user_id)
    )

    attendee = None

    if not is_owner and not is_organizer:
        attendee = _get_user_attendee(
            event_id=event_id,
            user_id=user_id,
        )

    share_permission = None

    if not is_owner and not is_organizer and not attendee:
        share_permission = _get_calendar_share_permission(
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


def _require_event_manager(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    access = _get_event_access(
        user_id=user_id,
        event_id=event_id,
    )

    if not access["can_manage_attendees"]:
        raise CalendarEventNotFoundError(
            "Event was not found or cannot be managed."
        )

    return access["event"]


def _require_accepted_attendee(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    attendee = _get_user_attendee(
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


def _require_existing_profile(
    *,
    user_id: str,
) -> dict[str, Any]:
    try:
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

        profile = _extract_single(response)

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


def _create_or_reactivate_attendee(
    *,
    event_id: str,
    attendee_user_id: str,
) -> dict[str, Any]:
    try:
        supabase = _supabase()

        existing = _get_user_attendee(
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
                        "invitation_sent_at": _utc_now_iso(),
                        "invitation_read_at": None,
                    }
                )
                .eq("id", existing["id"])
                .execute()
            )

            attendee = _extract_single(response)

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
                    "invitation_sent_at": _utc_now_iso(),
                }
            )
            .execute()
        )

        attendee = _extract_single(response)

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
    _get_event_access(
        user_id=user_id,
        event_id=event_id,
    )

    try:
        response = (
            _supabase()
            .table("calendar_event_attendees")
            .select(ATTENDEE_COLUMNS)
            .eq("event_id", event_id)
            .neq("response_status", "removed")
            .order("is_organizer", desc=True)
            .order("created_at")
            .execute()
        )

        return _response_data(response)

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

    access = _get_event_access(
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
            _supabase()
            .table("calendar_event_attendees")
            .update(
                {
                    "response_status": response_status,
                    "invitation_read_at": _utc_now_iso(),
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

        updated_attendee = _extract_single(response)

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
    attendee = _get_user_attendee(
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
            _supabase()
            .table("calendar_event_attendees")
            .update(
                {
                    "hidden_at": (
                        _utc_now_iso()
                        if hidden
                        else None
                    )
                }
            )
            .eq("id", attendee["id"])
            .eq("event_id", event_id)
            .eq("attendee_user_id", user_id)
            .eq("response_status", "declined")
            .neq("is_organizer", True)
            .execute()
        )

        updated_attendee = _extract_single(response)

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
    event = _require_event_manager(
        user_id=user_id,
        event_id=event_id,
    )

    if str(attendee_user_id) == str(event["organizer_id"]):
        raise CalendarError(
            "The organizer cannot be removed from the event."
        )

    try:
        response = (
            _supabase()
            .table("calendar_event_attendees")
            .update(
                {
                    "response_status": "removed",
                    "hidden_at": _utc_now_iso(),
                }
            )
            .eq("event_id", event_id)
            .eq("attendee_user_id", attendee_user_id)
            .eq("attendee_kind", "beeapp_user")
            .neq("is_organizer", True)
            .neq("response_status", "removed")
            .execute()
        )

        attendee = _extract_single(response)

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
        raise CalendarError(
            "You cannot request yourself."
        )

    _require_accepted_attendee(
        user_id=user_id,
        event_id=event_id,
    )

    _require_existing_profile(user_id=requested_user_id)

    existing_attendee = _get_user_attendee(
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

    except CalendarError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not create attendee request."
        ) from error

    _safe_notify(
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
    _require_event_manager(
        user_id=user_id,
        event_id=event_id,
    )

    try:
        response = (
            _supabase()
            .table("calendar_event_invitee_requests")
            .select(INVITEE_REQUEST_COLUMNS)
            .eq("event_id", event_id)
            .order("created_at", desc=True)
            .execute()
        )

        return _response_data(response)

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
            _supabase()
            .table("calendar_event_invitee_requests")
            .select(INVITEE_REQUEST_COLUMNS)
            .eq("id", request_id)
            .maybe_single()
            .execute()
        )

        request_row = _extract_single(request_response)

        if not request_row:
            raise CalendarError(
                "Invitee request was not found."
            )

        event = _require_event_manager(
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

        _require_existing_profile(
            user_id=request_row["requested_user_id"],
        )

        new_status = "approved" if approved else "rejected"

        update_response = (
            _supabase()
            .table("calendar_event_invitee_requests")
            .update(
                {
                    "status": new_status,
                    "reviewed_by_user_id": user_id,
                    "reviewed_at": _utc_now_iso(),
                }
            )
            .eq("id", request_id)
            .eq(
                "status",
                "pending_organizer_approval",
            )
            .execute()
        )

        reviewed_request = _extract_single(update_response)

        if not reviewed_request:
            raise CalendarError(
                "Could not review invitee request."
            )

        if approved:
            _create_or_reactivate_attendee(
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

    if calendar["is_archived"]:
        raise CalendarError(
            "Archived calendars cannot be shared."
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
                    "p_shared_with_user_id": (
                        shared_with_user_id
                    ),
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

    try:
        response = (
            _supabase()
            .table("calendar_shares")
            .select(CALENDAR_SHARE_COLUMNS)
            .eq("calendar_id", calendar_id)
            .order("created_at", desc=True)
            .execute()
        )

        return _response_data(response)

    except Exception as error:
        raise CalendarError(
            "Could not retrieve calendar shares."
        ) from error


def accept_calendar_share(
    *,
    user_id: str,
    share_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("calendar_shares")
            .update(
                {
                    "accepted_at": _utc_now_iso(),
                }
            )
            .eq("id", share_id)
            .eq("shared_with_user_id", user_id)
            .is_("revoked_at", "null")
            .is_("accepted_at", "null")
            .execute()
        )

        share = _extract_single(response)

        if not share:
            raise CalendarNotFoundError(
                "Calendar share invitation was not found."
            )

        return share

    except CalendarNotFoundError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not accept calendar share."
        ) from error


def revoke_calendar_share(
    *,
    user_id: str,
    share_id: str,
) -> dict[str, Any]:
    try:
        share_response = (
            _supabase()
            .table("calendar_shares")
            .select(CALENDAR_SHARE_COLUMNS)
            .eq("id", share_id)
            .maybe_single()
            .execute()
        )

        share = _extract_single(share_response)

        if not share:
            raise CalendarNotFoundError(
                "Calendar share was not found."
            )

        calendar = _get_calendar(
            calendar_id=share["calendar_id"]
        )

        if str(calendar["owner_id"]) != str(user_id):
            raise CalendarNotFoundError(
                "Calendar share was not found or cannot "
                "be revoked."
            )

        if share.get("revoked_at") is not None:
            return share

        response = (
            _supabase()
            .table("calendar_shares")
            .update(
                {
                    "revoked_at": _utc_now_iso(),
                }
            )
            .eq("id", share_id)
            .is_("revoked_at", "null")
            .execute()
        )

        revoked_share = _extract_single(response)

        if not revoked_share:
            raise CalendarError(
                "Could not revoke calendar share."
            )

    except (
        CalendarError,
        CalendarNotFoundError,
    ):
        raise

    except Exception as error:
        raise CalendarError(
            "Could not revoke calendar share."
        ) from error

    _safe_notify(
        recipient_id=share["shared_with_user_id"],
        notification_type="calendar_share_revoked",
        title="Acceso a calendario revocado",
        body=(
            "Ya no tienes acceso al calendario "
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