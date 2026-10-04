from __future__ import annotations

from typing import Any

from apps.calendar.services.calendar_provider_service import (
    normalize_hex_color,
)

from .client import _extract_single, _supabase, _utc_now_iso
from .constants import ACCOUNT_COLOR_PALETTE

def _stable_color_from_seed(
    seed: str,
) -> str:
    hash_value = 0

    for character in seed:
        hash_value = (
            (hash_value * 31) + ord(character)
        ) & 0xFFFFFFFF

    return ACCOUNT_COLOR_PALETTE[
        hash_value % len(ACCOUNT_COLOR_PALETTE)
    ]

def _get_account_color(
    integration: dict[str, Any],
) -> str:
    metadata = integration.get("metadata")

    if isinstance(metadata, dict):
        stored_color = metadata.get("account_color")

        if isinstance(stored_color, str):
            return normalize_hex_color(
                stored_color,
                fallback=_stable_color_from_seed(
                    str(integration["id"])
                ),
            )

    return _stable_color_from_seed(str(integration["id"]))


def _update_integration_account_color(
    *,
    integration: dict[str, Any],
    account_color: str,
) -> dict[str, Any]:
    metadata = integration.get("metadata")

    normalized_metadata = (
        dict(metadata)
        if isinstance(metadata, dict)
        else {}
    )

    if normalized_metadata.get("account_color") == account_color:
        return integration

    normalized_metadata["account_color"] = account_color
    normalized_metadata["account_color_updated_at"] = (
        _utc_now_iso()
    )

    response = (
        _supabase()
        .table("calendar_integrations")
        .update(
            {
                "metadata": normalized_metadata,
            }
        )
        .eq("id", integration["id"])
        .execute()
    )

    updated_integration = _extract_single(response)

    return updated_integration or {
        **integration,
        "metadata": normalized_metadata,
    }
