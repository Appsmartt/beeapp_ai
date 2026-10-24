from __future__ import annotations
from apps.notifications.services.notification_service import database



from typing import Any

from apps.notifications.exceptions import (
    NotificationLookupError,
    NotificationUpdateError,
)
from apps.notifications.services.notification_service.database import (
    NOTIFICATION_COLUMNS,
    get_supabase,
)


def hide_protected_chat_notification_previews(
    *,
    supabase,
    recipient_id: str,
    notifications: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    chat_rows = [
        row for row in notifications
        if row.get("module") == "chat"
    ]
    if not chat_rows:
        return notifications

    protected_ids: set[str] = set()
    offset = 0
    page_size = 500

    while True:
        response = (
            supabase.table("chat_pin_protections")
            .select("conversation_id")
            .eq("user_id", recipient_id)
            .order("conversation_id")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = response.data or []
        protected_ids.update(
            str(row["conversation_id"]) for row in rows
        )

        if len(rows) < page_size:
            break

        offset += page_size

    safe_rows = []
    for row in notifications:
        if row.get("module") != "chat":
            safe_rows.append(row)
            continue

        metadata = row.get("metadata")
        metadata = metadata if isinstance(metadata, dict) else {}
        conversation_id = str(
            metadata.get("conversation_id") or ""
        ).strip()

        if conversation_id and conversation_id not in protected_ids:
            safe_rows.append(row)
            continue

        safe_rows.append(
            {
                **row,
                "title": "Nuevo mensaje",
                "body": "Tienes un mensaje en un chat protegido.",
                "metadata": (
                    {"conversation_id": conversation_id}
                    if conversation_id
                    else {}
                ),
            }
        )

    return safe_rows


def list_notifications(
    *,
    recipient_id: str,
    module: str | None = None,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    try:
        supabase = database.get_supabase()
        query = (
            supabase.table("notifications")
            .select(NOTIFICATION_COLUMNS, count="exact")
            .eq("recipient_id", recipient_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if module:
            query = query.eq("module", module)

        if unread_only:
            query = query.is_("read_at", "null")

        response = query.execute()
        notifications = hide_protected_chat_notification_previews(
            supabase=supabase,
            recipient_id=recipient_id,
            notifications=response.data or [],
        )
        return {
            "notifications": notifications,
            "count": response.count or 0,
            "limit": limit,
            "offset": offset,
        }

    except Exception as error:
        raise NotificationLookupError(
            "Could not retrieve notifications."
        ) from error


def get_unread_notification_count(
    *,
    recipient_id: str,
    module: str | None = None,
) -> int:
    try:
        query = (
            database.get_supabase()
            .table("notifications")
            .select("id", count="exact")
            .eq("recipient_id", recipient_id)
            .is_("read_at", "null")
        )

        if module:
            query = query.eq("module", module)

        response = query.execute()
        return response.count or 0

    except Exception as error:
        raise NotificationLookupError(
            "Could not retrieve unread notification count."
        ) from error


def mark_notification_as_read(
    *,
    recipient_id: str,
    notification_id: str,
) -> dict[str, Any]:
    try:
        supabase = database.get_supabase()
        response = (
            supabase.table("notifications")
            .update({"read_at": "now()"})
            .eq("id", notification_id)
            .eq("recipient_id", recipient_id)
            .is_("read_at", "null")
            .execute()
        )

        if response.data:
            return hide_protected_chat_notification_previews(
                supabase=supabase,
                recipient_id=recipient_id,
                notifications=[response.data[0]],
            )[0]

        existing = (
            supabase.table("notifications")
            .select(NOTIFICATION_COLUMNS)
            .eq("id", notification_id)
            .eq("recipient_id", recipient_id)
            .maybe_single()
            .execute()
        )

        if not existing.data:
            raise NotificationUpdateError(
                "Notification was not found."
            )

        return hide_protected_chat_notification_previews(
            supabase=supabase,
            recipient_id=recipient_id,
            notifications=[existing.data],
        )[0]

    except NotificationUpdateError:
        raise

    except Exception as error:
        raise NotificationUpdateError(
            "Could not mark notification as read."
        ) from error


def mark_all_notifications_as_read(
    *,
    recipient_id: str,
    module: str | None = None,
) -> int:
    try:
        query = (
            database.get_supabase()
            .table("notifications")
            .update({"read_at": "now()"})
            .eq("recipient_id", recipient_id)
            .is_("read_at", "null")
        )

        if module:
            query = query.eq("module", module)

        response = query.execute()
        return len(response.data or [])

    except Exception as error:
        raise NotificationUpdateError(
            "Could not mark notifications as read."
        ) from error
