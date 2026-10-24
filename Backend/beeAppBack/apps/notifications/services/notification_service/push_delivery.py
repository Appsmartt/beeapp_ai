from __future__ import annotations
from apps.notifications.services.notification_service import database



from typing import Any

from apps.notifications.services.expo_push_service import (
    send_expo_push_notifications,
)


def send_module_push(
    *,
    recipient_id: str,
    notification: dict[str, Any],
) -> None:
    try:
        supabase = database.get_supabase()

        devices_response = (
            supabase.table("push_devices")
            .select("id,expo_push_token")
            .eq("user_id", recipient_id)
            .eq("is_active", True)
            .execute()
        )

        tokens = [
            device["expo_push_token"]
            for device in (devices_response.data or [])
        ]

        if not tokens:
            return

        notification_module = str(
            notification.get("module") or ""
        ).strip()
        notification_type = str(
            notification.get("type") or ""
        ).strip()

        channel_id = (
            "incoming-calls"
            if (
                notification_module == "calls"
                and notification_type == "incoming_call"
            )
            else None
        )

        result = send_expo_push_notifications(
            tokens=tokens,
            title=notification["title"],
            body=notification["body"],
            data={
                "notification_id": notification["id"],
                "module": notification_module,
                "type": notification_type,
                **(notification.get("metadata") or {}),
            },
            channel_id=channel_id,
        )

        if result["sent_tokens"]:
            (
                supabase.table("notifications")
                .update(
                    {
                        "push_sent_at": "now()",
                        "push_error": None,
                    }
                )
                .eq("id", notification["id"])
                .execute()
            )

        for failed_token, error_message in (
            result["failed_tokens"].items()
        ):
            (
                supabase.table("push_devices")
                .update(
                    {
                        "is_active": False,
                        "last_seen_at": "now()",
                    }
                )
                .eq("expo_push_token", failed_token)
                .execute()
            )

            (
                supabase.table("notifications")
                .update(
                    {
                        "push_error": error_message,
                    }
                )
                .eq("id", notification["id"])
                .execute()
            )

    except Exception:
        return
