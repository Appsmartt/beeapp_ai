from __future__ import annotations

from collections import defaultdict
from typing import Any, Callable

from apps.commercial.exceptions import CommercialOperationError

from .shared import (
    PUBLIC_CATEGORY_COLUMNS,
    PUBLIC_LOGO_FILE_COLUMNS,
    PUBLIC_MODALITY_COLUMNS,
    PUBLIC_PROFILE_CATEGORY_COLUMNS,
    _response_rows,
)


def get_modalities_by_profile_ids(
    *,
    profile_ids: list[str],
    execute: Callable,
) -> dict[str, list[str]]:
    normalized_ids = list(dict.fromkeys(
        str(profile_id) for profile_id in profile_ids if profile_id
    ))
    if not normalized_ids:
        return {}
    try:
        response = execute(
            lambda client: client.table("commercial_profile_modalities")
            .select(PUBLIC_MODALITY_COLUMNS)
            .in_("commercial_profile_id", normalized_ids)
            .order("created_at")
            .execute()
        )
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial profile modalities.",
            code="COMMERCIAL_PUBLIC_MODALITIES_LOOKUP_FAILED",
        ) from error
    result: dict[str, list[str]] = defaultdict(list)
    for row in _response_rows(response):
        profile_id = str(row.get("commercial_profile_id") or "")
        modality = str(row.get("modality") or "").strip()
        if profile_id and modality:
            result[profile_id].append(modality)
    return dict(result)


def get_category_ids_by_profile_ids(
    *,
    profile_ids: list[str],
    execute: Callable,
) -> dict[str, list[str]]:
    normalized_ids = list(dict.fromkeys(
        str(profile_id) for profile_id in profile_ids if profile_id
    ))
    if not normalized_ids:
        return {}
    try:
        response = execute(
            lambda client: client.table("commercial_profile_categories")
            .select(PUBLIC_PROFILE_CATEGORY_COLUMNS)
            .in_("commercial_profile_id", normalized_ids)
            .order("sort_order")
            .execute()
        )
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial profile categories.",
            code="COMMERCIAL_PUBLIC_PROFILE_CATEGORIES_LOOKUP_FAILED",
        ) from error
    result: dict[str, list[str]] = defaultdict(list)
    for row in _response_rows(response):
        profile_id = str(row.get("commercial_profile_id") or "")
        category_id = str(row.get("commercial_category_id") or "")
        if profile_id and category_id:
            result[profile_id].append(category_id)
    return dict(result)


def get_categories_by_ids(
    *,
    category_ids: list[str],
    execute: Callable,
) -> dict[str, dict[str, Any]]:
    normalized_ids = list(dict.fromkeys(
        str(category_id) for category_id in category_ids if category_id
    ))
    if not normalized_ids:
        return {}
    try:
        response = execute(
            lambda client: client.table("commercial_categories")
            .select(PUBLIC_CATEGORY_COLUMNS)
            .in_("id", normalized_ids)
            .eq("is_active", True)
            .execute()
        )
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial categories.",
            code="COMMERCIAL_PUBLIC_CATEGORIES_LOOKUP_FAILED",
        ) from error
    return {
        str(category["id"]): {
            "id": str(category["id"]),
            "parent_id": (
                str(category["parent_id"])
                if category.get("parent_id")
                else None
            ),
            "offer_type": category.get("offer_type"),
            "name": category.get("name"),
            "slug": category.get("slug"),
            "sort_order": category.get("sort_order"),
        }
        for category in _response_rows(response)
        if category.get("id")
    }


def get_logo_files_by_profile_ids(
    *,
    profiles: list[dict[str, Any]],
    execute: Callable,
) -> dict[tuple[str, str], dict[str, Any]]:
    logo_file_ids = list(dict.fromkeys(
        str(profile["logo_file_id"])
        for profile in profiles
        if profile.get("logo_file_id")
    ))
    if not logo_file_ids:
        return {}
    try:
        response = execute(
            lambda client: client.table("files")
            .select(PUBLIC_LOGO_FILE_COLUMNS)
            .in_("id", logo_file_ids)
            .eq("kind", "image")
            .eq("status", "ready")
            .is_("trashed_at", "null")
            .execute()
        )
    except Exception:
        return {}
    return {
        (str(record["id"]), str(record["owner_id"])): record
        for record in _response_rows(response)
        if record.get("id") and record.get("owner_id")
    }


