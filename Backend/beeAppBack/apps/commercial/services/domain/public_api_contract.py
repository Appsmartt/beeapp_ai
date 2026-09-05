from __future__ import annotations

from dataclasses import dataclass

from .public_exploration import PublicBusinessFilters, parse_public_business_filters


PUBLIC_COMMERCIAL_API_PREFIX = "/api/commercial/public"

PUBLIC_COMMERCIAL_ENDPOINTS = {
    "countries": f"{PUBLIC_COMMERCIAL_API_PREFIX}/countries/",
    "cities": f"{PUBLIC_COMMERCIAL_API_PREFIX}/cities/",
    "categories": f"{PUBLIC_COMMERCIAL_API_PREFIX}/categories/",
    "profiles": f"{PUBLIC_COMMERCIAL_API_PREFIX}/profiles/",
    "profile_detail": f"{PUBLIC_COMMERCIAL_API_PREFIX}/profiles/{{profile_id}}/",
    "profile_catalogs": f"{PUBLIC_COMMERCIAL_API_PREFIX}/profiles/{{profile_id}}/catalogs/",
    "profile_offers": f"{PUBLIC_COMMERCIAL_API_PREFIX}/profiles/{{profile_id}}/offers/",
    "offer_detail": f"{PUBLIC_COMMERCIAL_API_PREFIX}/offers/{{offer_id}}/",
}


@dataclass(frozen=True)
class PublicCommercialApiContract:
    profiles_endpoint: str = PUBLIC_COMMERCIAL_ENDPOINTS["profiles"]
    default_page_size: int = 20
    max_page_size: int = 50
    supported_ordering: tuple[str, ...] = (
        "featured",
        "recent",
        "relevance",
    )


CONTRACT = PublicCommercialApiContract()


def parse_profiles_query_params(query: dict[str, object]) -> PublicBusinessFilters:
    return parse_public_business_filters(query)
