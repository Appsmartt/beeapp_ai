from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.notes.exceptions import (
    NoteCreateError,
    NoteDeleteError,
    NoteNotFoundError,
    NoteUpdateError,
)


NOTE_LIST_COLUMNS = (
    "id,owner_id,folder_id,template_id,title,color,"
    "is_favorite,is_pinned,is_archived,position,"
    "deleted_at,purge_after,last_opened_at,"
    "created_at,updated_at"
)

NOTE_DETAIL_COLUMNS = (
    "id,owner_id,folder_id,template_id,title,content,"
    "template_snapshot,color,is_favorite,is_pinned,"
    "is_archived,position,deleted_at,purge_after,"
    "last_opened_at,created_at,updated_at"
)


def create_note(
    *,
    user_id: str,
    title: str | None = None,
    template_id: str | None = None,
    folder_id: str | None = None,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.rpc(
                "create_note",
                {
                    "p_user_id": str(user_id),
                    "p_title": title,
                    "p_template_id": (
                        str(template_id)
                        if template_id is not None
                        else None
                    ),
                    "p_folder_id": (
                        str(folder_id)
                        if folder_id is not None
                        else None
                    ),
                },
            )
            .execute()
        )

        note_id = _extract_rpc_uuid(response.data)

        if not note_id:
            raise NoteCreateError(
                "Supabase did not return the created note ID."
            )

        return get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=True,
        )

    except (
        NoteCreateError,
        NoteNotFoundError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if "NOTE_TEMPLATE_NOT_FOUND" in message:
            raise NoteCreateError(
                "The selected template is unavailable."
            ) from error

        if "INVALID_NOTE_FOLDER" in message:
            raise NoteCreateError(
                "The selected folder is unavailable."
            ) from error

        raise NoteCreateError(
            f"Could not create note: {message}"
        ) from error


def list_owned_notes(
    *,
    user_id: str,
    folder_id: str | None = None,
    template_id: str | None = None,
    search: str | None = None,
    is_favorite: bool | None = None,
    is_pinned: bool | None = None,
    is_archived: bool | None = None,
    deleted: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    try:
        if search:
            return _search_owned_notes(
                user_id=user_id,
                search=search,
                folder_id=folder_id,
                template_id=template_id,
                is_favorite=is_favorite,
                is_pinned=is_pinned,
                is_archived=is_archived,
                deleted=deleted,
                limit=limit,
                offset=offset,
            )

        query = (
            get_supabase_admin_client()
            .table("notes")
            .select(
                NOTE_LIST_COLUMNS,
                count="exact",
            )
            .eq("owner_id", str(user_id))
            .range(offset, offset + limit - 1)
        )

        if deleted:
            query = query.not_.is_("deleted_at", "null")
        else:
            query = query.is_("deleted_at", "null")

        if folder_id:
            query = query.eq("folder_id", str(folder_id))

        if template_id:
            query = query.eq("template_id", str(template_id))

        if is_favorite is not None:
            query = query.eq("is_favorite", is_favorite)

        if is_pinned is not None:
            query = query.eq("is_pinned", is_pinned)

        if is_archived is not None:
            query = query.eq("is_archived", is_archived)

        response = (
            query.order("is_pinned", desc=True)
            .order("position")
            .order("updated_at", desc=True)
            .execute()
        )

        return {
            "notes": response.data or [],
            "count": response.count or 0,
            "limit": limit,
            "offset": offset,
        }

    except NoteUpdateError:
        raise

    except Exception as error:
        raise NoteUpdateError(
            f"Could not retrieve notes: {error}"
        ) from error


def get_owned_note(
    *,
    user_id: str,
    note_id: str,
    include_deleted: bool = False,
) -> dict[str, Any]:
    try:
        query = (
            get_supabase_admin_client()
            .table("notes")
            .select(NOTE_DETAIL_COLUMNS)
            .eq("id", str(note_id))
            .eq("owner_id", str(user_id))
        )

        if not include_deleted:
            query = query.is_("deleted_at", "null")

        response = query.maybe_single().execute()

        if not response.data:
            raise NoteNotFoundError(
                "The requested note was not found."
            )

        return response.data

    except NoteNotFoundError:
        raise

    except Exception as error:
        raise NoteNotFoundError(
            "Could not retrieve the requested note."
        ) from error


def update_owned_note(
    *,
    user_id: str,
    note_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=False,
        )

        normalized_payload = dict(payload)

        if "folder_id" in normalized_payload:
            folder_id = normalized_payload["folder_id"]
            normalized_payload["folder_id"] = (
                str(folder_id)
                if folder_id is not None
                else None
            )

        if "position" in normalized_payload:
            normalized_payload["position"] = str(
                normalized_payload["position"]
            )

        if "last_opened_at" in normalized_payload:
            last_opened_at = normalized_payload["last_opened_at"]
            normalized_payload["last_opened_at"] = (
                last_opened_at.isoformat()
                if last_opened_at
                else None
            )

        response = (
            get_supabase_admin_client()
            .table("notes")
            .update(normalized_payload)
            .eq("id", str(note_id))
            .eq("owner_id", str(user_id))
            .is_("deleted_at", "null")
            .execute()
        )

        if not response.data:
            raise NoteUpdateError(
                "Supabase did not return the updated note."
            )

        return response.data[0]

    except (
        NoteNotFoundError,
        NoteUpdateError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if "INVALID_NOTE_FOLDER" in message:
            raise NoteUpdateError(
                "The selected folder is unavailable."
            ) from error

        if "INVALID_NOTE_CONTENT" in message:
            raise NoteUpdateError(
                "The note content is invalid."
            ) from error

        raise NoteUpdateError(
            "Could not update note."
        ) from error


def move_note_to_trash(
    *,
    user_id: str,
    note_id: str,
) -> None:
    try:
        get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=False,
        )

        response = (
            get_supabase_admin_client()
            .rpc(
                "move_note_to_trash",
                {
                    "p_user_id": str(user_id),
                    "p_note_id": str(note_id),
                },
            )
            .execute()
        )

        if response.data is not True:
            raise NoteDeleteError(
                "Note could not be moved to trash."
            )

    except NoteNotFoundError:
        raise

    except NoteDeleteError:
        raise

    except Exception as error:
        raise NoteDeleteError(
            "Could not move note to trash."
        ) from error


def restore_note_from_trash(
    *,
    user_id: str,
    note_id: str,
) -> dict[str, Any]:
    try:
        get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=True,
        )

        response = (
            get_supabase_admin_client()
            .rpc(
                "restore_note_from_trash",
                {
                    "p_user_id": str(user_id),
                    "p_note_id": str(note_id),
                },
            )
            .execute()
        )

        if response.data is not True:
            raise NoteDeleteError(
                "Note could not be restored."
            )

        return get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=False,
        )

    except NoteNotFoundError:
        raise

    except NoteDeleteError:
        raise

    except Exception as error:
        raise NoteDeleteError(
            "Could not restore note."
        ) from error


