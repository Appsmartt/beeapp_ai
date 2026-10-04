from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.chat.services.recipient_search.constants import (
    CHAT_IDENTITY_COLUMNS,
)


def supabase():
    return get_supabase_admin_client()


def response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def get_active_profile_identities(
    *,
    profile_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not profile_ids:
        return {}

    response = (
        supabase()
        .table("chat_identities")
        .select(CHAT_IDENTITY_COLUMNS)
        .in_("profile_id", profile_ids)
        .eq("identity_type", "profile")
        .eq("is_active", True)
        .execute()
    )

    return {
        identity["profile_id"]: identity
        for identity in response_rows(response)
        if identity.get("profile_id")
    }


def get_active_commercial_identities(
    *,
    commercial_profile_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not commercial_profile_ids:
        return {}

    response = (
        supabase()
        .table("chat_identities")
        .select(CHAT_IDENTITY_COLUMNS)
        .in_("commercial_profile_id", commercial_profile_ids)
        .eq("identity_type", "commercial_profile")
        .eq("is_active", True)
        .execute()
    )

    return {
        identity["commercial_profile_id"]: identity
        for identity in response_rows(response)
        if identity.get("commercial_profile_id")
    }
