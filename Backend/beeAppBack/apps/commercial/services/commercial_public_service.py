from __future__ import annotations

from collections import defaultdict
from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.commercial.exceptions import (
    CommercialNotFoundError,
    CommercialOperationError,
)


PUBLIC_PROFILE_COLUMNS = (
    "id,offer_type,category_id,custom_activity_text,display_name,"
    "description,country_code,city,address,neighborhood,"
    "location_reference,is_address_public,phone_dial_code,"
    "phone_number,is_phone_public,public_email,is_email_public,"
    "logo_file_id,is_public,is_available,publication_status,"
    "verification_status,verification_badge_visible,timezone,"
    "delivery_fee_mode,created_at,updated_at"
)

PUBLIC_CATEGORY_COLUMNS = (
    "id,parent_id,offer_type,name,slug,sort_order"
)

PUBLIC_MODALITY_COLUMNS = (
    "commercial_profile_id,modality"
)


def _response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return [
            row for row in data
            if isinstance(row, dict)
        ]

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


def _get_modalities_by_profile_ids(
    *,
    profile_ids: list[str],
) -> dict[str, list[str]]:
    normalized_ids = list(
        dict.fromkeys(
            str(profile_id)
            for profile_id in profile_ids
            if profile_id
        )
    )

    if not normalized_ids:
        return {}

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_profile_modalities")
                .select(PUBLIC_MODALITY_COLUMNS)
                .in_("commercial_profile_id", normalized_ids)
                .order("created_at")
                .execute()
            )
        )
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial profile modalities.",
            code="COMMERCIAL_PUBLIC_MODALITIES_LOOKUP_FAILED",
        ) from error

    result: dict[str, list[str]] = defaultdict(list)

    for row in _response_rows(response):
        profile_id = str(
            row.get("commercial_profile_id") or ""
        )
        modality = str(row.get("modality") or "").strip()

        if profile_id and modality:
            result[profile_id].append(modality)

    return dict(result)


def _get_categories_by_ids(
    *,
    category_ids: list[str],
) -> dict[str, dict[str, Any]]:
    normalized_ids = list(
        dict.fromkeys(
            str(category_id)
            for category_id in category_ids
            if category_id
        )
    )

    if not normalized_ids:
        return {}

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_categories")
                .select(PUBLIC_CATEGORY_COLUMNS)
                .in_("id", normalized_ids)
                .eq("is_active", True)
                .execute()
            )
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


def _serialize_public_profile(
    *,
    profile: dict[str, Any],
    modalities: list[str],
    category: dict[str, Any] | None,
) -> dict[str, Any]:
    is_verified = (
        profile.get("verification_status") == "verified"
        and bool(profile.get("verification_badge_visible"))
    )

    return {
        "id": str(profile["id"]),
        "display_name": profile["display_name"],
        "description": profile["description"],
        "offer_type": profile["offer_type"],
        "category": category,
        "custom_activity_text": profile.get(
            "custom_activity_text"
        ),
        "country_code": profile["country_code"],
        "city": profile["city"],
        "location": {
            "address": (
                profile.get("address")
                if profile.get("is_address_public")
                else None
            ),
            "neighborhood": (
                profile.get("neighborhood")
                if profile.get("is_address_public")
                else None
            ),
            "location_reference": (
                profile.get("location_reference")
                if profile.get("is_address_public")
                else None
            ),
            "is_address_public": bool(
                profile.get("is_address_public")
            ),
        },
        "contact": {
            "phone_dial_code": (
                profile.get("phone_dial_code")
                if profile.get("is_phone_public")
                else None
            ),
            "phone_number": (
                profile.get("phone_number")
                if profile.get("is_phone_public")
                else None
            ),
            "email": (
                profile.get("public_email")
                if profile.get("is_email_public")
                else None
            ),
            "is_phone_public": bool(
                profile.get("is_phone_public")
            ),
            "is_email_public": bool(
                profile.get("is_email_public")
            ),
        },
        "logo_file_id": (
            str(profile["logo_file_id"])
            if profile.get("logo_file_id")
            else None
        ),
        "modalities": modalities,
        "delivery_fee_mode": profile.get(
            "delivery_fee_mode"
        ),
        "is_verified": is_verified,
        "created_at": profile.get("created_at"),
        "updated_at": profile.get("updated_at"),
    }


