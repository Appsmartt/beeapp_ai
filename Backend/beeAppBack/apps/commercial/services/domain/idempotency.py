from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

from apps.commercial.exceptions import CommercialValidationError

from .constants import LIMITS


@dataclass(frozen=True)
class IdempotencyPayload:
    operation: str
    key: str
    fingerprint: str


def _canonical_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )


def build_idempotency_payload(*, operation: str, key: str, body: Any) -> IdempotencyPayload:
    normalized_operation = (operation or "").strip()
    normalized_key = (key or "").strip()

    if not normalized_operation:
        raise CommercialValidationError(
            code="idempotency_operation_required",
            message="An idempotency operation is required.",
        )

    if not normalized_key:
        raise CommercialValidationError(
            code="idempotency_key_required",
            message="An Idempotency-Key header is required.",
        )

    if len(normalized_key) > LIMITS.idempotency_key_max_length:
        raise CommercialValidationError(
            code="idempotency_key_too_long",
            message=(
                "Idempotency-Key exceeds "
                f"{LIMITS.idempotency_key_max_length} characters."
            ),
        )

    fingerprint = hashlib.sha256(
        f"{normalized_operation}:{_canonical_json(body)}".encode("utf-8")
    ).hexdigest()

    return IdempotencyPayload(
        operation=normalized_operation,
        key=normalized_key,
        fingerprint=fingerprint,
    )
