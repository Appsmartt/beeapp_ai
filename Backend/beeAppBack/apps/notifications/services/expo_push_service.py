from __future__ import annotations

from typing import Any

import httpx


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_expo_push_notifications(
    *,
    tokens: list[str],
    title: str,
    body: str,
    data: dict[str, Any],
    channel_id: str | None = None,
) -> dict[str, Any]:
    if not tokens:
        return {
            "sent_tokens": [],
            "failed_tokens": {},
        }

    normalized_channel_id = str(
        channel_id or ""
    ).strip() or None

    messages = [
        {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data,
            "priority": "high",
            **(
                {
                    "channelId": normalized_channel_id,
                }
                if normalized_channel_id
                else {}
            ),
        }
        for token in tokens
    ]

    try:
        response = httpx.post(
            EXPO_PUSH_URL,
            json=messages,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Accept-Encoding": "gzip, deflate",
            },
            timeout=10.0,
        )
        response.raise_for_status()

        payload = response.json()
        results = payload.get("data", [])

        sent_tokens: list[str] = []
        failed_tokens: dict[str, str] = {}

        for token, result in zip(tokens, results):
            if result.get("status") == "ok":
                sent_tokens.append(token)
            else:
                failed_tokens[token] = (
                    result.get("message")
                    or result.get("details", {}).get("error")
                    or "Expo push notification failed."
                )

        return {
            "sent_tokens": sent_tokens,
            "failed_tokens": failed_tokens,
        }

    except Exception as error:
        return {
            "sent_tokens": [],
            "failed_tokens": {
                token: str(error)
                for token in tokens
            },
        }