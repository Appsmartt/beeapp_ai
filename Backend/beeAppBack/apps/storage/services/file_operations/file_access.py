from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.storage.exceptions import (
    StorageFileNotFoundError,
    StorageFileOperationError,
)

from .constants import SIGNED_URL_EXPIRES_IN_SECONDS
from .file_helpers import _serialize_file

def create_file_access_url(
    *,
    user_id: str,
    file_id: str,
    download: bool = False,
) -> dict[str, Any]:
    try:
        access_metadata: dict[str, Any] = {}
        file_record = get_accessible_file(
            user_id=user_id,
            file_id=file_id,
            access_metadata=access_metadata,
        )
        expires_in_seconds = SIGNED_URL_EXPIRES_IN_SECONDS
        share_expiration = access_metadata.get("expires_at")
        if share_expiration is not None:
            expiration = datetime.fromisoformat(
                share_expiration.replace("Z", "+00:00")
            )
            remaining = int(
                (expiration - datetime.now(timezone.utc)).total_seconds()
            ) - 2
            if remaining < 1:
                raise StorageFileNotFoundError(
                    "The requested file was not found."
                )
            expires_in_seconds = min(expires_in_seconds, remaining)

        supabase = get_supabase_admin_client()

        options = (
            {
                "download": file_record["display_name"],
            }
            if download
            else {}
        )

        response = (
            supabase.storage.from_(file_record["bucket_id"])
            .create_signed_url(
                file_record["storage_path"],
                expires_in_seconds,
                options,
            )
        )

        signed_url = getattr(response, "signed_url", None)

        if not signed_url and isinstance(response, dict):
            signed_url = (
                response.get("signedURL")
                or response.get("signed_url")
            )

        if not signed_url:
            raise StorageFileOperationError(
                "Supabase did not return a signed URL."
            )

        return {
            "file": _serialize_file(file_record),
            "url": signed_url,
            "expires_in_seconds": expires_in_seconds,
            "download": download,
        }

    except (
        StorageFileNotFoundError,
        StorageFileOperationError,
    ):
        raise

    except Exception as error:
        raise StorageFileOperationError(
            "Could not create file access."
        ) from error


def get_accessible_file(
    *,
    user_id: str,
    file_id: str,
    access_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        own_file_response = (
            supabase.table("files")
            .select("*")
            .eq("id", file_id)
            .eq("owner_id", user_id)
            .neq("status", "failed")
            .maybe_single()
            .execute()
        )

        if (
            own_file_response
            and own_file_response.data
        ):
            return own_file_response.data

        share_response = (
            supabase.table("file_shares")
            .select(
                "id,file_id,shared_with_user_id,"
                "accepted_at,revoked_at,expires_at,hidden_at"
            )
            .eq("file_id", file_id)
            .eq("shared_with_user_id", user_id)
            .is_("revoked_at", "null")
            .or_(
                "expires_at.is.null,"
                f"expires_at.gt.{datetime.now(timezone.utc).isoformat()}"
            )
            .maybe_single()
            .execute()
        )

        if (
            not share_response
            or not share_response.data
        ):
            raise StorageFileNotFoundError(
                "The requested file was not found."
            )

        file_response = (
            supabase.table("files")
            .select("*")
            .eq("id", file_id)
            .eq("status", "ready")
            .maybe_single()
            .execute()
        )

        if (
            not file_response
            or not file_response.data
        ):
            raise StorageFileNotFoundError(
                "The requested file was not found."
            )

        if access_metadata is not None:
            access_metadata["expires_at"] = share_response.data.get("expires_at")
        return file_response.data

    except StorageFileNotFoundError:
        raise

    except Exception as error:
        raise StorageFileNotFoundError(
            "Could not access the requested file."
        ) from error
