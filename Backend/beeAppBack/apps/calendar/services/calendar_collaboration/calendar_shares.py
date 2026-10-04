from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import (
    CalendarError,
    CalendarNotFoundError,
)

from .access import get_calendar_row, require_existing_profile
from .helpers import (
    CALENDAR_SHARE_COLUMNS,
    extract_single,
    get_supabase,
    response_data,
    utc_now_iso,
)
from .notifications import safe_calendar_notification


def create_calendar_share(
    *,
    user_id: str,
    calendar_id: str,
    shared_with_user_id: str,
    permission: str,
) -> dict[str, Any]:
    calendar = get_calendar_row(calendar_id=calendar_id)

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

    require_existing_profile(user_id=shared_with_user_id)

    try:
        response = (
            get_supabase()
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
        share = extract_single(response)

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

    safe_calendar_notification(
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
    calendar = get_calendar_row(calendar_id=calendar_id)

    if str(calendar["owner_id"]) != str(user_id):
        raise CalendarNotFoundError(
            "Calendar was not found or cannot be managed."
        )

    try:
        response = (
            get_supabase()
            .table("calendar_shares")
            .select(CALENDAR_SHARE_COLUMNS)
            .eq("calendar_id", calendar_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response_data(response)

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
            get_supabase()
            .table("calendar_shares")
            .update(
                {
                    "accepted_at": utc_now_iso(),
                }
            )
            .eq("id", share_id)
            .eq("shared_with_user_id", user_id)
            .is_("revoked_at", "null")
            .is_("accepted_at", "null")
            .execute()
        )
        share = extract_single(response)

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
            get_supabase()
            .table("calendar_shares")
            .select(CALENDAR_SHARE_COLUMNS)
            .eq("id", share_id)
            .maybe_single()
            .execute()
        )
        share = extract_single(share_response)

        if not share:
            raise CalendarNotFoundError(
                "Calendar share was not found."
            )

        calendar = get_calendar_row(
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
            get_supabase()
            .table("calendar_shares")
            .update(
                {
                    "revoked_at": utc_now_iso(),
                }
            )
            .eq("id", share_id)
            .is_("revoked_at", "null")
            .execute()
        )
        revoked_share = extract_single(response)

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

    safe_calendar_notification(
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
