from typing import Any


def serialize_offer(
    *,
    offer: dict[str, Any],
    modalities: list[dict[str, Any]] | None = None,
    images: list[dict[str, Any]] | None = None,
    reserved_inventory: int | None = None,
    available_inventory: int | None = None,
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
        "is_available": bool(offer["is_available"]),
        "sort_order": offer["sort_order"],
        "status": offer["status"],
        "archived_at": offer.get("archived_at"),
        "track_inventory": bool(offer["track_inventory"]),
        "stock_quantity": offer.get("stock_quantity"),
        "reserved_inventory": reserved_inventory,
        "available_inventory": available_inventory,
        "duration_minutes": offer.get("duration_minutes"),
        "requires_booking": bool(offer["requires_booking"]),
        "payment_policy": offer.get("payment_policy"),
        "modalities": modalities or [],
        "images": images or [],
        "created_at": offer.get("created_at"),
        "updated_at": offer.get("updated_at"),
    }


def serialize_offer_image(
    *,
    image: dict[str, Any],
) -> dict[str, Any]:
    return {
        "id": str(image["id"]),
        "commercial_offer_id": str(image["commercial_offer_id"]),
        "file_id": str(image["file_id"]),
        "sort_order": image["sort_order"],
        "is_primary": bool(image["is_primary"]),
        "status": image["status"],
        "archived_at": image.get("archived_at"),
        "created_at": image.get("created_at"),
        "updated_at": image.get("updated_at"),
    }
