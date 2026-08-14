from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.storage.exceptions import (
    StorageFileNotFoundError,
    StorageTagError,
    StorageTagNotFoundError,
)
from apps.storage.services.storage_file_service import (
    get_owned_file,
)


TAG_COLUMNS = (
    "id,owner_id,name,icon,color,is_default,sort_order,"
    "created_at,updated_at"
)


def list_user_tags(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            get_supabase_admin_client()
            .table("storage_tags")
            .select(TAG_COLUMNS)
            .eq("owner_id", user_id)
            .order("sort_order")
            .order("name")
            .execute()
        )

        return response.data or []

    except Exception as error:
        raise StorageTagError(
            "Could not retrieve tags."
        ) from error


def create_tag(
    *,
    user_id: str,
    **payload: Any,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .table("storage_tags")
            .insert(
                {
                    "owner_id": user_id,
                    **payload,
                }
            )
            .execute()
        )

        if not response.data:
            raise StorageTagError(
                "Supabase did not return the created tag."
            )

        return response.data[0]

    except StorageTagError:
        raise

    except Exception as error:
        raise StorageTagError(
            "Could not create tag."
        ) from error


def get_owned_tag(
    *,
    user_id: str,
    tag_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .table("storage_tags")
            .select(TAG_COLUMNS)
            .eq("id", tag_id)
            .eq("owner_id", user_id)
            .maybe_single()
            .execute()
        )

        if not response.data:
            raise StorageTagNotFoundError(
                "Tag was not found."
            )

        return response.data

    except StorageTagNotFoundError:
        raise

    except Exception as error:
        raise StorageTagNotFoundError(
            "Could not retrieve tag."
        ) from error


def update_tag(
    *,
    user_id: str,
    tag_id: str,
    **payload: Any,
) -> dict[str, Any]:
    try:
        get_owned_tag(
            user_id=user_id,
            tag_id=tag_id,
        )

        response = (
            get_supabase_admin_client()
            .table("storage_tags")
            .update(payload)
            .eq("id", tag_id)
            .eq("owner_id", user_id)
            .execute()
        )

        if not response.data:
            raise StorageTagError(
                "Supabase did not return the updated tag."
            )

        return response.data[0]

    except (
        StorageTagError,
        StorageTagNotFoundError,
    ):
        raise

    except Exception as error:
        raise StorageTagError(
            "Could not update tag."
        ) from error


def delete_tag(
    *,
    user_id: str,
    tag_id: str,
) -> None:
    try:
        get_owned_tag(
            user_id=user_id,
            tag_id=tag_id,
        )

        response = (
            get_supabase_admin_client()
            .table("storage_tags")
            .delete()
            .eq("id", tag_id)
            .eq("owner_id", user_id)
            .execute()
        )

        if response.data is None:
            raise StorageTagError(
                "Supabase did not confirm tag deletion."
            )

    except (
        StorageTagError,
        StorageTagNotFoundError,
    ):
        raise

    except Exception as error:
        raise StorageTagError(
            "Could not delete tag."
        ) from error


def list_file_tags(
    *,
    user_id: str,
    file_id: str,
) -> list[dict[str, Any]]:
    try:
        get_owned_file(
            user_id=user_id,
            file_id=file_id,
            include_trashed=True,
        )

        response = (
            get_supabase_admin_client()
            .table("file_tags")
            .select(
                "tag:storage_tags("
                + TAG_COLUMNS
                + ")"
            )
            .eq("file_id", file_id)
            .execute()
        )

        return [
            row["tag"]
            for row in (response.data or [])
            if row.get("tag")
        ]

    except StorageFileNotFoundError:
        raise

    except Exception as error:
        raise StorageTagError(
            "Could not retrieve file tags."
        ) from error


def replace_file_tags(
    *,
    user_id: str,
    file_id: str,
    tag_ids: list[str],
) -> list[dict[str, Any]]:
    try:
        get_owned_file(
            user_id=user_id,
            file_id=file_id,
            include_trashed=True,
        )

        normalized_tag_ids = list(dict.fromkeys(tag_ids))
        supabase = get_supabase_admin_client()

        if normalized_tag_ids:
            tags_response = (
                supabase.table("storage_tags")
                .select("id")
                .eq("owner_id", user_id)
                .in_("id", normalized_tag_ids)
                .execute()
            )

            found_ids = {
                row["id"]
                for row in (tags_response.data or [])
            }

            if len(found_ids) != len(normalized_tag_ids):
                raise StorageTagNotFoundError(
                    "One or more tags were not found."
                )

        (
            supabase.table("file_tags")
            .delete()
            .eq("file_id", file_id)
            .execute()
        )

        if normalized_tag_ids:
            (
                supabase.table("file_tags")
                .insert(
                    [
                        {
                            "file_id": file_id,
                            "tag_id": tag_id,
                        }
                        for tag_id in normalized_tag_ids
                    ]
                )
                .execute()
            )

        return list_file_tags(
            user_id=user_id,
            file_id=file_id,
        )

    except (
        StorageFileNotFoundError,
        StorageTagNotFoundError,
    ):
        raise

    except Exception as error:
        raise StorageTagError(
            "Could not update file tags."
        ) from error