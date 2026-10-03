from __future__ import annotations

from typing import Any

from apps.commercial.exceptions import CommercialValidationError

POSTGREST_SEARCH_ALLOWED_PUNCTUATION = frozenset(
    {"@", ".", "-", "_", "%", chr(39)}
)

PUBLIC_PROFILE_COLUMNS = (
    "id,offer_type,category_id,custom_activity_text,display_name,"
    "description,country_code,city,address,neighborhood,"
    "location_reference,is_address_public,phone_dial_code,"
    "phone_number,is_phone_public,public_email,is_email_public,"
    "logo_file_id,owner_id,is_public,is_available,publication_status,"
    "verification_status,verification_badge_visible,timezone,"
    "delivery_fee_mode,delivery_fee_amount,delivery_currency_code,"
    "created_at,updated_at"
)

PUBLIC_CATEGORY_COLUMNS = "id,parent_id,offer_type,name,slug,sort_order"
PUBLIC_MODALITY_COLUMNS = "commercial_profile_id,modality"
PUBLIC_PROFILE_CATEGORY_COLUMNS = (
    "commercial_profile_id,commercial_category_id,sort_order"
)
PUBLIC_LOGO_FILE_COLUMNS = (
    "id,owner_id,bucket_id,storage_path,kind,status,trashed_at"
)
PUBLIC_CATALOG_COLUMNS = (
    "id,commercial_profile_id,name,description,sort_order,"
    "status,created_at,updated_at"
)
PUBLIC_OFFER_COLUMNS = (
    "id,commercial_profile_id,catalog_id,offer_kind,title,"
    "description,pricing_strategy,base_price_amount,currency_code,"
    "is_available,sort_order,status,track_inventory,"
    "duration_minutes,requires_booking,payment_policy,"
    "created_at,updated_at"
)
PUBLIC_OFFER_IMAGE_COLUMNS = (
    "id,commercial_offer_id,file_id,sort_order,is_primary,"
    "status,created_at,updated_at"
)
PUBLIC_FILE_IMAGE_COLUMNS = (
    "id,owner_id,bucket_id,storage_path,display_name,original_name,"
    "mime_type,kind,status,trashed_at"
)
PUBLIC_OFFER_MODALITY_COLUMNS = "commercial_offer_id,modality"
PUBLIC_IMAGE_SIGNED_URL_EXPIRES_IN_SECONDS = 300


def _validate_postgrest_search_value(value: str) -> str:
    normalized_value = str(value or "").strip()
    if any(
        not (
            character.isalnum()
            or character == " "
            or character in POSTGREST_SEARCH_ALLOWED_PUNCTUATION
        )
        for character in normalized_value
    ):
        raise CommercialValidationError(
            "Search contains unsupported characters.",
            code="COMMERCIAL_PUBLIC_SEARCH_INVALID",
        )
    return normalized_value


def _build_postgrest_ilike_or_filter(
    *,
    columns: tuple[str, ...],
    value: str,
) -> str:
    safe_value = _validate_postgrest_search_value(value)
    literal_value = safe_value.replace("%", "\\%").replace("_", "\\_")
    pattern = f"%{literal_value}%"
    return ",".join(
        f"{column}.ilike.{pattern}"
        for column in columns
    )


def _response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []
    data = getattr(response, "data", None)
    if isinstance(data, list):
        return [row for row in data if isinstance(row, dict)]
    if isinstance(data, dict):
        return [data]
    return []


def _extract_first_row(response) -> dict[str, Any] | None:
    rows = _response_rows(response)
    return rows[0] if rows else None


def _public_profile_query(client):
    return (
        client.table("commercial_profiles")
        .select(PUBLIC_PROFILE_COLUMNS)
        .eq("is_public", True)
        .eq("is_available", True)
        .eq("publication_status", "published")
        .is_("archived_at", "null")
        .is_("suspended_at", "null")
    )


def _normalize_optional_country_code(value: str | None) -> str | None:
    normalized_value = str(value or "").strip().upper()
    return normalized_value or None


def _normalize_optional_city(value: str | None) -> str | None:
    normalized_value = str(value or "").strip()
    return normalized_value or None