def serialize_public_profile(
    *,
    profile: dict[str, Any],
    modalities: list[str],
    create_file_url: Callable,
    categories: list[dict[str, Any]] | None = None,
    category: dict[str, Any] | None = None,
    logo_file: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if categories is None:
        categories = [category] if category is not None else []
    is_verified = (
        profile.get("verification_status") == "verified"
        and bool(profile.get("verification_badge_visible"))
    )
    logo_url, logo_url_expires_in_seconds = (
        create_file_url(file_record=logo_file)
        if logo_file
        else (None, None)
    )
    return {
        "id": str(profile["id"]),
        "display_name": profile["display_name"],
        "description": profile["description"],
        "offer_type": profile["offer_type"],
        "categories": categories,
        "category_ids": [
            item["id"] for item in categories if item.get("id")
        ],
        "custom_activity_text": profile.get("custom_activity_text"),
        "country_code": profile["country_code"],
        "city": profile["city"],
        "location": {
            "address": profile.get("address")
            if profile.get("is_address_public") else None,
            "neighborhood": profile.get("neighborhood")
            if profile.get("is_address_public") else None,
            "location_reference": profile.get("location_reference")
            if profile.get("is_address_public") else None,
            "is_address_public": bool(profile.get("is_address_public")),
        },
        "contact": {
            "phone_dial_code": profile.get("phone_dial_code")
            if profile.get("is_phone_public") else None,
            "phone_number": profile.get("phone_number")
            if profile.get("is_phone_public") else None,
            "email": profile.get("public_email")
            if profile.get("is_email_public") else None,
            "is_phone_public": bool(profile.get("is_phone_public")),
            "is_email_public": bool(profile.get("is_email_public")),
        },
        "logo_file_id": str(profile["logo_file_id"])
        if profile.get("logo_file_id") else None,
        "logo_url": logo_url,
        "logo_url_expires_in_seconds": logo_url_expires_in_seconds,
        "modalities": modalities,
        "delivery_fee_mode": profile.get("delivery_fee_mode"),
        "delivery_currency_code": profile.get("delivery_currency_code"),
        "is_verified": is_verified,
        "timezone": profile.get("timezone"),
        "created_at": profile.get("created_at"),
        "updated_at": profile.get("updated_at"),
    }


def enrich_public_profiles(
    *,
    profiles: list[dict[str, Any]],
    get_modalities: Callable,
    get_logo_files: Callable,
    get_category_ids: Callable,
    get_categories: Callable,
    serialize_profile: Callable,
) -> list[dict[str, Any]]:
    profile_ids = [
        str(profile["id"])
        for profile in profiles
        if profile.get("id")
    ]
    modalities_by_profile_id = get_modalities(profile_ids=profile_ids)
    logo_files_by_id = get_logo_files(profiles=profiles)
    category_ids_by_profile_id = get_category_ids(profile_ids=profile_ids)
    all_category_ids = [
        category_id
        for category_ids in category_ids_by_profile_id.values()
        for category_id in category_ids
    ]
    categories_by_id = get_categories(category_ids=all_category_ids)
    return [
        serialize_profile(
            profile=profile,
            modalities=modalities_by_profile_id.get(
                str(profile["id"]), []
            ),
            categories=[
                categories_by_id[category_id]
                for category_id in category_ids_by_profile_id.get(
                    str(profile["id"]), []
                )
                if category_id in categories_by_id
            ],
            logo_file=logo_files_by_id.get((
                str(profile.get("logo_file_id") or ""),
                str(profile.get("owner_id") or ""),
            )),
        )
        for profile in profiles
    ]
