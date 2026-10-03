from __future__ import annotations

from typing import Any, Callable

from apps.commercial.exceptions import (
    CommercialNotFoundError,
    CommercialOperationError,
)

from .shared import (
    PUBLIC_PROFILE_COLUMNS,
    _extract_first_row,
    _response_rows,
)


def require_public_commercial_profile(
    *,
    commercial_profile_id: str,
    execute: Callable,
    public_profile_query: Callable,
) -> dict[str, Any]:
    response = execute(
        lambda client: public_profile_query(client)
        .eq("id", str(commercial_profile_id))
        .maybe_single()
        .execute()
    )
    profile = _extract_first_row(response)
    if not profile:
        raise CommercialNotFoundError(
            "Commercial profile was not found or is unavailable.",
            code="COMMERCIAL_PUBLIC_PROFILE_NOT_FOUND",
        )
    return profile


def list_public_commercial_profiles(
    *,
    country_code: str | None,
    city: str | None,
    category_id: str | None,
    offer_type: str | None,
    modality: str | None,
    verified_only: bool,
    delivery_only: bool,
    search: str | None,
    ordering: str,
    limit: int,
    offset: int,
    execute: Callable,
    public_profile_query: Callable,
    response_rows: Callable,
    normalize_country_code: Callable,
    normalize_city: Callable,
    validate_search: Callable,
    build_search_filter: Callable,
    get_modalities: Callable,
    enrich_profiles: Callable,
) -> dict[str, Any]:
    normalized_limit = max(1, min(int(limit), 50))
    normalized_offset = max(0, int(offset))
    normalized_search = validate_search(search) if search else None

    try:
        def operation(client):
            query = public_profile_query(client).select(
                PUBLIC_PROFILE_COLUMNS
            )
            normalized_country_code = normalize_country_code(country_code)
            normalized_city = normalize_city(city)

            if normalized_country_code:
                query = query.eq(
                    "country_code",
                    normalized_country_code,
                )
            if normalized_city:
                query = query.ilike("city", normalized_city)
            if category_id:
                category_profiles_response = (
                    client.table("commercial_profile_categories")
                    .select("commercial_profile_id")
                    .eq("commercial_category_id", str(category_id))
                    .execute()
                )
                matching_profile_ids = list(dict.fromkeys(
                    str(row["commercial_profile_id"])
                    for row in response_rows(category_profiles_response)
                    if row.get("commercial_profile_id")
                ))
                query = query.in_(
                    "id",
                    matching_profile_ids or [
                        "00000000-0000-0000-0000-000000000000"
                    ],
                )
            if offer_type == "mixed":
                query = query.in_("offer_type", ["products", "services"])
            elif offer_type:
                query = query.eq("offer_type", offer_type)
            if verified_only:
                query = (
                    query.eq("verification_status", "verified")
                    .eq("verification_badge_visible", True)
                )
            if delivery_only:
                query = query.neq("delivery_fee_mode", "not_offered")
            if normalized_search:
                query = query.or_(build_search_filter(
                    columns=(
                        "display_name",
                        "description",
                        "custom_activity_text",
                    ),
                    value=normalized_search,
                ))
            query = (
                query.order("created_at", desc=True)
                if ordering == "recent"
                else query.order("display_name")
            )
            return query.range(
                normalized_offset,
                normalized_offset + normalized_limit - 1,
            ).execute()

        response = execute(operation)
        profiles = response_rows(response)
        if modality:
            modalities_by_profile_id = get_modalities(
                profile_ids=[
                    str(profile["id"])
                    for profile in profiles
                    if profile.get("id")
                ]
            )
            profiles = [
                profile for profile in profiles
                if modality in modalities_by_profile_id.get(
                    str(profile["id"]), []
                )
            ]
        return {
            "profiles": enrich_profiles(profiles),
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
    execute: Callable,
    public_profile_query: Callable,
    enrich_profiles: Callable,
) -> dict[str, Any]:
    try:
        response = execute(
            lambda client: public_profile_query(client)
            .eq("id", str(commercial_profile_id))
            .maybe_single()
            .execute()
        )
        profile = _extract_first_row(response)
        if not profile:
            raise CommercialNotFoundError(
                "Commercial profile was not found or is unavailable.",
                code="COMMERCIAL_PUBLIC_PROFILE_NOT_FOUND",
            )
        return enrich_profiles([profile])[0]
    except CommercialNotFoundError:
        raise
    except CommercialOperationError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial profile.",
            code="COMMERCIAL_PUBLIC_PROFILE_LOOKUP_FAILED",
        ) from error
