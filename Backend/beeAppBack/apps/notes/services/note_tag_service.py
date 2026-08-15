from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.notes.exceptions import (
    NoteNotFoundError,
    NoteTagError,
    NoteTagNotFoundError,
)
from apps.notes.services.note_service import (
    get_owned_note,
)


NOTE_TAG_COLUMNS = (
    "id,owner_id,name,color,icon,sort_order,"
    "created_at,updated_at"
)


def list_note_tags(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            get_supabase_admin_client()
            .table("note_tags")
            .select(NOTE_TAG_COLUMNS)
            .eq("owner_id", str(user_id))
            .order("sort_order")
            .order("name")
            .execute()
        )

        return response.data or []

    except Exception as error:
        raise NoteTagError(
            "Could not retrieve note tags."
        ) from error


def create_note_tag(
    *,
    user_id: str,
    **payload: Any,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .table("note_tags")
            .insert(
                {
                    "owner_id": str(user_id),
                    **payload,
                }
            )
            .execute()
        )

        if not response.data:
            raise NoteTagError(
                "Supabase did not return the created note tag."
            )

        return response.data[0]

    except NoteTagError:
        raise

    except Exception as error:
        raise NoteTagError(
            "Could not create note tag."
        ) from error


def get_owned_note_tag(
    *,
    user_id: str,
    tag_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .table("note_tags")
            .select(NOTE_TAG_COLUMNS)
            .eq("id", str(tag_id))
            .eq("owner_id", str(user_id))
            .maybe_single()
            .execute()
        )

        if not response.data:
            raise NoteTagNotFoundError(
                "Note tag was not found."
            )

        return response.data

    except NoteTagNotFoundError:
        raise

    except Exception as error:
        raise NoteTagNotFoundError(
            "Could not retrieve note tag."
        ) from error


def update_note_tag(
    *,
    user_id: str,
    tag_id: str,
    **payload: Any,
) -> dict[str, Any]:
    try:
        get_owned_note_tag(
            user_id=user_id,
            tag_id=tag_id,
        )

        response = (
            get_supabase_admin_client()
            .table("note_tags")
            .update(payload)
            .eq("id", str(tag_id))
            .eq("owner_id", str(user_id))
            .execute()
        )

        if not response.data:
            raise NoteTagError(
                "Supabase did not return the updated note tag."
            )

        return response.data[0]

    except (
        NoteTagError,
        NoteTagNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteTagError(
            "Could not update note tag."
        ) from error


def delete_note_tag(
    *,
    user_id: str,
    tag_id: str,
) -> None:
    try:
        get_owned_note_tag(
            user_id=user_id,
            tag_id=tag_id,
        )

        response = (
            get_supabase_admin_client()
            .table("note_tags")
            .delete()
            .eq("id", str(tag_id))
            .eq("owner_id", str(user_id))
            .execute()
        )

        if response.data is None:
            raise NoteTagError(
                "Supabase did not confirm note tag deletion."
            )

    except (
        NoteTagError,
        NoteTagNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteTagError(
            "Could not delete note tag."
        ) from error


def list_note_tags_for_note(
    *,
    user_id: str,
    note_id: str,
) -> list[dict[str, Any]]:
    try:
        get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=True,
        )

        response = (
            get_supabase_admin_client()
            .table("note_tag_assignments")
            .select(
                "tag:note_tags("
                + NOTE_TAG_COLUMNS
                + ")"
            )
            .eq("note_id", str(note_id))
            .execute()
        )

        return [
            row["tag"]
            for row in (response.data or [])
            if row.get("tag")
        ]

    except NoteNotFoundError:
        raise

    except Exception as error:
        raise NoteTagError(
            "Could not retrieve note tags."
        ) from error


def replace_note_tags(
    *,
    user_id: str,
    note_id: str,
    tag_ids: list[str],
) -> list[dict[str, Any]]:
    try:
        get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=False,
        )

        normalized_tag_ids = list(
            dict.fromkeys(str(tag_id) for tag_id in tag_ids)
        )

        supabase = get_supabase_admin_client()

        if normalized_tag_ids:
            response = (
                supabase.table("note_tags")
                .select("id")
                .eq("owner_id", str(user_id))
                .in_("id", normalized_tag_ids)
                .execute()
            )

            found_ids = {
                row["id"]
                for row in (response.data or [])
            }

            if len(found_ids) != len(normalized_tag_ids):
                raise NoteTagNotFoundError(
                    "One or more note tags were not found."
                )

        (
            supabase.table("note_tag_assignments")
            .delete()
            .eq("note_id", str(note_id))
            .execute()
        )

        if normalized_tag_ids:
            (
                supabase.table("note_tag_assignments")
                .insert(
                    [
                        {
                            "note_id": str(note_id),
                            "tag_id": tag_id,
                        }
                        for tag_id in normalized_tag_ids
                    ]
                )
                .execute()
            )

        return list_note_tags_for_note(
            user_id=user_id,
            note_id=note_id,
        )

    except (
        NoteNotFoundError,
        NoteTagNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteTagError(
            "Could not update note tags."
        ) from error