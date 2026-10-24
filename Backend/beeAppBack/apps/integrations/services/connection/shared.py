from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)


SAFE_CONNECTION_COLUMNS = (
    "id,user_id,provider,provider_account_id,"
    "provider_tenant_id,provider_email,"
    "provider_display_name,provider_avatar_url,status,"
    "granted_scopes,capabilities,token_expires_at,"
    "last_token_refresh_at,last_successful_auth_at,"
    "reauth_required_at,disconnected_at,last_error_code,"
    "last_error_message,metadata,created_at,updated_at"
)


def get_supabase():
    return get_supabase_admin_client()


def extract_single(
    response: Any,
) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_string_list(
    values: list[Any] | None,
) -> list[str]:
    normalized_values: list[str] = []

    for value in values or []:
        normalized_value = str(value).strip()

        if (
            normalized_value
            and normalized_value not in normalized_values
        ):
            normalized_values.append(normalized_value)

    return normalized_values


def merge_string_lists(
    *values: list[Any] | None,
) -> list[str]:
    merged: list[str] = []

    for value_list in values:
        for value in normalize_string_list(value_list):
            if value not in merged:
                merged.append(value)

    return merged


def token_granted_scopes(
    token_data: dict[str, Any],
) -> list[str]:
    raw_scopes = token_data.get("scope")

    if not isinstance(raw_scopes, str):
        return []

    return normalize_string_list(raw_scopes.split())
