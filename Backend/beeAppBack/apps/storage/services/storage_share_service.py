from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.notifications.services.notification_service import (
    create_storage_notification,
)
from apps.storage.exceptions import (
    StorageFileNotFoundError,
    StorageRecipientNotFoundError,
    StorageShareError,
    StorageShareNotFoundError,
)
from apps.storage.services.storage_file_service import (
    get_owned_file,
)


SHARE_COLUMNS = (
    "id,file_id,shared_by_user_id,shared_with_user_id,"
    "permission,accepted_at,revoked_at,expires_at,hidden_at,"
    "shared_with_displayed_at,created_at,updated_at"
)

FILE_COLUMNS = (
    "id,owner_id,folder_id,original_name,display_name,"
    "extension,mime_type,kind,size_bytes,status,is_starred,"
    "trashed_at,purge_after,created_at,updated_at"
)

PROFILE_COLUMNS = (
    "id,first_name,last_name,phone_dial_code,phone_number"
)


def search_share_recipients(
    *,
    user_id: str,
    search_value: str,
    limit: int = 10,
) -> list[dict[str, Any]]:
    try:
        response = (
            get_supabase_admin_client()
            .rpc(
                "search_share_recipients",
                {
                    "search_value": search_value,
                    "result_limit": limit,
                },
            )
            .execute()
        )

        return [
            recipient
            for recipient in (response.data or [])
            if recipient.get("id") != user_id
        ]

    except Exception as error:
        raise StorageShareError(
            "Could not search share recipients."
        ) from error


def create_file_share(
    *,
    user_id: str,
    file_id: str,
    recipient_id: str,
    permission: str = "viewer",
    expires_at: str | None = None,
) -> dict[str, Any]:
    try:
        file_record = get_owned_file(
            user_id=user_id,
            file_id=file_id,
            include_trashed=False,
        )

        if recipient_id == user_id:
            raise StorageShareError(
                "You cannot share a file with yourself."
            )

        supabase = get_supabase_admin_client()

        recipient_response = (
            supabase.table("profile")
            .select(PROFILE_COLUMNS)
            .eq("id", recipient_id)
            .maybe_single()
            .execute()
        )

        if (
            not recipient_response
            or not recipient_response.data
        ):
            raise StorageRecipientNotFoundError(
                "Recipient was not found."
            )

        existing_share_response = (
            supabase.table("file_shares")
            .select(SHARE_COLUMNS)
            .eq("file_id", file_id)
            .eq("shared_with_user_id", recipient_id)
            .maybe_single()
            .execute()
        )

        payload = {
            "file_id": file_id,
            "shared_by_user_id": user_id,
            "shared_with_user_id": recipient_id,
            "permission": permission,
            "accepted_at": datetime.now(
                timezone.utc
            ).isoformat(),
            "revoked_at": None,
            "hidden_at": None,
            "expires_at": expires_at,
        }

        if (
            existing_share_response
            and existing_share_response.data
        ):
            response = (
                supabase.table("file_shares")
                .update(payload)
                .eq("id", existing_share_response.data["id"])
                .execute()
            )
        else:
            response = (
                supabase.table("file_shares")
                .insert(payload)
                .execute()
            )

        if not response or not response.data:
            raise StorageShareError(
                "Supabase did not return the created share."
            )

        share = response.data[0]

        try:
            create_storage_notification(
                recipient_id=recipient_id,
                notification_type="file_shared",
                title="Archivo compartido contigo",
                body=(
                    f"{file_record['display_name']} "
                    "fue compartido contigo."
                ),
                metadata={
                    "file_id": file_id,
                    "share_id": share["id"],
                    "shared_by_user_id": user_id,
                    "permission": permission,
                },
            )
        except Exception:
            pass

        return share

    except (
        StorageFileNotFoundError,
        StorageRecipientNotFoundError,
        StorageShareError,
    ):
        raise

    except Exception as error:
        raise StorageShareError(
            "Could not share file."
        ) from error


def list_received_shares(
    *,
    user_id: str,
    include_hidden: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        query = (
            supabase.table("file_shares")
            .select(
                SHARE_COLUMNS,
                count="exact",
            )
            .eq("shared_with_user_id", user_id)
            .is_("revoked_at", "null")
            .range(offset, offset + limit - 1)
            .order("created_at", desc=True)
        )

        if not include_hidden:
            query = query.is_("hidden_at", "null")

        shares_response = query.execute()
        raw_shares = shares_response.data or []

        if not raw_shares:
            return {
                "shares": [],
                "count": 0,
                "limit": limit,
                "offset": offset,
            }

        file_ids = list(
            {
                share["file_id"]
                for share in raw_shares
                if share.get("file_id")
            }
        )

        sender_ids = list(
            {
                share["shared_by_user_id"]
                for share in raw_shares
                if share.get("shared_by_user_id")
            }
        )

        files_response = (
            supabase.table("files")
            .select(FILE_COLUMNS)
            .in_("id", file_ids)
            .eq("status", "ready")
            .execute()
        )

        files_by_id = {
            file_record["id"]: file_record
            for file_record in (files_response.data or [])
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
                for profile in (
                    profiles_response.data or []
                )
            }

        shares: list[dict[str, Any]] = []

        for share in raw_shares:
            file_record = files_by_id.get(
                share["file_id"]
            )

            if not file_record:
                continue

            shares.append(
                {
                    **share,
                    "file": file_record,
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
        raise StorageShareError(
            "Could not retrieve received shares."
        ) from error


def revoke_file_share(
    *,
    user_id: str,
    share_id: str,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        share_response = (
            supabase.table("file_shares")
            .select(
                SHARE_COLUMNS
                + ",file:files(display_name)"
            )
            .eq("id", share_id)
            .eq("shared_by_user_id", user_id)
            .maybe_single()
            .execute()
        )

        if not share_response or not share_response.data:
            raise StorageShareNotFoundError(
                "Share was not found."
            )

        response = (
            supabase.table("file_shares")
            .update(
                {
                    "revoked_at": datetime.now(
                        timezone.utc
                    ).isoformat(),
                }
            )
            .eq("id", share_id)
            .eq("shared_by_user_id", user_id)
            .execute()
        )

        if not response or not response.data:
            raise StorageShareError(
                "Supabase did not return the revoked share."
            )

        share = share_response.data
        updated_share = response.data[0]

        try:
            file_record = share.get("file") or {}

            create_storage_notification(
                recipient_id=share["shared_with_user_id"],
                notification_type="file_share_revoked",
                title="Acceso revocado",
                body=(
                    "Tu acceso a "
                    f"{file_record.get('display_name', 'un archivo')} "
                    "fue revocado."
                ),
                metadata={
                    "file_id": share["file_id"],
                    "share_id": share_id,
                },
            )
        except Exception:
            pass

        return updated_share

    except (
        StorageShareError,
        StorageShareNotFoundError,
    ):
        raise

    except Exception as error:
        raise StorageShareError(
            "Could not revoke share."
        ) from error


def hide_received_share(
    *,
    user_id: str,
    share_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .table("file_shares")
            .update(
                {
                    "hidden_at": datetime.now(
                        timezone.utc
                    ).isoformat(),
                }
            )
            .eq("id", share_id)
            .eq("shared_with_user_id", user_id)
            .is_("revoked_at", "null")
            .execute()
        )

        if not response or not response.data:
            raise StorageShareNotFoundError(
                "Share was not found."
            )

        return response.data[0]

    except StorageShareNotFoundError:
        raise

    except Exception as error:
        raise StorageShareError(
            "Could not hide shared file."
        ) from error