def _enrich_public_profiles(
    profiles: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    profile_ids = [
        str(profile["id"])
        for profile in profiles
        if profile.get("id")
    ]

    category_ids = [
        str(profile["category_id"])
        for profile in profiles
        if profile.get("category_id")
    ]

    modalities_by_profile_id = _get_modalities_by_profile_ids(
        profile_ids=profile_ids,
    )
    categories_by_id = _get_categories_by_ids(
        category_ids=category_ids,
    )

    return [
        _serialize_public_profile(
            profile=profile,
            modalities=modalities_by_profile_id.get(
                str(profile["id"]),
                [],
            ),
            category=categories_by_id.get(
                str(profile["category_id"])
            )
            if profile.get("category_id")
            else None,
        )
        for profile in profiles
    ]


def list_public_countries() -> list[dict[str, Any]]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                _public_profile_query(client)
                .select("country_code")
                .execute()
            )
        )

        country_codes = sorted(
            {
                str(row.get("country_code") or "").strip()
                for row in _response_rows(response)
                if str(row.get("country_code") or "").strip()
            }
        )

        return [
            {
                "country_code": country_code,
            }
            for country_code in country_codes
        ]

    except CommercialOperationError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial countries.",
            code="COMMERCIAL_PUBLIC_COUNTRIES_LOOKUP_FAILED",
        ) from error


def list_public_cities(
    *,
    country_code: str,
) -> list[dict[str, Any]]:
    normalized_country_code = str(country_code or "").strip().upper()

    if not normalized_country_code:
        raise CommercialOperationError(
            "Country code is required.",
            code="COMMERCIAL_COUNTRY_CODE_REQUIRED",
        )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                _public_profile_query(client)
                .select("city")
                .eq("country_code", normalized_country_code)
                .execute()
            )
        )

        cities = sorted(
            {
                str(row.get("city") or "").strip()
                for row in _response_rows(response)
                if str(row.get("city") or "").strip()
            },
            key=str.lower,
        )

        return [
            {
                "city": city,
            }
            for city in cities
        ]

    except CommercialOperationError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial cities.",
            code="COMMERCIAL_PUBLIC_CITIES_LOOKUP_FAILED",
        ) from error


def list_public_categories(
    *,
    country_code: str | None = None,
    city: str | None = None,
    offer_type: str | None = None,
) -> list[dict[str, Any]]:
    normalized_country_code = _normalize_optional_country_code(
        country_code
    )
    normalized_city = _normalize_optional_city(city)

    try:
        def operation(client):
            query = (
                _public_profile_query(client)
                .select("category_id")
                .not_.is_("category_id", "null")
            )

            if normalized_country_code:
                query = query.eq(
                    "country_code",
                    normalized_country_code,
                )

            if normalized_city:
                query = query.ilike(
                    "city",
                    normalized_city,
                )

            if offer_type:
                query = query.eq("offer_type", offer_type)

            return query.execute()

        profiles_response = execute_with_supabase_admin_retry(
            operation
        )

        category_ids = [
            str(row["category_id"])
            for row in _response_rows(profiles_response)
            if row.get("category_id")
        ]

        categories_by_id = _get_categories_by_ids(
            category_ids=category_ids,
        )

        categories = list(categories_by_id.values())

        categories.sort(
            key=lambda category: (
                int(category.get("sort_order") or 0),
                str(category.get("name") or "").casefold(),
            )
        )

        return categories

    except CommercialOperationError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial categories.",
            code="COMMERCIAL_PUBLIC_CATEGORIES_LOOKUP_FAILED",
        ) from error