def permanently_delete_note(
    *,
    user_id: str,
    note_id: str,
) -> None:
    try:
        note = get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=True,
        )

        if note.get("deleted_at") is None:
            raise NoteDeleteError(
                "Only notes in trash can be permanently deleted."
            )

        response = (
            get_supabase_admin_client()
            .table("notes")
            .delete()
            .eq("id", str(note_id))
            .eq("owner_id", str(user_id))
            .not_.is_("deleted_at", "null")
            .execute()
        )

        if response.data is None:
            raise NoteDeleteError(
                "Supabase did not confirm note deletion."
            )

    except (
        NoteNotFoundError,
        NoteDeleteError,
    ):
        raise

    except Exception as error:
        raise NoteDeleteError(
            "Could not permanently delete note."
        ) from error


def _search_owned_notes(
    *,
    user_id: str,
    search: str,
    folder_id: str | None,
    template_id: str | None,
    is_favorite: bool | None,
    is_pinned: bool | None,
    is_archived: bool | None,
    deleted: bool,
    limit: int,
    offset: int,
) -> dict[str, Any]:
    response = (
        get_supabase_admin_client()
        .rpc(
            "search_notes",
            {
                "p_user_id": str(user_id),
                "p_search": search,
                "p_folder_id": (
                    str(folder_id)
                    if folder_id is not None
                    else None
                ),
                "p_template_id": (
                    str(template_id)
                    if template_id is not None
                    else None
                ),
                "p_is_favorite": is_favorite,
                "p_is_pinned": is_pinned,
                "p_is_archived": is_archived,
                "p_deleted": deleted,
                "p_limit": limit,
                "p_offset": offset,
            },
        )
        .execute()
    )

    rows = response.data or []
    notes = []

    for row in rows:
        note = {
            key: value
            for key, value in row.items()
            if key not in ("total_count", "note_position")
        }
        note["position"] = row["note_position"]
        notes.append(note)

    return {
        "notes": notes,
        "count": int(rows[0]["total_count"]) if rows else 0,
        "limit": limit,
        "offset": offset,
    }


def _extract_rpc_uuid(value: Any) -> str | None:
    if isinstance(value, str):
        return value

    if isinstance(value, list):
        if not value:
            return None

        return _extract_rpc_uuid(value[0])

    if isinstance(value, dict):
        return (
            value.get("create_note")
            or value.get("id")
            or value.get("value")
        )

    return None