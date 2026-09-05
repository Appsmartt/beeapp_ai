from __future__ import annotations

from typing import Any

from apps.commercial.exceptions import CommercialValidationError

from .constants import BEE_SERVICES_NOTIFICATION_MODULE, LIMITS


def build_notification_dedupe_key(
    *,
    entity_type: str,
    entity_id: str,
    event_type: str,
    recipient_profile_id: str,
) -> str:
    parts = (
        (entity_type or "").strip(),
        (entity_id or "").strip(),
        (event_type or "").strip(),
        (recipient_profile_id or "").strip(),
    )

    if not all(parts):
        raise CommercialValidationError(
            code="notification_dedupe_key_invalid",
            message="Entity, event type and recipient are required for notification deduplication.",
        )

    key = ":".join(parts)

    if len(key) > LIMITS.notification_dedupe_key_max_length:
        raise CommercialValidationError(
            code="notification_dedupe_key_too_long",
            message="Notification dedupe key is too long.",
        )

    return key


def build_beeservices_notification_payload(
    *,
    event_type: str,
    business_id: str,
    request_id: str | None = None,
    booking_id: str | None = None,
    payment_proof_id: str | None = None,
    dispute_id: str | None = None,
    conversation_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized_event_type = (event_type or "").strip()
    normalized_business_id = (business_id or "").strip()

    if not normalized_event_type:
        raise CommercialValidationError(
            code="notification_type_required",
            message="Notification type is required.",
        )

    if not normalized_business_id:
        raise CommercialValidationError(
            code="business_id_required",
            message="business_id is required.",
        )

    payload: dict[str, Any] = {
        "module": BEE_SERVICES_NOTIFICATION_MODULE,
        "type": normalized_event_type,
        "business_id": normalized_business_id,
    }

    optional_ids = {
        "request_id": request_id,
        "booking_id": booking_id,
        "payment_proof_id": payment_proof_id,
        "dispute_id": dispute_id,
        "conversation_id": conversation_id,
    }

    for key, value in optional_ids.items():
        if value is not None:
            normalized_value = str(value).strip()
            if normalized_value:
                payload[key] = normalized_value

    if extra:
        payload.update(extra)

    return payload
