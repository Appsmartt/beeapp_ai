from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.storage.exceptions import (
    StorageFileNotFoundError,
    StorageFileOperationError,
)

from .constants import FILE_LIST_COLUMNS

def get_storage_summary(
    *,
    user_id: str,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("storage_quotas")
            .select(
                "quota_bytes,used_bytes,reserved_bytes,updated_at"
            )
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        quota = response.data or {
            "quota_bytes": 5_368_709_120,
            "used_bytes": 0,
            "reserved_bytes": 0,
            "updated_at": None,
        }

        quota_bytes = int(quota["quota_bytes"])
        used_bytes = int(quota["used_bytes"])
        reserved_bytes = int(quota["reserved_bytes"])

        available_bytes = max(
            0,
            quota_bytes - used_bytes - reserved_bytes,
        )

        usage_percentage = (
            round(
                (used_bytes / quota_bytes) * 100,
                2,
            )
            if quota_bytes
            else 0
        )

        return {
            "quota_bytes": quota_bytes,
            "used_bytes": used_bytes,
            "reserved_bytes": reserved_bytes,
            "available_bytes": available_bytes,
            "usage_percentage": usage_percentage,
            "updated_at": quota.get("updated_at"),
        }

    except Exception as error:
        raise StorageFileOperationError(
            "Could not retrieve storage summary."
        ) from error


def list_user_files(
    *,
    user_id: str,
    folder_id: str | None = None,
    status: str = "ready",
    scope: str = "all",
    kind: str | None = None,
    tag_id: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        query = (
            supabase.table("files")
            .select(
                FILE_LIST_COLUMNS,
                count="exact",
            )
            .eq("owner_id", user_id)
            .eq("status", status)
            .order("is_starred", desc=True)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if folder_id:
            query = query.eq("folder_id", folder_id)

        elif status != "trashed" and scope == "all":
            query = query.is_("folder_id", "null")

        if kind:
            query = query.eq("kind", kind)

        if scope == "documents":
            query = query.in_(
                "kind",
                (
                    "document",
                    "spreadsheet",
                    "presentation",
                    "archive",
                ),
            )

        elif scope == "media":
            query = query.in_(
                "kind",
                (
                    "image",
                    "video",
                    "audio",
                ),
            )

        if search:
            query = query.ilike(
                "display_name",
                f"%{search.strip()}%",
            )

        response = query.execute()
        files = response.data or []

        if tag_id:
            file_ids = [
                file_record["id"]
                for file_record in files
            ]

            if not file_ids:
                return {
                    "files": [],
                    "count": 0,
                    "limit": limit,
                    "offset": offset,
                }

            tags_response = (
                supabase.table("file_tags")
                .select("file_id")
                .eq("tag_id", tag_id)
                .in_("file_id", file_ids)
                .execute()
            )

            allowed_file_ids = {
                item["file_id"]
                for item in (tags_response.data or [])
            }

            files = [
                file_record
                for file_record in files
                if file_record["id"] in allowed_file_ids
            ]

        return {
            "files": files,
            "count": (
                len(files)
                if tag_id
                else response.count or 0
            ),
            "limit": limit,
            "offset": offset,
        }

    except Exception as error:
        raise StorageFileOperationError(
            "Could not retrieve files."
        ) from error


def get_owned_file(
    *,
    user_id: str,
    file_id: str,
    include_trashed: bool = True,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        query = (
            supabase.table("files")
            .select("*")
            .eq("id", file_id)
            .eq("owner_id", user_id)
        )

        if not include_trashed:
            query = query.eq("status", "ready")

        response = query.maybe_single().execute()

        if not response.data:
            raise StorageFileNotFoundError(
                "The requested file was not found."
            )

        return response.data

    except StorageFileNotFoundError:
        raise

    except Exception as error:
        raise StorageFileNotFoundError(
            "Could not retrieve the requested file."
        ) from error
