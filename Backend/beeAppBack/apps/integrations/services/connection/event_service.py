from __future__ import annotations

from typing import Any

from apps.integrations.services.connection.shared import (
    get_supabase,
)


def record_connection_event(
    *,
    connection_id: str | None,
    user_id: str,
    provider: str,
    event_type: str,
    error_code: str | None = None,
    error_message: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    try:
        (
            get_supabase()
            .table("integration_events")
            .insert(
                {
                    "connection_id": connection_id,
                    "user_id": user_id,
                    "provider": provider,
                    "event_type": event_type,
                    "error_code": error_code,
                    "error_message": error_message,
                    "metadata": metadata or {},
                }
            )
            .execute()
        )
    except Exception:
        return
