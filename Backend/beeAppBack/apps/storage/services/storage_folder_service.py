from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.storage.exceptions import (
    StorageFolderError,
    StorageFolderNotFoundError,
)


FOLDER_COLUMNS = (
    "id,owner_id,parent_id,name,created_at,updated_at"
)


def list_user_folders(
    *,
    user_id: str,
    parent_id: str | None = None,
) -> list[dict[str, Any]]:
    try:
        supabase = get_supabase_admin_client()

        query = (
            supabase.table("storage_folders")
            .select(FOLDER_COLUMNS)
            .eq("owner_id", user_id)
            .order("name")
        )

        if parent_id:
            query = query.eq("parent_id", parent_id)
        else:
            query = query.is_("parent_id", "null")

        response = query.execute()

        return response.data or []

    except Exception as error:
        raise StorageFolderError(
            "Could not retrieve folders."
        ) from error


def create_folder(
    *,
    user_id: str,
    name: str,
    parent_id: str | None = None,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        if parent_id:
            get_owned_folder(
                user_id=user_id,
                folder_id=parent_id,
            )

        response = (
            supabase.table("storage_folders")
            .insert(
                {
                    "owner_id": user_id,
                    "parent_id": parent_id,
                    "name": name.strip(),
                }
            )
            .execute()
        )

        if not response.data:
            raise StorageFolderError(
                "Supabase did not return the created folder."
            )

        return response.data[0]

    except (
        StorageFolderError,
        StorageFolderNotFoundError,
    ):
        raise

    except Exception as error:
        raise StorageFolderError(
            "Could not create the folder."
        ) from error


def rename_folder(
    *,
    user_id: str,
    folder_id: str,
    name: str,
) -> dict[str, Any]:
    try:
        get_owned_folder(
            user_id=user_id,
            folder_id=folder_id,
        )

        supabase = get_supabase_admin_client()

        response = (
            supabase.table("storage_folders")
            .update(
                {
                    "name": name.strip(),
                }
            )
            .eq("id", folder_id)
            .eq("owner_id", user_id)
            .execute()
        )

        if not response.data:
            raise StorageFolderError(
                "Supabase did not return the renamed folder."
            )

        return response.data[0]

    except (
        StorageFolderError,
        StorageFolderNotFoundError,
    ):
        raise

    except Exception as error:
        raise StorageFolderError(
            "Could not rename the folder."
        ) from error


def move_folder(
    *,
    user_id: str,
    folder_id: str,
    parent_id: str | None,
) -> dict[str, Any]:
    try:
        folder = get_owned_folder(
            user_id=user_id,
            folder_id=folder_id,
        )

        if parent_id == folder_id:
            raise StorageFolderError(
                "A folder cannot be moved into itself."
            )

        if parent_id:
            get_owned_folder(
                user_id=user_id,
                folder_id=parent_id,
            )

            if _is_descendant_folder(
                user_id=user_id,
                folder_id=parent_id,
                ancestor_id=folder_id,
            ):
                raise StorageFolderError(
                    "A folder cannot be moved into one of its descendants."
                )

        response = (
            get_supabase_admin_client()
            .table("storage_folders")
            .update(
                {
                    "parent_id": parent_id,
                }
            )
            .eq("id", folder_id)
            .eq("owner_id", user_id)
            .execute()
        )

        if not response.data:
            raise StorageFolderError(
                "Supabase did not return the moved folder."
            )

        return response.data[0]

    except (
        StorageFolderError,
        StorageFolderNotFoundError,
    ):
        raise

    except Exception as error:
        raise StorageFolderError(
            "Could not move the folder."
        ) from error


def delete_folder(
    *,
    user_id: str,
    folder_id: str,
) -> None:
    try:
        get_owned_folder(
            user_id=user_id,
            folder_id=folder_id,
        )

        supabase = get_supabase_admin_client()

        response = (
            supabase.table("storage_folders")
            .delete()
            .eq("id", folder_id)
            .eq("owner_id", user_id)
            .execute()
        )

        if response.data is None:
            raise StorageFolderError(
                "Supabase did not confirm folder deletion."
            )

    except (
        StorageFolderError,
        StorageFolderNotFoundError,
    ):
        raise

    except Exception as error:
        raise StorageFolderError(
            "Could not delete the folder."
        ) from error


def get_owned_folder(
    *,
    user_id: str,
    folder_id: str,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("storage_folders")
            .select(FOLDER_COLUMNS)
            .eq("id", folder_id)
            .eq("owner_id", user_id)
            .maybe_single()
            .execute()
        )

        if not response.data:
            raise StorageFolderNotFoundError(
                "The requested folder was not found."
            )

        return response.data

    except StorageFolderNotFoundError:
        raise

    except Exception as error:
        raise StorageFolderNotFoundError(
            "Could not retrieve the requested folder."
        ) from error


def _is_descendant_folder(
    *,
    user_id: str,
    folder_id: str,
    ancestor_id: str,
) -> bool:
    current_folder_id: str | None = folder_id
    visited_ids: set[str] = set()

    while current_folder_id:
        if current_folder_id == ancestor_id:
            return True

        if current_folder_id in visited_ids:
            raise StorageFolderError(
                "A circular folder hierarchy was detected."
            )

        visited_ids.add(current_folder_id)

        current_folder = get_owned_folder(
            user_id=user_id,
            folder_id=current_folder_id,
        )

        current_folder_id = current_folder.get("parent_id")

    return False