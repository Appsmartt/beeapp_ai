from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def get_supabase():
    from beeAppBack.core.supabase_client import (
        get_supabase_admin_client,
    )

    return get_supabase_admin_client()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def extract_single(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def response_data(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []
