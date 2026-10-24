from __future__ import annotations

import hashlib
import secrets
from typing import Any, Callable

from apps.commercial.exceptions import CommercialOperationError

from .shared import PUBLIC_OFFER_COLUMNS


def list_public_commercial_product_feed(
    *,
    search: str | None,
    seed: str | None,
    limit: int,
    offset: int,
    execute: Callable,
    validate_search: Callable,
    public_profile_query: Callable,
    response_rows: Callable,
    enrich_offers: Callable,
    enrich_profiles: Callable,
) -> dict[str, Any]:
    normalized_search = validate_search(search) if search else ""
    normalized_seed = str(seed or "").strip() or secrets.token_urlsafe(18)
    normalized_limit = max(1, min(int(limit), 20))
    normalized_offset = max(0, int(offset))

    try:
        def operation(client):
            public_profiles = response_rows(
                public_profile_query(client).execute()
            )
            public_profile_ids = [
                str(profile["id"])
                for profile in public_profiles
                if profile.get("id")
            ]
            if not public_profile_ids:
                return [], []

            matching_profiles = public_profiles
            if normalized_search:
                normalized_search_folded = normalized_search.casefold()
                matching_profiles = [
                    profile for profile in public_profiles
                    if (
                        normalized_search_folded
                        in str(profile.get("display_name") or "").casefold()
                        or normalized_search_folded
                        in str(profile.get("description") or "").casefold()
                        or normalized_search_folded
                        in str(
                            profile.get("custom_activity_text") or ""
                        ).casefold()
                    )
                ]

            matching_profile_ids = {
                str(profile["id"])
                for profile in matching_profiles
                if profile.get("id")
            }
            offers = response_rows(
                client.table("commercial_offers")
                .select(PUBLIC_OFFER_COLUMNS)
                .in_("commercial_profile_id", public_profile_ids)
                .eq("status", "published")
                .eq("is_available", True)
                .is_("archived_at", "null")
                .execute()
            )
            catalog_ids = list(dict.fromkeys(
                str(offer["catalog_id"])
                for offer in offers
                if offer.get("catalog_id")
            ))
            if not catalog_ids:
                return [], matching_profiles if normalized_search else []

            published_catalog_ids = {
                str(catalog["id"])
                for catalog in response_rows(
                    client.table("commercial_catalogs")
                    .select("id")
                    .in_("id", catalog_ids)
                    .eq("status", "published")
                    .is_("archived_at", "null")
                    .execute()
                )
                if catalog.get("id")
            }
            offers = [
                offer for offer in offers
                if str(offer.get("catalog_id"))
                in published_catalog_ids
            ]
            if not normalized_search:
                return offers, []

            normalized_search_folded = normalized_search.casefold()
            return [
                offer for offer in offers
                if (
                    str(offer.get("commercial_profile_id") or "")
                    in matching_profile_ids
                    or normalized_search_folded
                    in str(offer.get("title") or "").casefold()
                    or normalized_search_folded
                    in str(offer.get("description") or "").casefold()
                )
            ], matching_profiles

        offers, matching_profiles = execute(operation)
        offers = [
            offer for offer in offers
            if bool(offer.get("is_available"))
        ]

        if normalized_search:
            normalized_search_folded = normalized_search.casefold()
            offers.sort(key=lambda offer: (
                normalized_search_folded
                not in str(offer.get("title") or "").casefold(),
                normalized_search_folded
                not in str(offer.get("description") or "").casefold(),
                str(offer.get("title") or "").casefold(),
            ))
            matching_profiles.sort(key=lambda profile: (
                normalized_search_folded
                not in str(profile.get("display_name") or "").casefold(),
                normalized_search_folded
                not in str(profile.get("description") or "").casefold(),
                str(profile.get("display_name") or "").casefold(),
            ))
        else:
            offers.sort(key=lambda offer: hashlib.sha256(
                f"{normalized_seed}:{offer.get('id', '')}".encode("utf-8")
            ).hexdigest())

        count = len(offers)
        page = offers[
            normalized_offset:normalized_offset + normalized_limit
        ]
        next_offset = normalized_offset + len(page)
        has_more = next_offset < count

        profiles_count = len(matching_profiles)
        profiles_page = matching_profiles[
            normalized_offset:normalized_offset + normalized_limit
        ]
        profiles_next_offset = normalized_offset + len(profiles_page)
        profiles_has_more = profiles_next_offset < profiles_count

        result = {
            "offers": enrich_offers(page),
            "count": count,
            "limit": normalized_limit,
            "offset": normalized_offset,
            "next_offset": next_offset if has_more else None,
            "has_more": has_more,
            "seed": normalized_seed,
        }
        if normalized_search:
            result.update({
                "profiles": enrich_profiles(profiles_page),
                "profiles_count": profiles_count,
                "profiles_next_offset": (
                    profiles_next_offset
                    if profiles_has_more
                    else None
                ),
                "profiles_has_more": profiles_has_more,
            })
        return result
    except CommercialOperationError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial product feed.",
            code="COMMERCIAL_PUBLIC_PRODUCT_FEED_LOOKUP_FAILED",
        ) from error