def list_public_commercial_profiles(
    *,
    country_code: str | None = None,
    city: str | None = None,
    category_id: str | None = None,
    offer_type: str | None = None,
    modality: str | None = None,
    verified_only: bool = False,
    delivery_only: bool = False,
    search: str | None = None,
    ordering: str = "recent",
    limit: int = 20,
    offset: int = 0,
) -> dict[str, Any]:
    normalized_limit = max(1, min(int(limit), 50))
    normalized_offset = max(0, int(offset))

    try:
        def operation(client):
            query = (
                _public_profile_query(client)
                .select(PUBLIC_PROFILE_COLUMNS)
            )

            normalized_country_code = (
                _normalize_optional_country_code(country_code)
            )
            normalized_city = _normalize_optional_city(city)

            if normalized_country_code:
                query = query.eq(
                    "country_code",
                    normalized_country_code,
                )

            if normalized_city:
                query = query.ilike(
                    "city",
                    normalized_city,
                )

            if category_id:
                query = query.eq("category_id", str(category_id))

            if offer_type:
                query = query.eq("offer_type", offer_type)

            if verified_only:
                query = (
                    query.eq("verification_status", "verified")
                    .eq("verification_badge_visible", True)
                )

            if delivery_only:
                query = query.neq(
                    "delivery_fee_mode",
                    "not_offered",
                )

            if search:
                normalized_search = str(search).strip()
                query = query.or_(
                    (
                        f"display_name.ilike.%{normalized_search}%,"
                        f"description.ilike.%{normalized_search}%,"
                        f"custom_activity_text.ilike.%{normalized_search}%"
                    )
                )

            if ordering == "recent":
                query = query.order("created_at", desc=True)
            else:
                query = query.order("display_name")

            return (
                query.range(
                    normalized_offset,
                    normalized_offset + normalized_limit - 1,
                )
                .execute()
            )

        response = execute_with_supabase_admin_retry(operation)
        profiles = _response_rows(response)

        if modality:
            modalities_by_profile_id = (
                _get_modalities_by_profile_ids(
                    profile_ids=[
                        str(profile["id"])
                        for profile in profiles
                        if profile.get("id")
                    ],
                )
            )

            profiles = [
                profile for profile in profiles
                if modality in modalities_by_profile_id.get(
                    str(profile["id"]),
                    [],
                )
            ]

        return {
            "profiles": _enrich_public_profiles(profiles),
            "count": len(profiles),
            "limit": normalized_limit,
            "offset": normalized_offset,
            "ordering": ordering,
        }

    except CommercialOperationError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial profiles.",
            code="COMMERCIAL_PUBLIC_PROFILES_LOOKUP_FAILED",
        ) from error


def get_public_commercial_profile(
    *,
    commercial_profile_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                _public_profile_query(client)
                .eq("id", str(commercial_profile_id))
                .maybe_single()
                .execute()
            )
        )

        profile = _extract_first_row(response)

        if not profile:
            raise CommercialNotFoundError(
                "Commercial profile was not found or is unavailable.",
                code="COMMERCIAL_PUBLIC_PROFILE_NOT_FOUND",
            )

        return _enrich_public_profiles([profile])[0]

    except CommercialNotFoundError:
        raise

    except CommercialOperationError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial profile.",
            code="COMMERCIAL_PUBLIC_PROFILE_LOOKUP_FAILED",
        ) from error


def _normalize_optional_country_code(
    value: str | None,
) -> str | None:
    normalized_value = str(value or "").strip().upper()
    return normalized_value or None


def _normalize_optional_city(
    value: str | None,
) -> str | None:
    normalized_value = str(value or "").strip()
    return normalized_value or None


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
    "id,bucket_id,storage_path,display_name,original_name,"
    "mime_type,kind,status,trashed_at"
)

PUBLIC_OFFER_MODALITY_COLUMNS = (
    "commercial_offer_id,modality"
)

PUBLIC_IMAGE_SIGNED_URL_EXPIRES_IN_SECONDS = 300


def _require_public_commercial_profile(
    *,
    commercial_profile_id: str,
) -> dict[str, Any]:
    response = execute_with_supabase_admin_retry(
        lambda client: (
            _public_profile_query(client)
            .eq("id", str(commercial_profile_id))
            .maybe_single()
            .execute()
        )
    )

    profile = _extract_first_row(response)

    if not profile:
        raise CommercialNotFoundError(
            "Commercial profile was not found or is unavailable.",
            code="COMMERCIAL_PUBLIC_PROFILE_NOT_FOUND",
        )

    return profile


