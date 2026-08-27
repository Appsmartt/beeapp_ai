from __future__ import annotations

import time
from dataclasses import dataclass

from django.conf import settings

from apps.calls.exceptions import CallTokenError


@dataclass(frozen=True)
class AgoraRtcToken:
    app_id: str
    channel_name: str
    agora_uid: int
    token: str
    expires_at: int


def build_agora_rtc_token(
    *,
    channel_name: str,
    agora_uid: int,
    expires_in_seconds: int | None = None,
) -> AgoraRtcToken:
    normalized_channel_name = str(channel_name or "").strip()

    if not normalized_channel_name:
        raise CallTokenError(
            "Agora channel name is required."
        )

    if not isinstance(agora_uid, int) or agora_uid <= 0:
        raise CallTokenError(
            "Agora UID must be a positive integer."
        )

    ttl_seconds = (
        int(expires_in_seconds)
        if expires_in_seconds is not None
        else int(settings.AGORA_RTC_TOKEN_TTL_SECONDS)
    )

    if ttl_seconds < 60 or ttl_seconds > 86_400:
        raise CallTokenError(
            "Agora token TTL must be between 60 and 86400 seconds."
        )

    expires_at = int(time.time()) + ttl_seconds

    try:
        from agora_token_builder.RtcTokenBuilder import (
            Role_Publisher,
            RtcTokenBuilder,
        )

        token = RtcTokenBuilder.buildTokenWithUid(
            settings.AGORA_APP_ID,
            settings.AGORA_APP_CERTIFICATE,
            normalized_channel_name,
            agora_uid,
            Role_Publisher,
            expires_at,
        )
    except Exception as error:
        raise CallTokenError(
            "Could not generate Agora RTC token."
        ) from error

    if not token:
        raise CallTokenError(
            "Agora did not return a token."
        )

    return AgoraRtcToken(
        app_id=settings.AGORA_APP_ID,
        channel_name=normalized_channel_name,
        agora_uid=agora_uid,
        token=token,
        expires_at=expires_at,
    )
