from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.notes.exceptions import (
    NoteNotFoundError,
    NoteShareError,
    NoteShareNotFoundError,
    NoteShareRecipientNotFoundError,
)
from apps.notes.services.note_service import (
    get_owned_note,
)


NOTE_SHARE_COLUMNS = (
    "id,note_id,shared_by_user_id,shared_with_user_id,"
    "permission,accepted_at,revoked_at,expires_at,hidden_at,"
    "shared_with_displayed_at,created_at,updated_at"
)

NOTE_LIST_COLUMNS = (
    "id,owner_id,folder_id,template_id,title,color,"
    "is_favorite,is_pinned,is_archived,position,"
    "deleted_at,purge_after,last_opened_at,"
    "created_at,updated_at"
)

PROFILE_COLUMNS = (
    "id,first_name,last_name,phone_dial_code,phone_number"
)


def create_note_share(
    *,
    user_id: str,
    note_id: str,
    recipient_id: str,
    expires_at: str | None = None,
) -> dict[str, Any]:
    try:
        get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=False,
        )

        if str(recipient_id) == str(user_id):
            raise NoteShareError(
                "You cannot share a note with yourself."
            )

        supabase = get_supabase_admin_client()

        recipient_response = (
            supabase.table("profile")
            .select(PROFILE_COLUMNS)
            .eq("id", str(recipient_id))
            .maybe_single()
            .execute()
        )

        if not recipient_response.data:
            raise NoteShareRecipientNotFoundError(
                "Recipient was not found."
            )

        response = (
            supabase.rpc(
                "share_note",
                {
                    "p_user_id": str(user_id),
                    "p_note_id": str(note_id),
                    "p_shared_with_user_id": str(recipient_id),
                    "p_expires_at": expires_at,
                },
            )
            .execute()
        )

        share_id = _extract_rpc_uuid(response.data)

        if not share_id:
            raise NoteShareError(
                "Supabase did not return the created note share ID."
            )

        return get_owned_note_share(
            user_id=user_id,
            share_id=share_id,
        )

    except (
        NoteNotFoundError,
        NoteShareError,
        NoteShareRecipientNotFoundError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if "RECIPIENT_REQUIRED" in message:
            raise NoteShareRecipientNotFoundError(
                "Recipient was not found."
            ) from error

        if "CANNOT_SHARE_WITH_SELF" in message:
            raise NoteShareError(
                "You cannot share a note with yourself."
            ) from error

        if "INVALID_SHARE_EXPIRY" in message:
            raise NoteShareError(
                "The share expiration must be in the future."
            ) from error

        if "NOTE_NOT_FOUND" in message:
            raise NoteNotFoundError(
                "Note was not found."
            ) from error

        raise NoteShareError(
            f"Could not share note: {message}"
        ) from error


def list_received_note_shares(
    *,
    user_id: str,
    include_hidden: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        query = (
            supabase.table("note_shares")
            .select(
                NOTE_SHARE_COLUMNS,
                count="exact",
            )
            .eq("shared_with_user_id", str(user_id))
            .is_("revoked_at", "null")
            .range(offset, offset + limit - 1)
            .order("created_at", desc=True)
        )

        if not include_hidden:
            query = query.is_("hidden_at", "null")

        shares_response = query.execute()

        raw_shares = shares_response.data or []

        active_shares = [
            share
            for share in raw_shares
            if (
                share.get("expires_at") is None
                or _is_future_timestamp(share["expires_at"])
            )
        ]

        if not active_shares:
            return {
                "shares": [],
                "count": 0,
                "limit": limit,
                "offset": offset,
            }

        note_ids = list(
            {
                share["note_id"]
                for share in active_shares
                if share.get("note_id")
            }
        )

        sender_ids = list(
            {
                share["shared_by_user_id"]
                for share in active_shares
                if share.get("shared_by_user_id")
            }
        )

        notes_response = (
            supabase.table("notes")
            .select(NOTE_LIST_COLUMNS)
            .in_("id", note_ids)
            .is_("deleted_at", "null")
            .execute()
        )

        notes_by_id = {
            note["id"]: note
            for note in (notes_response.data or [])
        }

        profiles_by_id: dict[str, dict[str, Any]] = {}

        if sender_ids:
            profiles_response = (
                supabase.table("profile")
                .select(PROFILE_COLUMNS)
                .in_("id", sender_ids)
                .execute()
            )

            profiles_by_id = {
                profile["id"]: profile
                for profile in (profiles_response.data or [])
            }

        shares = []

        for share in active_shares:
            note = notes_by_id.get(share["note_id"])

            if not note:
                continue

            shares.append(
                {
                    **share,
                    "note": note,
                    "shared_by": profiles_by_id.get(
                        share["shared_by_user_id"]
                    ),
                }
            )

        return {
            "shares": shares,
            "count": len(shares),
            "limit": limit,
            "offset": offset,
        }

    except Exception as error:
        raise NoteShareError(
            f"Could not retrieve shared notes: {error}"
        ) from error


def get_shared_note(
    *,
    user_id: str,
    note_id: str,
) -> dict[str, Any]:
    try:
        share = _get_active_received_note_share(
            user_id=user_id,
            note_id=note_id,
            include_hidden=True,
        )

        response = (
            get_supabase_admin_client()
            .table("notes")
            .select(
                "id,owner_id,folder_id,template_id,title,content,"
                "template_snapshot,color,is_favorite,is_pinned,"
                "is_archived,position,deleted_at,purge_after,"
                "last_opened_at,created_at,updated_at"
            )
            .eq("id", str(note_id))
            .is_("deleted_at", "null")
            .maybe_single()
            .execute()
        )

        if not response.data:
            raise NoteNotFoundError(
                "Shared note was not found."
            )

        note = response.data

        return {
            "note": note,
            "share": share,
        }

    except (
        NoteNotFoundError,
        NoteShareNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteShareError(
            f"Could not retrieve shared note: {error}"
        ) from error


def revoke_note_share(
    *,
    user_id: str,
    share_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .rpc(
                "revoke_note_share",
                {
                    "p_user_id": str(user_id),
                    "p_note_share_id": str(share_id),
                },
            )
            .execute()
        )

        if response.data is not True:
            raise NoteShareNotFoundError(
                "Note share was not found."
            )

        return get_owned_note_share(
            user_id=user_id,
            share_id=share_id,
            include_revoked=True,
        )

    except (
        NoteShareError,
        NoteShareNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteShareError(
            f"Could not revoke note share: {error}"
        ) from error


def hide_received_note_share(
    *,
    user_id: str,
    share_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .rpc(
                "hide_shared_note",
                {
                    "p_user_id": str(user_id),
                    "p_note_share_id": str(share_id),
                },
            )
            .execute()
        )

        if response.data is not True:
            raise NoteShareNotFoundError(
                "Note share was not found."
            )

        return get_received_note_share(
            user_id=user_id,
            share_id=share_id,
            include_hidden=True,
        )

    except (
        NoteShareError,
        NoteShareNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteShareError(
            f"Could not hide shared note: {error}"
        ) from error


def get_owned_note_share(
    *,
    user_id: str,
    share_id: str,
    include_revoked: bool = False,
) -> dict[str, Any]:
    try:
        query = (
            get_supabase_admin_client()
            .table("note_shares")
            .select(NOTE_SHARE_COLUMNS)
            .eq("id", str(share_id))
            .eq("shared_by_user_id", str(user_id))
        )

        if not include_revoked:
            query = query.is_("revoked_at", "null")

        response = query.maybe_single().execute()

        if not response.data:
            raise NoteShareNotFoundError(
                "Note share was not found."
            )

        return response.data

    except NoteShareNotFoundError:
        raise

    except Exception as error:
        raise NoteShareNotFoundError(
            f"Could not retrieve note share: {error}"
        ) from error


def get_received_note_share(
    *,
    user_id: str,
    share_id: str,
    include_hidden: bool = False,
) -> dict[str, Any]:
    try:
        query = (
            get_supabase_admin_client()
            .table("note_shares")
            .select(NOTE_SHARE_COLUMNS)
            .eq("id", str(share_id))
            .eq("shared_with_user_id", str(user_id))
            .is_("revoked_at", "null")
        )

        if not include_hidden:
            query = query.is_("hidden_at", "null")

        response = query.maybe_single().execute()

        if not response.data:
            raise NoteShareNotFoundError(
                "Note share was not found."
            )

        return response.data

    except NoteShareNotFoundError:
        raise

    except Exception as error:
        raise NoteShareNotFoundError(
            f"Could not retrieve received note share: {error}"
        ) from error


def _get_active_received_note_share(
    *,
    user_id: str,
    note_id: str,
    include_hidden: bool = False,
) -> dict[str, Any]:
    try:
        query = (
            get_supabase_admin_client()
            .table("note_shares")
            .select(NOTE_SHARE_COLUMNS)
            .eq("note_id", str(note_id))
            .eq("shared_with_user_id", str(user_id))
            .is_("revoked_at", "null")
        )

        if not include_hidden:
            query = query.is_("hidden_at", "null")

        response = query.maybe_single().execute()

        if not response.data:
            raise NoteShareNotFoundError(
                "Shared note was not found."
            )

        share = response.data

        if (
            share.get("expires_at") is not None
            and not _is_future_timestamp(share["expires_at"])
        ):
            raise NoteShareNotFoundError(
                "Shared note has expired."
            )

        return share

    except NoteShareNotFoundError:
        raise

    except Exception as error:
        raise NoteShareNotFoundError(
            f"Could not retrieve shared note access: {error}"
        ) from error


def _is_future_timestamp(value: str) -> bool:
    normalized_value = value.replace("Z", "+00:00")

    return datetime.fromisoformat(
        normalized_value
    ) > datetime.now(timezone.utc)


def _extract_rpc_uuid(value: Any) -> str | None:
    if isinstance(value, str):
        return value

    if isinstance(value, list):
        if not value:
            return None

        return _extract_rpc_uuid(value[0])

    if isinstance(value, dict):
        return (
            value.get("share_note")
            or value.get("id")
            or value.get("value")
        )

    return None