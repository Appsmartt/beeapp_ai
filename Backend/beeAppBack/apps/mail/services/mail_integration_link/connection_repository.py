from __future__ import annotations

from typing import Any

from .constants import SAFE_CONNECTION_COLUMNS
from .response_helpers import get_supabase, response_data


def get_connection_map(
    *,
    user_id: str,
    connection_ids: list[str],
) -> dict[str, dict[str, Any]]:
    normalized_ids = list(
        dict.fromkeys(
            connection_id
            for connection_id in connection_ids
            if connection_id
        )
    )

    if not normalized_ids:
        return {}

    try:
        response = (
            get_supabase()
            .table("integration_connections_safe")
            .select(SAFE_CONNECTION_COLUMNS)
            .eq("user_id", user_id)
            .in_("id", normalized_ids)
            .execute()
        )

        return {
            str(connection["id"]): connection
            for connection in response_data(response)
        }
    except Exception:
        return {}
