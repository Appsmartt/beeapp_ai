from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.statuses.services.status_media_refactor.shared import (
    STATUS_MEDIA_SIGNED_URL_TTL_SECONDS,
)


def create_status_media_signed_url(
    *,
    bucket_id: str,
    storage_path: str,
    expires_in_seconds: int = STATUS_MEDIA_SIGNED_URL_TTL_SECONDS,
) -> str | None:
    if not bucket_id or not storage_path:
        return None

    normalized_expiry = max(
        1,
        min(
            int(expires_in_seconds),
            STATUS_MEDIA_SIGNED_URL_TTL_SECONDS,
        ),
    )
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.storage.from_(bucket_id).create_signed_url(
                    storage_path,
                    normalized_expiry,
                )
            ),
        )
        signed_url = getattr(response, "signed_url", None)
        if not signed_url and isinstance(response, dict):
            signed_url = (
                response.get("signedURL")
                or response.get("signed_url")
            )
        return str(signed_url) if signed_url else None
    except Exception:
        return None


def create_status_offer_image_signed_url(
    *,
    commercial_profile_id: str | None,
    image_file_id: str | None,
    bucket_id: str,
    storage_path: str,
) -> str | None:
    if not all((
        commercial_profile_id, image_file_id, bucket_id, storage_path
    )):
        return None

    try:
        profile_response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_profiles")
                .select("owner_id")
                .eq("id", str(commercial_profile_id))
                .maybe_single()
                .execute()
            ),
        )
        profile = getattr(profile_response, "data", None)
        owner_id = (
            str(profile.get("owner_id") or "")
            if isinstance(profile, dict)
            else ""
        )
        if not owner_id:
            return None

        file_response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("files")
                .select("id")
                .eq("id", str(image_file_id))
                .eq("owner_id", owner_id)
                .eq("bucket_id", str(bucket_id))
                .eq("storage_path", str(storage_path))
                .eq("kind", "image")
                .eq("status", "ready")
                .is_("trashed_at", "null")
                .maybe_single()
                .execute()
            ),
        )
        if not isinstance(
            getattr(file_response, "data", None),
            dict,
        ):
            return None

        return create_status_media_signed_url(
            bucket_id=str(bucket_id),
            storage_path=str(storage_path),
        )
    except Exception:
        return None


def create_status_avatar_signed_url(
    *,
    avatar_file_id: str | None,
    actor_type: str,
    actor_id: str | None,
) -> str | None:
    if not avatar_file_id or not actor_id:
        return None
    if actor_type not in ("profile", "commercial_profile"):
        return None

    try:
        if actor_type == "profile":
            reference = execute_with_supabase_admin_retry(
                lambda client: (
                    client.table("profile")
                    .select("id")
                    .eq("id", str(actor_id))
                    .eq("avatar_file_id", str(avatar_file_id))
                    .maybe_single()
                    .execute()
                ),
            )
            reference_data = getattr(reference, "data", None)
            owner_id = (
                str(actor_id)
                if isinstance(reference_data, dict)
                else None
            )
        else:
            reference = execute_with_supabase_admin_retry(
                lambda client: (
                    client.table("commercial_profiles")
                    .select("owner_id")
                    .eq("id", str(actor_id))
                    .eq("logo_file_id", str(avatar_file_id))
                    .maybe_single()
                    .execute()
                ),
            )
            reference_data = getattr(reference, "data", None)
            owner_id = (
                str(reference_data.get("owner_id") or "")
                if isinstance(reference_data, dict)
                else None
            )

        if not owner_id:
            return None

        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("files")
                .select("bucket_id,storage_path,status,trashed_at")
                .eq("id", str(avatar_file_id))
                .eq("owner_id", owner_id)
                .eq("kind", "image")
                .eq("status", "ready")
                .is_("trashed_at", "null")
                .maybe_single()
                .execute()
            ),
        )
        file_record = getattr(response, "data", None)
        if not isinstance(file_record, dict):
            return None

        return create_status_media_signed_url(
            bucket_id=str(file_record.get("bucket_id") or ""),
            storage_path=str(file_record.get("storage_path") or ""),
        )
    except Exception:
        return None
