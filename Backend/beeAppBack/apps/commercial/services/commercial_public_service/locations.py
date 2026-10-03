from __future__ import annotations

from random import sample
from typing import Any, Callable

from apps.commercial.exceptions import CommercialOperationError


def normalize_category_search(value: str | None) -> str | None:
    import unicodedata

    normalized_value = str(value or "").strip()
    normalized_unicode = unicodedata.normalize("NFKD", normalized_value)
    normalized_without_accents = "".join(
        character
        for character in normalized_unicode
        if not unicodedata.combining(character)
    )
    normalized_key = normalized_without_accents.casefold()
    return normalized_key or None


def list_public_countries(
    *,
    execute: Callable,
    public_profile_query: Callable,
    response_rows: Callable,
) -> list[dict[str, Any]]:
    try:
        response = execute(
            lambda client: public_profile_query(client)
            .select("country_code")
            .execute()
        )
        country_codes = sorted({
            str(row.get("country_code") or "").strip()
            for row in response_rows(response)
            if str(row.get("country_code") or "").strip()
        })
        return [{"country_code": country_code} for country_code in country_codes]
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
    execute: Callable,
    public_profile_query: Callable,
    response_rows: Callable,
) -> list[dict[str, Any]]:
    normalized_country_code = str(country_code or "").strip().upper()
    if not normalized_country_code:
        raise CommercialOperationError(
            "Country code is required.",
            code="COMMERCIAL_COUNTRY_CODE_REQUIRED",
        )
    try:
        response = execute(
            lambda client: public_profile_query(client)
            .select("city")
            .eq("country_code", normalized_country_code)
            .execute()
        )
        cities = sorted({
            str(row.get("city") or "").strip()
            for row in response_rows(response)
            if str(row.get("city") or "").strip()
        }, key=str.lower)
        return [{"city": city} for city in cities]
    except CommercialOperationError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial cities.",
            code="COMMERCIAL_PUBLIC_CITIES_LOOKUP_FAILED",
        ) from error


def list_public_categories(
    *,
    country_code: str | None,
    city: str | None,
    offer_type: str | None,
    search: str | None,
    limit: int,
    execute: Callable,
    response_rows: Callable,
    compatible_offer_types: Callable,
) -> list[dict[str, Any]]:
    del country_code, city
    normalized_search = normalize_category_search(search)
    normalized_limit = max(1, min(int(limit), 5))
    try:
        def operation(client):
            query = (
                client.table("commercial_categories")
                .select(
                    "id,parent_id,offer_type,name,slug,sort_order,"
                    "normalized_name"
                )
                .eq("is_active", True)
            )
            if offer_type:
                query = query.in_(
                    "offer_type",
                    compatible_offer_types(offer_type),
                )
            if normalized_search:
                query = query.ilike(
                    "normalized_name",
                    f"%{normalized_search}%",
                )
            return query.execute()

        response = execute(operation)
        categories = response_rows(response)
        if normalized_search:
            categories.sort(
                key=lambda category: (
                    0 if str(
                        category.get("normalized_name") or ""
                    ).casefold().startswith(normalized_search) else 1,
                    int(category.get("sort_order") or 0),
                    str(category.get("name") or "").casefold(),
                )
            )
        else:
            categories = sample(
                categories,
                min(normalized_limit, len(categories)),
            )
        return [
            {
                "id": category.get("id"),
                "parent_id": category.get("parent_id"),
                "offer_type": category.get("offer_type"),
                "name": category.get("name"),
                "slug": category.get("slug"),
                "sort_order": category.get("sort_order"),
            }
            for category in categories[:normalized_limit]
        ]
    except CommercialOperationError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial categories.",
            code="COMMERCIAL_PUBLIC_CATEGORIES_LOOKUP_FAILED",
        ) from error
