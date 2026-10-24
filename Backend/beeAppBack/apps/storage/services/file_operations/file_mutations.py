from __future__ import annotations

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.storage.exceptions import (
    StorageFileNotFoundError,
    StorageFileOperationError,
)

from .file_helpers import (
    _create_file_operation_notification_safely,
    _execute_file_rpc,
)
from .file_queries import get_owned_file

def rename_file(
    *,
    user_id: str,
    file_id: str,
    display_name: str,
) -> dict[str, Any]:
    try:
        get_owned_file(
            user_id=user_id,
            file_id=file_id,
            include_trashed=True,
        )

        response = (
            get_supabase_admin_client()
            .table("files")
            .update(
                {
                    "display_name": display_name.strip(),
                }
            )
            .eq("id", file_id)
            .eq("owner_id", user_id)
            .execute()
        )

        if not response.data:
            raise StorageFileOperationError(
                "Supabase did not return the renamed file."
            )

        return response.data[0]

    except (
        StorageFileNotFoundError,
        StorageFileOperationError,
    ):
        raise

    except Exception as error:
        raise StorageFileOperationError(
            "Could not rename the file."
        ) from error


def move_file(
    *,
    user_id: str,
    file_id: str,
    folder_id: str | None,
) -> dict[str, Any]:
    try:
        get_owned_file(
            user_id=user_id,
            file_id=file_id,
            include_trashed=True,
        )

        supabase = get_supabase_admin_client()

        if folder_id:
            folder_response = (
                supabase.table("storage_folders")
                .select("id")
                .eq("id", folder_id)
                .eq("owner_id", user_id)
                .maybe_single()
                .execute()
            )

            if not folder_response.data:
                raise StorageFileOperationError(
                    "Destination folder was not found."
                )

        response = (
            supabase.table("files")
            .update(
                {
                    "folder_id": folder_id,
                }
            )
            .eq("id", file_id)
            .eq("owner_id", user_id)
            .execute()
        )

        if not response.data:
            raise StorageFileOperationError(
                "Supabase did not return the moved file."
            )

        return response.data[0]

    except (
        StorageFileNotFoundError,
        StorageFileOperationError,
    ):
        raise

    except Exception as error:
        raise StorageFileOperationError(
            "Could not move the file."
        ) from error


def move_file_to_trash(
    *,
    user_id: str,
    file_id: str,
) -> None:
    _execute_file_rpc(
        user_id=user_id,
        function_name="move_file_to_trash",
        file_id=file_id,
    )

    _create_file_operation_notification_safely(
        recipient_id=user_id,
        notification_type="file_trashed",
        title="Archivo movido a la papelera",
        file_id=file_id,
    )


def restore_file_from_trash(
    *,
    user_id: str,
    file_id: str,
) -> None:
    file_record = get_owned_file(
        user_id=user_id,
        file_id=file_id,
        include_trashed=True,
    )

    _execute_file_rpc(
        user_id=user_id,
        function_name="restore_file_from_trash",
        file_id=file_id,
    )

    _create_file_operation_notification_safely(
        recipient_id=user_id,
        notification_type="file_restored",
        title="Archivo restaurado",
        file_id=file_id,
        display_name=file_record["display_name"],
    )


def permanently_delete_file(
    *,
    user_id: str,
    file_id: str,
) -> None:
    file_record = get_owned_file(
        user_id=user_id,
        file_id=file_id,
        include_trashed=True,
    )

    _execute_file_rpc(
        user_id=user_id,
        function_name="permanently_delete_file",
        file_id=file_id,
    )

    _create_file_operation_notification_safely(
        recipient_id=user_id,
        notification_type="file_deleted",
        title="Archivo eliminado permanentemente",
        file_id=file_id,
        display_name=file_record["display_name"],
    )
