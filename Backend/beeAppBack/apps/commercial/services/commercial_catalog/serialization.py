from typing import Any


def serialize_catalog(
    *,
    catalog: dict[str, Any],
) -> dict[str, Any]:
    return {
        "id": str(catalog["id"]),
        "commercial_profile_id": str(
            catalog["commercial_profile_id"]
        ),
        "name": catalog["name"],
        "description": catalog.get("description"),
        "sort_order": catalog["sort_order"],
        "status": catalog["status"],
        "archived_at": catalog.get("archived_at"),
        "created_at": catalog.get("created_at"),
        "updated_at": catalog.get("updated_at"),
    }
