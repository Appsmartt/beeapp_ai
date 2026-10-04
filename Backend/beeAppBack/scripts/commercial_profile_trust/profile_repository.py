from __future__ import annotations

from typing import Any
from urllib.parse import urlencode

from .http_client import JsonValue, request
from .runtime_config import RuntimeConfig


PROTECTED_FIELDS = (
    "verification_status",
    "verification_badge_visible",
    "suspended_at",
    "suspension_reason",
)


def auth_headers(config: RuntimeConfig, token: str) -> dict[str, str]:
    return {
        "apikey": config.anon_key,
        "Authorization": f"Bearer {token}",
        "Prefer": "return=representation",
    }


def profile_url(
    config: RuntimeConfig,
    filters: dict[str, str],
    selected_fields: tuple[str, ...] | str,
) -> str:
    select_value = (
        ",".join(selected_fields)
        if isinstance(selected_fields, tuple)
        else selected_fields
    )
    query = urlencode({"select": select_value, **filters})
    return f"{config.supabase_url}/rest/v1/commercial_profiles?{query}"


def list_owner_profiles(
    config: RuntimeConfig,
    token: str,
    owner_id: str,
) -> tuple[int, JsonValue]:
    return request(
        "GET",
        profile_url(
            config,
            {"owner_id": f"eq.{owner_id}", "limit": "10"},
            (
                "id",
                "owner_id",
                "is_available",
                *PROTECTED_FIELDS,
            ),
        ),
        headers=auth_headers(config, token),
    )


def fetch_profile_template(
    config: RuntimeConfig,
    token: str,
    profile_id: str,
) -> tuple[int, JsonValue]:
    return request(
        "GET",
        profile_url(
            config,
            {"id": f"eq.{profile_id}"},
            ("offer_type", "country_code"),
        ),
        headers=auth_headers(config, token),
    )


def update_profile(
    config: RuntimeConfig,
    token: str,
    profile_id: str,
    owner_id: str | None,
    payload: dict[str, Any],
    selected_fields: tuple[str, ...],
) -> tuple[int, JsonValue]:
    filters = {"id": f"eq.{profile_id}"}
    if owner_id is not None:
        filters["owner_id"] = f"eq.{owner_id}"
    return request(
        "PATCH",
        profile_url(config, filters, selected_fields),
        payload,
        headers=auth_headers(config, token),
    )


def create_profile(
    config: RuntimeConfig,
    token: str,
    payload: dict[str, Any],
) -> tuple[int, JsonValue]:
    return request(
        "POST",
        (
            f"{config.supabase_url}/rest/v1/commercial_profiles"
            "?select=id,owner_id,verification_status,"
            "verification_badge_visible,suspended_at,suspension_reason"
        ),
        payload,
        headers=auth_headers(config, token),
    )


def delete_profile(
    config: RuntimeConfig,
    token: str,
    profile_id: str,
    owner_id: str,
) -> tuple[int, JsonValue]:
    return request(
        "DELETE",
        profile_url(
            config,
            {"id": f"eq.{profile_id}", "owner_id": f"eq.{owner_id}"},
            ("id",),
        ),
        headers=auth_headers(config, token),
    )
