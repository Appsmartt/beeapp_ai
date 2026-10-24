from __future__ import annotations

import re
import unicodedata

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.commercial.exceptions import (
    CommercialCategoryLookupError,
    CommercialProfileCreateError,
    CommercialProfileValidationError,
)

from .constants import COMMERCIAL_CATEGORY_COLUMNS


def list_commercial_categories(
    *,
    offer_type: str | None = None,
    parent_id: str | None = None,
    include_inactive: bool = False,
) -> list[dict[str, Any]]:
    try:
        supabase = get_supabase_admin_client()
        query = (
            supabase.table("commercial_categories")
            .select(COMMERCIAL_CATEGORY_COLUMNS)
            .order("sort_order")
            .order("name")
        )

        if offer_type:
            query = query.eq("offer_type", offer_type)

        if parent_id is not None:
            query = query.eq("parent_id", str(parent_id))

        if not include_inactive:
            query = query.eq("is_active", True)

        response = query.execute()
        return response.data or []
    except Exception as error:
        raise CommercialCategoryLookupError(
            "Could not retrieve commercial categories."
        ) from error


def validate_commercial_category(
    *,
    category_id: str,
    offer_type: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .table("commercial_categories")
            .select(COMMERCIAL_CATEGORY_COLUMNS)
            .eq("id", str(category_id))
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )
        category = response.data

        if not category:
            raise CommercialProfileValidationError(
                "The selected category is unavailable."
            )

        category_offer_type = category["offer_type"]
        if offer_type != "mixed" and category_offer_type != offer_type:
            raise CommercialProfileValidationError(
                "The selected category does not match the offer type."
            )

        return category
    except CommercialProfileValidationError:
        raise
    except Exception as error:
        raise CommercialProfileValidationError(
            "Could not validate the selected category."
        ) from error


def normalize_commercial_category_name(value: str) -> str:
    normalized_value = re.sub(
        r"\s+",
        " ",
        str(value or "").strip(),
    )

    if not normalized_value:
        raise CommercialProfileValidationError(
            "New category names cannot be empty."
        )

    return normalized_value


def commercial_category_name_key(value: str) -> str:
    normalized_value = normalize_commercial_category_name(value)
    normalized_unicode = unicodedata.normalize(
        "NFKD",
        normalized_value,
    )
    without_accents = "".join(
        character
        for character in normalized_unicode
        if not unicodedata.combining(character)
    )
    return without_accents.casefold()


def build_commercial_category_slug(value: str) -> str:
    normalized_value = commercial_category_name_key(value)
    slug = re.sub(
        r"[^a-z0-9]+",
        "-",
        normalized_value,
    ).strip("-")

    if not slug:
        raise CommercialProfileValidationError(
            "New category name must include letters or numbers."
        )

    return slug[:100]


def compatible_category_offer_types(
    offer_type: str,
) -> list[str]:
    if offer_type == "mixed":
        return ["products", "services", "mixed"]

    return [offer_type, "mixed"]


def find_existing_commercial_category_by_name(
    *,
    supabase,
    category_name: str,
    offer_type: str,
) -> dict[str, Any] | None:
    expected_key = commercial_category_name_key(category_name)
    response = (
        supabase.table("commercial_categories")
        .select(COMMERCIAL_CATEGORY_COLUMNS)
        .eq("is_active", True)
        .in_(
            "offer_type",
            compatible_category_offer_types(offer_type),
        )
        .order("sort_order")
        .order("name")
        .execute()
    )

    for category in response.data or []:
        if commercial_category_name_key(category["name"]) == expected_key:
            return category

    return None


def build_unique_commercial_category_slug(
    *,
    supabase,
    category_name: str,
) -> str:
    base_slug = build_commercial_category_slug(category_name)
    candidate_slug = base_slug
    suffix = 2

    while True:
        response = (
            supabase.table("commercial_categories")
            .select("id")
            .eq("slug", candidate_slug)
            .maybe_single()
            .execute()
        )

        if not response or not response.data:
            return candidate_slug

        candidate_slug = f"{base_slug[:90]}-{suffix}"
        suffix += 1


def is_commercial_category_unique_violation(
    error: Exception,
) -> bool:
    error_message = str(error).casefold()
    return (
        "23505" in error_message
        or "duplicate key" in error_message
        or "unique constraint" in error_message
        or (
            "commercial_categories_active_offer_type_"
            "normalized_name_key" in error_message
        )
    )


def resolve_new_commercial_categories(
    *,
    supabase,
    category_names: list[str],
    offer_type: str,
) -> tuple[list[str], list[str]]:
    resolved_category_ids: list[str] = []
    created_category_ids: list[str] = []

    for raw_category_name in category_names:
        category_name = normalize_commercial_category_name(
            raw_category_name,
        )
        existing_category = find_existing_commercial_category_by_name(
            supabase=supabase,
            category_name=category_name,
            offer_type=offer_type,
        )

        if existing_category:
            resolved_category_ids.append(str(existing_category["id"]))
            continue

        try:
            category_response = (
                supabase.table("commercial_categories")
                .insert(
                    {
                        "parent_id": None,
                        "offer_type": offer_type,
                        "name": category_name,
                        "slug": build_unique_commercial_category_slug(
                            supabase=supabase,
                            category_name=category_name,
                        ),
                        "is_active": True,
                        "sort_order": 0,
                    }
                )
                .execute()
            )
        except Exception as error:
            if not is_commercial_category_unique_violation(error):
                raise

            existing_category = find_existing_commercial_category_by_name(
                supabase=supabase,
                category_name=category_name,
                offer_type=offer_type,
            )

            if not existing_category:
                raise CommercialProfileCreateError(
                    "Could not resolve the duplicated category."
                ) from error

            resolved_category_ids.append(str(existing_category["id"]))
            continue

        if not category_response.data:
            raise CommercialProfileCreateError(
                "Supabase did not create the new category."
            )

        created_category_id = str(category_response.data[0]["id"])
        resolved_category_ids.append(created_category_id)
        created_category_ids.append(created_category_id)

    return resolved_category_ids, created_category_ids



def validate_commercial_categories(
    *,
    category_ids: list[str],
    offer_type: str,
) -> list[str]:
    normalized_ids = [
        str(category_id)
        for category_id in category_ids
    ]

    if not 1 <= len(normalized_ids) <= 5:
        raise CommercialProfileValidationError(
            "Select between 1 and 5 categories."
        )

    if len(normalized_ids) != len(set(normalized_ids)):
        raise CommercialProfileValidationError(
            "Categories cannot be repeated."
        )

    for category_id in normalized_ids:
        validate_commercial_category(
            category_id=category_id,
            offer_type=offer_type,
        )

    return normalized_ids
