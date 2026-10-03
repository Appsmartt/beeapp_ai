from __future__ import annotations

from collections import defaultdict
from typing import Any, Callable

from apps.commercial.exceptions import (
    CommercialNotFoundError,
    CommercialOperationError,
)

from .shared import (
    PUBLIC_OFFER_COLUMNS,
    PUBLIC_OFFER_MODALITY_COLUMNS,
    _extract_first_row,
    _response_rows,
)


def get_offer_modalities_by_offer_ids(
    *,
    offer_ids: list[str],
    execute: Callable,
) -> dict[str, list[str]]:
    normalized_ids = list(dict.fromkeys(
        str(offer_id) for offer_id in offer_ids if offer_id
    ))
    if not normalized_ids:
        return {}
    try:
        response = execute(
            lambda client: client.table("commercial_offer_modalities")
            .select(PUBLIC_OFFER_MODALITY_COLUMNS)
            .in_("commercial_offer_id", normalized_ids)
            .order("created_at")
            .execute()
        )
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial offer modalities.",
            code="COMMERCIAL_PUBLIC_OFFER_MODALITIES_LOOKUP_FAILED",
        ) from error

    result: dict[str, list[str]] = defaultdict(list)
    for row in _response_rows(response):
        offer_id = str(row.get("commercial_offer_id") or "")
        modality = str(row.get("modality") or "").strip()
        if offer_id and modality:
            result[offer_id].append(modality)
    return dict(result)


def serialize_public_offer(
    *,
    offer: dict[str, Any],
    modalities: list[str],
    images: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "id": str(offer["id"]),
        "commercial_profile_id": str(offer["commercial_profile_id"]),
        "catalog_id": str(offer["catalog_id"]),
        "offer_kind": offer["offer_kind"],
        "title": offer["title"],
        "description": offer.get("description"),
        "pricing_strategy": offer["pricing_strategy"],
        "base_price_amount": offer.get("base_price_amount"),
        "currency_code": offer["currency_code"],
        "modalities": modalities,
        "duration_minutes": offer.get("duration_minutes"),
        "requires_booking": bool(offer.get("requires_booking")),
        "payment_policy": offer.get("payment_policy"),
        "images": images,
        "created_at": offer.get("created_at"),
        "updated_at": offer.get("updated_at"),
    }


def enrich_public_offers(
    *,
    offers: list[dict[str, Any]],
    get_modalities: Callable,
    get_images: Callable,
    serialize_offer: Callable,
) -> list[dict[str, Any]]:
    offer_ids = [
        str(offer["id"])
        for offer in offers
        if offer.get("id")
    ]
    modalities_by_offer_id = get_modalities(offer_ids=offer_ids)
    images_by_offer_id = get_images(offer_ids=offer_ids)
    return [
        serialize_offer(
            offer=offer,
            modalities=modalities_by_offer_id.get(
                str(offer["id"]),
                [],
            ),
            images=images_by_offer_id.get(str(offer["id"]), []),
        )
        for offer in offers
    ]


def list_public_commercial_offers(
    *,
    commercial_profile_id: str,
    catalog_id: str | None,
    offer_kind: str | None,
    modality: str | None,
    requires_booking: bool | None,
    limit: int,
    offset: int,
    execute: Callable,
    response_rows: Callable,
    require_public_profile: Callable,
    require_public_catalog: Callable,
    get_modalities: Callable,
    enrich_offers: Callable,
) -> dict[str, Any]:
    normalized_limit = max(1, min(int(limit), 50))
    normalized_offset = max(0, int(offset))
    require_public_profile(commercial_profile_id=str(commercial_profile_id))

    if catalog_id:
        require_public_catalog(
            commercial_profile_id=str(commercial_profile_id),
            catalog_id=str(catalog_id),
        )

    try:
        def operation(client):
            query = (
                client.table("commercial_offers")
                .select(PUBLIC_OFFER_COLUMNS, count="exact")
                .eq("commercial_profile_id", str(commercial_profile_id))
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
            return query.order("sort_order").order("created_at").range(
                normalized_offset,
                normalized_offset + normalized_limit - 1,
            ).execute()

        response = execute(operation)
        offers = response_rows(response)

        if offers:
            catalog_ids = list(dict.fromkeys(
                str(offer["catalog_id"])
                for offer in offers
                if offer.get("catalog_id")
            ))
            catalogs_response = execute(
                lambda client: client.table("commercial_catalogs")
                .select("id")
                .in_("id", catalog_ids)
                .eq("commercial_profile_id", str(commercial_profile_id))
                .eq("status", "published")
                .is_("archived_at", "null")
                .execute()
            )
            published_catalog_ids = {
                str(catalog["id"])
                for catalog in response_rows(catalogs_response)
                if catalog.get("id")
            }
            offers = [
                offer for offer in offers
                if str(offer.get("catalog_id"))
                in published_catalog_ids
            ]

        if modality:
            modalities_by_offer_id = get_modalities(
                offer_ids=[
                    str(offer["id"])
                    for offer in offers
                    if offer.get("id")
                ]
            )
            offers = [
                offer for offer in offers
                if modality in modalities_by_offer_id.get(
                    str(offer["id"]),
                    [],
                )
            ]

        return {
            "commercial_profile_id": str(commercial_profile_id),
            "offers": enrich_offers(offers),
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
    execute: Callable,
    require_public_profile: Callable,
    enrich_offers: Callable,
) -> dict[str, Any]:
    try:
        response = execute(
            lambda client: client.table("commercial_offers")
            .select(PUBLIC_OFFER_COLUMNS)
            .eq("id", str(commercial_offer_id))
            .eq("status", "published")
            .eq("is_available", True)
            .is_("archived_at", "null")
            .maybe_single()
            .execute()
        )
        offer = _extract_first_row(response)
        if not offer:
            raise CommercialNotFoundError(
                "Commercial offer was not found or is unavailable.",
                code="COMMERCIAL_PUBLIC_OFFER_NOT_FOUND",
            )

        require_public_profile(
            commercial_profile_id=str(offer["commercial_profile_id"])
        )
        catalog_response = execute(
            lambda client: client.table("commercial_catalogs")
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
        if not _extract_first_row(catalog_response):
            raise CommercialNotFoundError(
                "Commercial offer was not found or is unavailable.",
                code="COMMERCIAL_PUBLIC_OFFER_NOT_FOUND",
            )
        return enrich_offers([offer])[0]
    except CommercialNotFoundError:
        raise
    except CommercialOperationError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial offer.",
            code="COMMERCIAL_PUBLIC_OFFER_LOOKUP_FAILED",
        ) from error
