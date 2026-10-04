from __future__ import annotations

from apps.notifications.services.expo_push_service import (
    send_session_revoked_push_notifications,
)


def send_mobile_session_revoked_push(
    *,
    tokens: list[str],
    revoked_device_session_ids: list[str],
) -> None:
    normalized_tokens = list(
        dict.fromkeys(
            str(token).strip()
            for token in tokens
            if str(token).strip()
        )
    )
    normalized_session_ids = list(
        dict.fromkeys(
            str(device_session_id).strip()
            for device_session_id in revoked_device_session_ids
            if str(device_session_id).strip()
        )
    )

    if not normalized_tokens or not normalized_session_ids:
        return

    try:
        send_session_revoked_push_notifications(
            tokens=normalized_tokens,
            revoked_device_session_ids=normalized_session_ids,
        )
    except Exception:
        return
