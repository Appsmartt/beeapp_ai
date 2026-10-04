from __future__ import annotations

from typing import Any


def serialize_mail_integration(
    *,
    integration: dict[str, Any],
    connection: dict[str, Any] | None,
) -> dict[str, Any]:
    metadata = integration.get("metadata")
    normalized_metadata = metadata if isinstance(metadata, dict) else {}

    return {
        **integration,
        "provider": str(integration.get("provider") or ""),
        "metadata": normalized_metadata,
        "integration_connection": connection,
        "sync_status": (
            "ready"
            if integration.get("status") == "active"
            else (
                "reauthorize"
                if integration.get("status") == "reauth_required"
                else "unavailable"
            )
        ),
        "can_sync": integration.get("status") == "active",
        "requires_reauthorization": (
            integration.get("status") == "reauth_required"
        ),
        "status_reason": integration.get("last_error_message"),
    }
