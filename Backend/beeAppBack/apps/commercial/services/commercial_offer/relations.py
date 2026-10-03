import logging
from typing import Any
from urllib.parse import quote

from beeAppBack.core.supabase_client import _get_required_env
from apps.storage.services.storage_file_service import get_owned_file

from .constants import (
    COMMERCIAL_OFFER_IMAGE_COLUMNS,
    COMMERCIAL_OFFER_MODALITY_COLUMNS,
)

logger = logging.getLogger(__name__)


def create_owned_offer_image_signed_url(
    *,
    supabase,
    user_id: str,
    image: dict[str, Any],
) -> dict[str, Any]:
    serialized_image = {
        "id": str(image["id"]),
        "file_id": str(image["file_id"]),
        "display_name": None,
        "mime_type": None,
        "sort_order": image.get("sort_order"),
        "is_primary": bool(image.get("is_primary")),
        "status": image.get("status", "active"),
        "archived_at": image.get("archived_at"),
        "created_at": image.get("created_at"),
        "updated_at": image.get("updated_at"),
        "url": None,
        "url_expires_in_seconds": 3600,
    }

    try:
        file_record = get_owned_file(
            user_id=str(user_id),
            file_id=str(image["file_id"]),
            include_trashed=True,
        )
        bucket_id = str(file_record.get("bucket_id") or "").strip()
        storage_path = str(
            file_record.get("storage_path") or ""
        ).strip()
        serialized_image["display_name"] = file_record.get(
            "display_name"
        )
        serialized_image["mime_type"] = file_record.get("mime_type")
    except Exception:
        logger.exception(
            "Commercial offer image file lookup failed: "
            "image_id=%s file_id=%s user_id=%s",
            image.get("id"),
            image.get("file_id"),
            user_id,
        )
        return serialized_image

    if (
        file_record.get("status") != "ready"
        or file_record.get("trashed_at") is not None
        or not bucket_id
        or not storage_path
    ):
        return serialized_image

    try:
        if bucket_id == "beeapp-commercial-images":
            response = supabase.storage.from_(bucket_id).get_public_url(
                storage_path,
            )
            response_data = (
                response.get("data")
                if isinstance(response, dict)
                else None
            )
            public_url = (
                response.get("publicUrl")
                if isinstance(response, dict)
                else None
            ) or (
                response.get("public_url")
                if isinstance(response, dict)
                else None
            ) or (
                response_data.get("publicUrl")
                if isinstance(response_data, dict)
                else None
            ) or (
                response_data.get("public_url")
                if isinstance(response_data, dict)
                else None
            ) or getattr(response, "public_url", None) or getattr(
                response,
                "publicUrl",
                None,
            )

            if not public_url:
                supabase_url = _get_required_env(
                    "SUPABASE_URL",
                ).strip().rstrip("/")
                public_url = (
                    f"{supabase_url}/storage/v1/object/public/"
                    f"{bucket_id}/{quote(storage_path, safe='/')}"
                )

            serialized_image["url"] = str(public_url)
            serialized_image["url_expires_in_seconds"] = None
        else:
            response = supabase.storage.from_(bucket_id).create_signed_url(
                storage_path,
                3600,
            )
            signed_url = getattr(response, "signed_url", None)

            if not signed_url and isinstance(response, dict):
                signed_url = (
                    response.get("signedURL")
                    or response.get("signed_url")
                )

            if signed_url:
                serialized_image["url"] = str(signed_url)
    except Exception as error:
        logger.exception(
            "Commercial offer image URL generation failed: "
            "image_id=%s file_id=%s bucket_id=%s storage_path=%s "
            "file_status=%s file_trashed_at=%s error=%r",
            image.get("id"),
            image.get("file_id"),
            bucket_id,
            storage_path,
            file_record.get("status"),
            file_record.get("trashed_at"),
            error,
        )

    return serialized_image


def get_offer_relations(
    *,
    supabase,
    user_id: str,
    offer_id: str,
    include_archived_images: bool = True,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    modalities_response = (
        supabase.table("commercial_offer_modalities")
        .select(COMMERCIAL_OFFER_MODALITY_COLUMNS)
        .eq("commercial_offer_id", str(offer_id))
        .order("created_at")
        .execute()
    )

    images_query = (
        supabase.table("commercial_offer_images")
        .select(COMMERCIAL_OFFER_IMAGE_COLUMNS)
        .eq("commercial_offer_id", str(offer_id))
        .order("is_primary", desc=True)
        .order("sort_order")
        .order("created_at")
    )

    if not include_archived_images:
        images_query = images_query.eq("status", "active")

    images_response = images_query.execute()
    images = [
        create_owned_offer_image_signed_url(
            supabase=supabase,
            user_id=str(user_id),
            image=image,
        )
        for image in (images_response.data or [])
    ]

    return modalities_response.data or [], images