def _get_offer_modalities_by_offer_ids(
    *,
    offer_ids: list[str],
) -> dict[str, list[str]]:
    normalized_ids = list(
        dict.fromkeys(
            str(offer_id)
            for offer_id in offer_ids
            if offer_id
        )
    )

    if not normalized_ids:
        return {}

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_offer_modalities")
                .select(PUBLIC_OFFER_MODALITY_COLUMNS)
                .in_("commercial_offer_id", normalized_ids)
                .order("created_at")
                .execute()
            )
        )
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial offer modalities.",
            code="COMMERCIAL_PUBLIC_OFFER_MODALITIES_LOOKUP_FAILED",
        ) from error

    result: dict[str, list[str]] = defaultdict(list)

    for row in _response_rows(response):
        offer_id = str(
            row.get("commercial_offer_id") or ""
        )
        modality = str(row.get("modality") or "").strip()

        if offer_id and modality:
            result[offer_id].append(modality)

    return dict(result)


def _create_public_file_signed_url(
    *,
    file_record: dict[str, Any],
) -> str | None:
    if (
        file_record.get("kind") != "image"
        or file_record.get("status") != "ready"
        or file_record.get("trashed_at") is not None
    ):
        return None

    bucket_id = str(file_record.get("bucket_id") or "").strip()
    storage_path = str(
        file_record.get("storage_path") or ""
    ).strip()

    if not bucket_id or not storage_path:
        return None

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.storage.from_(bucket_id).create_signed_url(
                    storage_path,
                    PUBLIC_IMAGE_SIGNED_URL_EXPIRES_IN_SECONDS,
                )
            )
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


def _get_offer_images_by_offer_ids(
    *,
    offer_ids: list[str],
) -> dict[str, list[dict[str, Any]]]:
    normalized_ids = list(
        dict.fromkeys(
            str(offer_id)
            for offer_id in offer_ids
            if offer_id
        )
    )

    if not normalized_ids:
        return {}

    try:
        images_response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_offer_images")
                .select(PUBLIC_OFFER_IMAGE_COLUMNS)
                .in_("commercial_offer_id", normalized_ids)
                .eq("status", "active")
                .order("is_primary", desc=True)
                .order("sort_order")
                .order("created_at")
                .execute()
            )
        )

        image_rows = _response_rows(images_response)

        file_ids = list(
            dict.fromkeys(
                str(row["file_id"])
                for row in image_rows
                if row.get("file_id")
            )
        )

        files_by_id: dict[str, dict[str, Any]] = {}

        if file_ids:
            files_response = execute_with_supabase_admin_retry(
                lambda client: (
                    client.table("files")
                    .select(PUBLIC_FILE_IMAGE_COLUMNS)
                    .in_("id", file_ids)
                    .eq("status", "ready")
                    .is_("trashed_at", "null")
                    .execute()
                )
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

            if not file_record:
                continue

            result[
                str(image["commercial_offer_id"])
            ].append(
                {
                    "id": str(image["id"]),
                    "file_id": file_id,
                    "display_name": (
                        file_record.get("display_name")
                        or file_record.get("original_name")
                    ),
                    "mime_type": file_record.get("mime_type"),
                    "sort_order": image.get("sort_order"),
                    "is_primary": bool(
                        image.get("is_primary")
                    ),
                    "url": _create_public_file_signed_url(
                        file_record=file_record,
                    ),
                    "url_expires_in_seconds": (
                        PUBLIC_IMAGE_SIGNED_URL_EXPIRES_IN_SECONDS
                    ),
                }
            )

        return dict(result)

    except CommercialOperationError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial offer images.",
            code="COMMERCIAL_PUBLIC_OFFER_IMAGES_LOOKUP_FAILED",
        ) from error


