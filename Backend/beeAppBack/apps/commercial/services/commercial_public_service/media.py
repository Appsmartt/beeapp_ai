from __future__ import annotations

from collections import defaultdict
from typing import Any, Callable

from apps.commercial.exceptions import CommercialOperationError

from .shared import (
    PUBLIC_FILE_IMAGE_COLUMNS,
    PUBLIC_IMAGE_SIGNED_URL_EXPIRES_IN_SECONDS,
    PUBLIC_OFFER_IMAGE_COLUMNS,
    _response_rows,
)


def extract_storage_url(response) -> str | None:
    if isinstance(response, str):
        normalized_url = response.strip()
        return normalized_url or None

    if isinstance(response, dict):
        nested_data = response.get("data")
        candidates = (
            response.get("publicUrl"),
            response.get("public_url"),
            nested_data.get("publicUrl")
            if isinstance(nested_data, dict) else None,
            nested_data.get("public_url")
            if isinstance(nested_data, dict) else None,
        )
    else:
        candidates = (
            getattr(response, "public_url", None),
            getattr(response, "publicUrl", None),
        )

    for candidate in candidates:
        if candidate:
            return str(candidate)

    return None


def create_public_file_url(
    *,
    file_record: dict[str, Any],
    execute: Callable,
) -> tuple[str | None, int | None]:
    if (
        file_record.get("kind") != "image"
        or file_record.get("status") != "ready"
        or file_record.get("trashed_at") is not None
    ):
        return None, None

    bucket_id = str(file_record.get("bucket_id") or "").strip()
    storage_path = str(file_record.get("storage_path") or "").strip()

    if not bucket_id or not storage_path:
        return None, None

    try:
        if bucket_id == "beeapp-commercial-images":
            response = execute(
                lambda client: client.storage.from_(bucket_id).get_public_url(
                    storage_path
                )
            )
            return extract_storage_url(response), None

        response = execute(
            lambda client: client.storage.from_(bucket_id).create_signed_url(
                storage_path,
                PUBLIC_IMAGE_SIGNED_URL_EXPIRES_IN_SECONDS,
            )
        )
        signed_url = getattr(response, "signed_url", None)

        if not signed_url and isinstance(response, dict):
            signed_url = (
                response.get("signedURL")
                or response.get("signed_url")
            )

        return (
            str(signed_url) if signed_url else None,
            PUBLIC_IMAGE_SIGNED_URL_EXPIRES_IN_SECONDS,
        )
    except Exception:
        return None, None


def get_offer_images_by_offer_ids(
    *,
    offer_ids: list[str],
    execute: Callable,
    create_file_url: Callable,
) -> dict[str, list[dict[str, Any]]]:
    normalized_ids = list(dict.fromkeys(
        str(offer_id) for offer_id in offer_ids if offer_id
    ))
    if not normalized_ids:
        return {}

    try:
        images_response = execute(
            lambda client: client.table("commercial_offer_images")
            .select(PUBLIC_OFFER_IMAGE_COLUMNS)
            .in_("commercial_offer_id", normalized_ids)
            .eq("status", "active")
            .order("is_primary", desc=True)
            .order("sort_order")
            .order("created_at")
            .execute()
        )
        image_rows = _response_rows(images_response)
        file_ids = list(dict.fromkeys(
            str(row["file_id"])
            for row in image_rows
            if row.get("file_id")
        ))

        offer_rows_response = execute(
            lambda client: client.table("commercial_offers")
            .select("id,commercial_profile_id")
            .in_("id", normalized_ids)
            .execute()
        )
        offer_profile_ids = {
            str(row["id"]): str(row["commercial_profile_id"])
            for row in _response_rows(offer_rows_response)
            if row.get("id") and row.get("commercial_profile_id")
        }
        profile_ids = sorted(set(offer_profile_ids.values()))
        profile_owner_ids: dict[str, str] = {}

        if profile_ids:
            profiles_response = execute(
                lambda client: client.table("commercial_profiles")
                .select("id,owner_id")
                .in_("id", profile_ids)
                .execute()
            )
            profile_owner_ids = {
                str(row["id"]): str(row["owner_id"])
                for row in _response_rows(profiles_response)
                if row.get("id") and row.get("owner_id")
            }

        files_by_id: dict[str, dict[str, Any]] = {}
        if file_ids:
            files_response = execute(
                lambda client: client.table("files")
                .select(PUBLIC_FILE_IMAGE_COLUMNS)
                .in_("id", file_ids)
                .eq("status", "ready")
                .is_("trashed_at", "null")
                .execute()
            )
            files_by_id = {
                str(file_record["id"]): file_record
                for file_record in _response_rows(files_response)
                if file_record.get("id")
            }

        result: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for image in image_rows:
            file_id = str(image.get("file_id") or "")
            file_record = files_by_id.get(file_id)
            expected_owner_id = profile_owner_ids.get(
                offer_profile_ids.get(
                    str(image.get("commercial_offer_id") or ""),
                    "",
                )
            )
            if (
                not file_record
                or not expected_owner_id
                or str(file_record.get("owner_id") or "")
                != expected_owner_id
            ):
                continue

            image_url, url_expires_in_seconds = create_file_url(
                file_record=file_record
            )
            result[str(image["commercial_offer_id"])].append({
                "id": str(image["id"]),
                "file_id": file_id,
                "display_name": (
                    file_record.get("display_name")
                    or file_record.get("original_name")
                ),
                "mime_type": file_record.get("mime_type"),
                "sort_order": image.get("sort_order"),
                "is_primary": bool(image.get("is_primary")),
                "url": image_url,
                "url_expires_in_seconds": url_expires_in_seconds,
            })

        return dict(result)
    except CommercialOperationError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial offer images.",
            code="COMMERCIAL_PUBLIC_OFFER_IMAGES_LOOKUP_FAILED",
        ) from error
