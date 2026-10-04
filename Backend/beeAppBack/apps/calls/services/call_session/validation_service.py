from __future__ import annotations

import secrets
from typing import Any

from apps.calls.exceptions import (
    CallError,
    CallNotFoundError,
    CallValidationError,
)


GROUP_AGORA_UID_MIN = 10_000
GROUP_AGORA_UID_MAX = 2_000_000_000


def normalize_required_value(
    value: object,
    *,
    field_name: str,
) -> str:
    normalized_value = str(value or "").strip()

    if not normalized_value:
        raise CallValidationError(f"{field_name} is required.")

    return normalized_value


def normalize_call_type(value: object) -> str:
    normalized_value = str(value or "").strip().lower()

    if normalized_value not in {"voice", "video"}:
        raise CallValidationError(
            "Call type must be voice or video."
        )

    return normalized_value


def extract_rpc_row(data: Any) -> dict[str, Any]:
    if isinstance(data, list):
        if not data:
            raise CallNotFoundError(
                "Call resource was not found."
            )
        data = data[0]

    if not isinstance(data, dict):
        raise CallError("Unexpected response from call service.")

    return data


def new_agora_channel_name() -> str:
    return f"beeapp_{secrets.token_urlsafe(24)}"


def new_group_agora_uid() -> int:
    return (
        secrets.randbelow(
            GROUP_AGORA_UID_MAX - GROUP_AGORA_UID_MIN + 1
        )
        + GROUP_AGORA_UID_MIN
    )
