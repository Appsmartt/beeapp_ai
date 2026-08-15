from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.notes.exceptions import (
    NoteFolderError,
    NoteFolderNotFoundError,
)


NOTE_FOLDER_COLUMNS = (
    "id,owner_id,parent_id,name,created_at,updated_at"
)


def list_note_folders(
    *,
    user_id: str,
    parent_id: str | None = None,
) -> list[dict[str, Any]]:
    try:
        query = (
            get_supabase_admin_client()
            .table("note_folders")
            .select(NOTE_FOLDER_COLUMNS)
            .eq("owner_id", str(user_id))
            .order("name")
        )

        if parent_id is None:
            query = query.is_("parent_id", "null")
        else:
            query = query.eq("parent_id", str(parent_id))

        response = query.execute()

        return response.data or []

    except Exception as error:
        raise NoteFolderError(
            "Could not retrieve note folders."
        ) from error


def create_note_folder(
    *,
    user_id: str,
    name: str,
    parent_id: str | None = None,
) -> dict[str, Any]:
    try:
        if parent_id is not None:
            get_owned_note_folder(
                user_id=user_id,
                folder_id=parent_id,
            )

        response = (
            get_supabase_admin_client()
            .table("note_folders")
            .insert(
                {
                    "owner_id": str(user_id),
                    "parent_id": (
                        str(parent_id)
                        if parent_id is not None
                        else None
                    ),
                    "name": name.strip(),
                }
            )
            .execute()
        )

        if not response.data:
            raise NoteFolderError(
                "Supabase did not return the created note folder."
            )

        return response.data[0]

    except (
        NoteFolderError,
        NoteFolderNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteFolderError(
            "Could not create note folder."
        ) from error


def get_owned_note_folder(
    *,
    user_id: str,
    folder_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .table("note_folders")
            .select(NOTE_FOLDER_COLUMNS)
            .eq("id", str(folder_id))
            .eq("owner_id", str(user_id))
            .maybe_single()
            .execute()
        )

        if not response.data:
            raise NoteFolderNotFoundError(
                "Note folder was not found."
            )

        return response.data

    except NoteFolderNotFoundError:
        raise

    except Exception as error:
        raise NoteFolderNotFoundError(
            "Could not retrieve note folder."
        ) from error


def rename_note_folder(
    *,
    user_id: str,
    folder_id: str,
    name: str,
) -> dict[str, Any]:
    try:
        get_owned_note_folder(
            user_id=user_id,
            folder_id=folder_id,
        )

        response = (
            get_supabase_admin_client()
            .table("note_folders")
            .update(
                {
                    "name": name.strip(),
                }
            )
            .eq("id", str(folder_id))
            .eq("owner_id", str(user_id))
            .execute()
        )

        if not response.data:
            raise NoteFolderError(
                "Supabase did not return the renamed note folder."
            )

        return response.data[0]

    except (
        NoteFolderError,
        NoteFolderNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteFolderError(
            "Could not rename note folder."
        ) from error


def move_note_folder(
    *,
    user_id: str,
    folder_id: str,
    parent_id: str | None,
) -> dict[str, Any]:
    try:
        get_owned_note_folder(
            user_id=user_id,
            folder_id=folder_id,
        )

        if parent_id is not None:
            if str(parent_id) == str(folder_id):
                raise NoteFolderError(
                    "A note folder cannot be moved into itself."
                )

            get_owned_note_folder(
                user_id=user_id,
                folder_id=parent_id,
            )

            if _is_descendant_note_folder(
                user_id=user_id,
                folder_id=parent_id,
                ancestor_id=folder_id,
            ):
                raise NoteFolderError(
                    "A note folder cannot be moved into "
                    "one of its descendants."
                )

        response = (
            get_supabase_admin_client()
            .table("note_folders")
            .update(
                {
                    "parent_id": (
                        str(parent_id)
                        if parent_id is not None
                        else None
                    ),
                }
            )
            .eq("id", str(folder_id))
            .eq("owner_id", str(user_id))
            .execute()
        )

        if not response.data:
            raise NoteFolderError(
                "Supabase did not return the moved note folder."
            )

        return response.data[0]

    except (
        NoteFolderError,
        NoteFolderNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteFolderError(
            "Could not move note folder."
        ) from error


def delete_note_folder(
    *,
    user_id: str,
    folder_id: str,
) -> None:
    try:
        get_owned_note_folder(
            user_id=user_id,
            folder_id=folder_id,
        )

        response = (
            get_supabase_admin_client()
            .table("note_folders")
            .delete()
            .eq("id", str(folder_id))
            .eq("owner_id", str(user_id))
            .execute()
        )

        if response.data is None:
            raise NoteFolderError(
                "Supabase did not confirm note folder deletion."
            )

    except (
        NoteFolderError,
        NoteFolderNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteFolderError(
            "Could not delete note folder."
        ) from error


def _is_descendant_note_folder(
    *,
    user_id: str,
    folder_id: str,
    ancestor_id: str,
) -> bool:
    current_folder_id: str | None = str(folder_id)
    visited_ids: set[str] = set()

    while current_folder_id:
        if current_folder_id == str(ancestor_id):
            return True

        if current_folder_id in visited_ids:
            raise NoteFolderError(
                "A circular note folder hierarchy was detected."
            )

        visited_ids.add(current_folder_id)

        current_folder = get_owned_note_folder(
            user_id=user_id,
            folder_id=current_folder_id,
        )

        current_folder_id = current_folder.get("parent_id")

    return False