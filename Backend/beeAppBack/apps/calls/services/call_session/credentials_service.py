from __future__ import annotations

from typing import Any

from apps.calls.exceptions import CallError
from apps.calls.services.agora_token_service import (
    AgoraRtcToken,
    build_agora_rtc_token,
)
from apps.calls.services.call_session.repository_service import (
    extract_agora_uid,
    get_actor_participant,
)


def build_join_credentials(
    *,
    call_detail: dict[str, Any],
    actor_identity_id: str,
) -> dict[str, Any]:
    call = call_detail["call"]
    participant = get_actor_participant(
        call_detail=call_detail,
        actor_identity_id=actor_identity_id,
    )

    channel_name = str(
        call.get("agora_channel_name") or ""
    ).strip()

    if not channel_name:
        raise CallError("Call does not have an Agora channel.")

    agora_token: AgoraRtcToken = build_agora_rtc_token(
        channel_name=channel_name,
        agora_uid=extract_agora_uid(participant),
    )

    return {
        "call": call,
        "participant": participant,
        "can_end_call": bool(
            call_detail.get("can_end_call")
        ),
        "can_kick_participants": bool(
            call_detail.get("can_kick_participants")
        ),
        "participants": call_detail["participants"],
        "agora": {
            "app_id": agora_token.app_id,
            "channel_name": agora_token.channel_name,
            "uid": agora_token.agora_uid,
            "token": agora_token.token,
            "expires_at": agora_token.expires_at,
        },
    }