def _serialize_public_offer(
    *,
    offer: dict[str, Any],
    modalities: list[str],
    images: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "id": str(offer["id"]),
        "commercial_profile_id": str(
            offer["commercial_profile_id"]
        ),
        "catalog_id": str(offer["catalog_id"]),
        "offer_kind": offer["offer_kind"],
        "title": offer["title"],
        "description": offer.get("description"),
        "pricing_strategy": offer["pricing_strategy"],
        "base_price_amount": offer.get("base_price_amount"),
        "currency_code": offer["currency_code"],
        "modalities": modalities,
        "duration_minutes": offer.get(
            "duration_minutes"
        ),
        "requires_booking": bool(
            offer.get("requires_booking")
        ),
        "payment_policy": offer.get("payment_policy"),
        "images": images,
        "created_at": offer.get("created_at"),
        "updated_at": offer.get("updated_at"),
    }


def _enrich_public_offers(
    offers: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    offer_ids = [
        str(offer["id"])
        for offer in offers
        if offer.get("id")
    ]

    modalities_by_offer_id = (
        _get_offer_modalities_by_offer_ids(
            offer_ids=offer_ids,
        )
    )
    images_by_offer_id = _get_offer_images_by_offer_ids(
        offer_ids=offer_ids,
    )

    return [
        _serialize_public_offer(
            offer=offer,
            modalities=modalities_by_offer_id.get(
                str(offer["id"]),
                [],
            ),
            images=images_by_offer_id.get(
                str(offer["id"]),
                [],
            ),
        )
        for offer in offers
    ]


def list_public_commercial_catalogs(
    *,
    commercial_profile_id: str,
) -> list[dict[str, Any]]:
    _require_public_commercial_profile(
        commercial_profile_id=str(commercial_profile_id),
    )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_catalogs")
                .select(PUBLIC_CATALOG_COLUMNS)
                .eq(
                    "commercial_profile_id",
                    str(commercial_profile_id),
                )
                .eq("status", "published")
                .is_("archived_at", "null")
                .order("sort_order")
                .order("created_at")
                .execute()
            )
        )

        return [
            {
                "id": str(catalog["id"]),
                "commercial_profile_id": str(
                    catalog["commercial_profile_id"]
                ),
                "name": catalog["name"],
                "description": catalog.get("description"),
                "sort_order": catalog.get("sort_order"),
                "created_at": catalog.get("created_at"),
                "updated_at": catalog.get("updated_at"),
            }
            for catalog in _response_rows(response)
        ]

    except CommercialNotFoundError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial catalogs.",
            code="COMMERCIAL_PUBLIC_CATALOGS_LOOKUP_FAILED",
        ) from error


