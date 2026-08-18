from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)


def _supabase():
    return get_supabase_admin_client()


def create_reauthorization_notification(
    *,
    connection_id: str,
    user_id: str,
    provider: str,
) -> None:
    try:
        existing_response = (
            _supabase()
            .table("integration_notification_deliveries")
            .select("id,status")
            .eq("connection_id", connection_id)
            .eq("notification_kind", "reauth_required")
            .maybe_single()
            .execute()
        )

        existing_delivery = getattr(
            existing_response,
            "data",
            None,
        )

        if (
            existing_delivery
            and existing_delivery.get("status") == "sent"
        ):
            return

        notification_response = (
            _supabase()
            .table("notifications")
            .insert(
                {
                    "recipient_id": user_id,
                    "module": "integrations",
                    "type": "reauth_required",
                    "title": (
                        f"Reconecta tu cuenta de {provider.title()}"
                    ),
                    "body": (
                        "La autorización de esta integración "
                        "ya no es válida. Inicia sesión otra vez "
                        "para continuar usando sus permisos."
                    ),
                    "metadata": {
                        "connection_id": connection_id,
                        "provider": provider,
                        "action": "reauthorize_integration",
                    },
                }
            )
            .execute()
        )

        notification_data = getattr(
            notification_response,
            "data",
            None,
        )

        if isinstance(notification_data, list):
            notification = (
                notification_data[0]
                if notification_data
                else None
            )
        elif isinstance(notification_data, dict):
            notification = notification_data
        else:
            notification = None

        if not notification:
            return

        delivery_payload: dict[str, Any] = {
            "connection_id": connection_id,
            "notification_kind": "reauth_required",
            "status": "sent",
            "notification_id": notification["id"],
            "sent_at": notification["created_at"],
        }

        if existing_delivery:
            (
                _supabase()
                .table("integration_notification_deliveries")
                .update(delivery_payload)
                .eq("id", existing_delivery["id"])
                .execute()
            )
            return

        (
            _supabase()
            .table("integration_notification_deliveries")
            .insert(delivery_payload)
            .execute()
        )
    except Exception:
        return