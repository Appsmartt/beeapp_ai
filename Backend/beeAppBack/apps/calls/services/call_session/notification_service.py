from __future__ import annotations

import logging
from typing import Any

from apps.calls.services.call_session.identity_service import (
    get_chat_identity_owner_id,
)
from apps.chat.services.chat_identity_service import (
    get_chat_identity,
)
from apps.notifications.services.notification_service import (
    create_incoming_call_notification,
)


logger = logging.getLogger(__name__)


def send_incoming_direct_call_notification(
    *,
    call_detail: dict[str, Any],
    actor_identity_id: str,
) -> None:
    try:
        call = call_detail.get("call") or {}

        if (
            str(call.get("conversation_type") or "").strip().lower()
            != "direct"
        ):
            return

        if (
            str(call.get("status") or "").strip().lower()
            != "ringing"
        ):
            return

        call_id = str(call.get("id") or "").strip()
        conversation_id = str(
            call.get("conversation_id") or ""
        ).strip()
        call_type = str(call.get("call_type") or "").strip().lower()

        if not call_id or not conversation_id:
            return

        participant_identity_ids = [
            str(participant.get("identity_id") or "").strip()
            for participant in call_detail.get("participants") or []
            if isinstance(participant, dict)
        ]
        recipient_identity_ids = [
            identity_id
            for identity_id in participant_identity_ids
            if identity_id and identity_id != actor_identity_id
        ]

        if len(recipient_identity_ids) != 1:
            return

        caller = get_chat_identity(
            identity_id=actor_identity_id,
            require_active=True,
        )
        recipient_user_id = get_chat_identity_owner_id(
            identity_id=recipient_identity_ids[0],
        )

        if not recipient_user_id:
            logger.warning(
                "Incoming call push skipped: recipient owner was not found. "
                "call_id=%s recipient_identity_id=%s",
                call_id,
                recipient_identity_ids[0],
            )
            return

        create_incoming_call_notification(
            recipient_id=recipient_user_id,
            call_id=call_id,
            conversation_id=conversation_id,
            call_type=call_type,
            caller_identity_id=actor_identity_id,
            caller_name=str(
                caller.get("display_name") or ""
            ).strip(),
        )
    except Exception:
        logger.exception(
            "Incoming call notification failed. "
            "actor_identity_id=%s",
            actor_identity_id,
        )
