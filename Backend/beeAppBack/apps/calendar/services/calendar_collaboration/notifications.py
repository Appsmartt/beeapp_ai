from __future__ import annotations

from typing import Any

from apps.notifications.services.notification_service import (
    create_calendar_notification,
)


def safe_calendar_notification(
    *,
    recipient_id: str,
    notification_type: str,
    title: str,
    body: str,
    metadata: dict[str, Any],
) -> None:
    try:
        create_calendar_notification(
            recipient_id=recipient_id,
            notification_type=notification_type,
            title=title,
            body=body,
            metadata=metadata,
        )
    except Exception:
        return