def list_public_commercial_offers(
    *,
    commercial_profile_id: str,
    catalog_id: str | None = None,
    offer_kind: str | None = None,
    modality: str | None = None,
    requires_booking: bool | None = None,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, Any]:
    normalized_limit = max(1, min(int(limit), 50))
    normalized_offset = max(0, int(offset))

    _require_public_commercial_profile(
        commercial_profile_id=str(commercial_profile_id),
    )

    if catalog_id:
        _require_public_catalog_for_profile(
            commercial_profile_id=str(commercial_profile_id),
            catalog_id=str(catalog_id),
        )

    try:
        def operation(client):
            query = (
                client.table("commercial_offers")
                .select(PUBLIC_OFFER_COLUMNS, count="exact")
                .eq(
                    "commercial_profile_id",
                    str(commercial_profile_id),
                )
                .eq("status", "published")
                .eq("is_available", True)
                .is_("archived_at", "null")
            )

            if catalog_id:
                query = query.eq("catalog_id", str(catalog_id))

            if offer_kind:
                query = query.eq("offer_kind", offer_kind)

            if requires_booking is not None:
                query = query.eq(
                    "requires_booking",
                    bool(requires_booking),
                )

            return (
                query.order("sort_order")
                .order("created_at")
                .range(
                    normalized_offset,
                    normalized_offset + normalized_limit - 1,
                )
                .execute()
            )

        response = execute_with_supabase_admin_retry(operation)
        offers = _response_rows(response)

        if offers:
            catalog_ids = list(
                dict.fromkeys(
                    str(offer["catalog_id"])
                    for offer in offers
                    if offer.get("catalog_id")
                )
            )

            catalogs_response = execute_with_supabase_admin_retry(
                lambda client: (
                    client.table("commercial_catalogs")
                    .select("id")
                    .in_("id", catalog_ids)
                    .eq(
                        "commercial_profile_id",
                        str(commercial_profile_id),
                    )
                    .eq("status", "published")
                    .is_("archived_at", "null")
                    .execute()
                )
            )

            published_catalog_ids = {
                str(catalog["id"])
                for catalog in _response_rows(catalogs_response)
                if catalog.get("id")
            }

            offers = [
                offer for offer in offers
                if str(offer.get("catalog_id"))
                in published_catalog_ids
            ]

        if modality:
            modalities_by_offer_id = (
                _get_offer_modalities_by_offer_ids(
                    offer_ids=[
                        str(offer["id"])
                        for offer in offers
                        if offer.get("id")
                    ],
                )
            )

            offers = [
                offer for offer in offers
                if modality in modalities_by_offer_id.get(
                    str(offer["id"]),
                    [],
                )
            ]

        return {
            "commercial_profile_id": str(
                commercial_profile_id
            ),
            "offers": _enrich_public_offers(offers),
            "count": (
                len(offers)
                if modality
                else int(getattr(response, "count", 0) or 0)
            ),
            "limit": normalized_limit,
            "offset": normalized_offset,
        }

    except CommercialNotFoundError:
        raise

    except CommercialOperationError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial offers.",
            code="COMMERCIAL_PUBLIC_OFFERS_LOOKUP_FAILED",
        ) from error


def get_public_commercial_offer(
    *,
    commercial_offer_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_offers")
                .select(PUBLIC_OFFER_COLUMNS)
                .eq("id", str(commercial_offer_id))
                .eq("status", "published")
                .eq("is_available", True)
                .is_("archived_at", "null")
                .maybe_single()
                .execute()
            )
        )

        offer = _extract_first_row(response)

        if not offer:
            raise CommercialNotFoundError(
                "Commercial offer was not found or is unavailable.",
                code="COMMERCIAL_PUBLIC_OFFER_NOT_FOUND",
            )

        _require_public_commercial_profile(
            commercial_profile_id=str(
                offer["commercial_profile_id"]
            ),
        )

        catalog_response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_catalogs")
                .select("id")
                .eq("id", str(offer["catalog_id"]))
                .eq(
                    "commercial_profile_id",
                    str(offer["commercial_profile_id"]),
                )
                .eq("status", "published")
                .is_("archived_at", "null")
                .maybe_single()
                .execute()
            )
        )

        if not _extract_first_row(catalog_response):
            raise CommercialNotFoundError(
                "Commercial offer was not found or is unavailable.",
                code="COMMERCIAL_PUBLIC_OFFER_NOT_FOUND",
            )

        return _enrich_public_offers([offer])[0]

    except CommercialNotFoundError:
        raise

    except CommercialOperationError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial offer.",
            code="COMMERCIAL_PUBLIC_OFFER_LOOKUP_FAILED",
        ) from error


def _require_public_catalog_for_profile(
    *,
    commercial_profile_id: str,
    catalog_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_catalogs")
                .select(PUBLIC_CATALOG_COLUMNS)
                .eq("id", str(catalog_id))
                .eq(
                    "commercial_profile_id",
                    str(commercial_profile_id),
                )
                .eq("status", "published")
                .is_("archived_at", "null")
                .maybe_single()
                .execute()
            )
        )

        catalog = _extract_first_row(response)

        if not catalog:
            raise CommercialNotFoundError(
                "Commercial catalog was not found or is unavailable.",
                code="COMMERCIAL_PUBLIC_CATALOG_NOT_FOUND",
            )

        return catalog

    except CommercialNotFoundError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not verify public commercial catalog.",
            code="COMMERCIAL_PUBLIC_CATALOG_LOOKUP_FAILED",
        ) from error
