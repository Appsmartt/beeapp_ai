from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
    get_supabase_user_client,
)

from apps.commercial.services.commercial_public_media_service import (
    COMMERCIAL_PUBLIC_IMAGES_BUCKET,
    public_commercial_image_url,
)
from apps.storage.services.storage_file_service import (
    get_owned_file,
)

from .constants import (
    COMMERCIAL_CATEGORY_COLUMNS,
    COMMERCIAL_HOUR_COLUMNS,
    COMMERCIAL_MODALITY_COLUMNS,
    COMMERCIAL_PROFILE_CATEGORY_COLUMNS,
    COMMERCIAL_PROFILE_SOCIAL_LINK_COLUMNS,
)


def attach_commercial_logo_url(
    *,
    profile: dict[str, Any],
) -> None:
    profile["logo_url"] = None
    profile["logo_url_expires_in_seconds"] = None

    logo_file_id = profile.get("logo_file_id")
    if not logo_file_id:
        return

    try:
        file_record = get_owned_file(
            user_id=str(profile["owner_id"]),
            file_id=str(logo_file_id),
            include_trashed=True,
        )
    except Exception:
        return

    if (
        file_record.get("kind") != "image"
        or file_record.get("status") != "ready"
        or file_record.get("trashed_at") is not None
    ):
        return

    bucket_id = str(file_record.get("bucket_id") or "").strip()
    storage_path = str(
        file_record.get("storage_path") or ""
    ).strip()

    if not bucket_id or not storage_path:
        return

    try:
        if bucket_id == COMMERCIAL_PUBLIC_IMAGES_BUCKET:
            profile["logo_url"] = public_commercial_image_url(
                storage_path,
            )
            return

        response = (
            get_supabase_admin_client()
            .storage.from_(bucket_id)
            .create_signed_url(storage_path, 3600)
        )
        signed_url = getattr(response, "signed_url", None)

        if not signed_url and isinstance(response, dict):
            signed_url = (
                response.get("signedURL")
                or response.get("signed_url")
            )

        if signed_url:
            profile["logo_url"] = str(signed_url)
            profile["logo_url_expires_in_seconds"] = 3600
    except Exception:
        return


def attach_profile_relations(
    *,
    profile: dict[str, Any],
) -> dict[str, Any]:
    profile_id = str(profile["id"])
    enriched_profile = dict(profile)
    admin_supabase = get_supabase_admin_client()

    categories_response = (
        admin_supabase.table("commercial_profile_categories")
        .select(COMMERCIAL_PROFILE_CATEGORY_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("sort_order")
        .execute()
    )
    modalities_response = (
        admin_supabase.table("commercial_profile_modalities")
        .select(COMMERCIAL_MODALITY_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("created_at")
        .execute()
    )
    hours_response = (
        admin_supabase.table("commercial_profile_hours")
        .select(COMMERCIAL_HOUR_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("day_of_week")
        .order("opens_at")
        .execute()
    )
    social_links_response = (
        admin_supabase.table("commercial_profile_social_links")
        .select(COMMERCIAL_PROFILE_SOCIAL_LINK_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("platform")
        .execute()
    )

    categories = categories_response.data or []
    category_ids = [
        str(row["commercial_category_id"])
        for row in categories
        if row.get("commercial_category_id")
    ]
    categories_by_id: dict[str, dict[str, Any]] = {}

    if category_ids:
        category_details_response = (
            admin_supabase.table("commercial_categories")
            .select(COMMERCIAL_CATEGORY_COLUMNS)
            .in_("id", category_ids)
            .eq("is_active", True)
            .execute()
        )
        categories_by_id = {
            str(category["id"]): category
            for category in (category_details_response.data or [])
            if category.get("id")
        }

    enriched_profile["category_ids"] = category_ids
    enriched_profile["categories"] = [
        {
            **row,
            "category": categories_by_id.get(
                str(row.get("commercial_category_id") or "")
            ),
        }
        for row in categories
    ]
    enriched_profile["modalities"] = modalities_response.data or []
    enriched_profile["hours"] = hours_response.data or []
    enriched_profile["social_links"] = (
        social_links_response.data or []
    )
    attach_commercial_logo_url(profile=enriched_profile)

    return enriched_profile


def attach_profile_relations_with_access_token(
    *,
    access_token: str,
    profile: dict[str, Any],
) -> dict[str, Any]:
    profile_id = str(profile["id"])
    enriched_profile = dict(profile)
    supabase = get_supabase_user_client(
        access_token=access_token,
    )

    modalities_response = (
        supabase.table("commercial_profile_modalities")
        .select(COMMERCIAL_MODALITY_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("created_at")
        .execute()
    )
    hours_response = (
        supabase.table("commercial_profile_hours")
        .select(COMMERCIAL_HOUR_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("day_of_week")
        .order("opens_at")
        .execute()
    )

    enriched_profile["modalities"] = modalities_response.data or []
    enriched_profile["hours"] = hours_response.data or []

    return enriched_profile
