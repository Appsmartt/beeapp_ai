from __future__ import annotations

import logging
from typing import Any

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.commercial.exceptions import (
    CommercialOperationError,
    CommercialValidationError,
)
from apps.notifications.services.notification_service import (
    create_module_notification,
)

logger = logging.getLogger(__name__)

DEFAULT_COMMERCE_NOTIFICATION_BATCH_SIZE = 50
MAX_COMMERCE_NOTIFICATION_BATCH_SIZE = 500
COMMERCE_NOTIFICATION_MODULE = "beeservices"


def _validate_limit(limit: int) -> int:
    if not isinstance(limit, int) or isinstance(limit, bool):
        raise CommercialValidationError(
            "Notification limit must be an integer.",
            code="COMMERCIAL_NOTIFICATION_LIMIT_INVALID",
        )

    if limit < 1 or limit > MAX_COMMERCE_NOTIFICATION_BATCH_SIZE:
        raise CommercialValidationError(
            (
                "Notification limit must be between 1 and "
                f"{MAX_COMMERCE_NOTIFICATION_BATCH_SIZE}."
            ),
            code="COMMERCIAL_NOTIFICATION_LIMIT_INVALID",
        )

    return limit


def _response_rows(response: Any) -> list[dict[str, Any]]:
    data = getattr(response, "data", None)

    if data is None:
        return []

    if isinstance(data, list):
        return [
            row
            for row in data
            if isinstance(row, dict)
        ]

    if isinstance(data, dict):
        return [data]

    return []


def _normalized_text(value: Any) -> str:
    return str(value or "").strip()


def _notification_content(
    *,
    event_type: str,
    payload: dict[str, Any],
) -> tuple[str, str]:
    business_id = _normalized_text(payload.get("business_id"))
    request_id = _normalized_text(payload.get("request_id"))

    if event_type == "request_submitted":
        return (
            "Nueva solicitud comercial",
            "Recibiste una nueva solicitud en tu negocio.",
        )

    if event_type == "request_accepted":
        return (
            "Solicitud aceptada",
            "Tu solicitud comercial fue aceptada.",
        )

    if event_type == "proposal_received":
        return (
            "Nueva propuesta comercial",
            "Recibiste una propuesta para tu solicitud.",
        )

    if event_type == "counter_offer_received":
        return (
            "Nueva contraoferta comercial",
            "Recibiste una contraoferta para tu solicitud.",
        )

    if request_id:
        return (
            "Actualización comercial",
            f"Tu solicitud comercial {request_id} tiene una actualización.",
        )

    if business_id:
        return (
            "Actualización comercial",
            "Tienes una nueva actualización comercial.",
        )

    return (
        "Actualización comercial",
        "Tienes una nueva actualización en BuddyServices.",
    )


def _find_existing_notification(
    *,
    recipient_profile_id: str,
    dedupe_key: str,
) -> dict[str, Any] | None:
    response = (
        get_supabase_admin_client()
        .table("notifications")
        .select("id,push_sent_at,push_error")
        .eq("recipient_id", recipient_profile_id)
        .eq("module", COMMERCE_NOTIFICATION_MODULE)
        .contains("metadata", {"idempotency_key": dedupe_key})
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )

    rows = _response_rows(response)
    return rows[0] if rows else None


def _update_delivery(
    *,
    delivery_id: str,
    status: str,
    notification_id: str | None,
    push_sent_at: Any = None,
    error_code: str | None = None,
    error_message: str | None = None,
) -> None:
    values: dict[str, Any] = {
        "status": status,
        "notification_id": notification_id,
        "push_sent_at": push_sent_at,
        "error_code": error_code,
        "error_message": error_message,
    }

    (
        get_supabase_admin_client()
        .table("commerce_notification_deliveries")
        .update(values)
        .eq("id", delivery_id)
        .eq("status", "pending")
        .execute()
    )


def _process_delivery(
    delivery: dict[str, Any],
) -> dict[str, Any]:
    delivery_id = _normalized_text(delivery.get("id"))
    recipient_profile_id = _normalized_text(
        delivery.get("recipient_profile_id")
    )
    dedupe_key = _normalized_text(delivery.get("dedupe_key"))
    event_type = _normalized_text(delivery.get("event_type"))
    payload = delivery.get("payload") or {}

    if not delivery_id:
        raise CommercialOperationError(
            "Commercial notification delivery id is required.",
            code="COMMERCIAL_NOTIFICATION_DELIVERY_INVALID",
        )

    if not recipient_profile_id or not dedupe_key or not event_type:
        raise CommercialValidationError(
            "Commercial notification delivery is missing required data.",
            code="COMMERCIAL_NOTIFICATION_DELIVERY_INVALID",
        )

    if not isinstance(payload, dict):
        raise CommercialValidationError(
            "Commercial notification payload must be an object.",
            code="COMMERCIAL_NOTIFICATION_PAYLOAD_INVALID",
        )

    existing_notification = _find_existing_notification(
        recipient_profile_id=recipient_profile_id,
        dedupe_key=dedupe_key,
    )

    reused_existing_notification = existing_notification is not None

    if existing_notification is None:
        title, body = _notification_content(
            event_type=event_type,
            payload=payload,
        )

        notification = create_module_notification(
            recipient_id=recipient_profile_id,
            module=COMMERCE_NOTIFICATION_MODULE,
            notification_type=event_type,
            title=title,
            body=body,
            metadata={
                **payload,
                "idempotency_key": dedupe_key,
                "commerce_delivery_id": delivery_id,
            },
            send_push=False,
        )
    else:
        notification = existing_notification

    notification_id = _normalized_text(notification.get("id"))
    if not notification_id:
        raise CommercialOperationError(
            "Commercial notification creation returned no id.",
            code="COMMERCIAL_NOTIFICATION_RESPONSE_INVALID",
        )

    push_sent_at = notification.get("push_sent_at")

    _update_delivery(
        delivery_id=delivery_id,
        status="sent" if push_sent_at else "created",
        notification_id=notification_id,
        push_sent_at=push_sent_at,
    )

    return {
        "delivery_id": delivery_id,
        "notification_id": notification_id,
        "status": "sent" if push_sent_at else "created",
        "event_type": event_type,
        "reused_existing_notification": reused_existing_notification,
    }


def process_commercial_notifications(
    *,
    limit: int = DEFAULT_COMMERCE_NOTIFICATION_BATCH_SIZE,
) -> dict[str, Any]:
    validated_limit = _validate_limit(limit)

    try:
        response = (
            get_supabase_admin_client()
            .table("commerce_notification_deliveries")
            .select(
                "id,recipient_profile_id,dedupe_key,event_type,payload"
            )
            .eq("status", "pending")
            .order("created_at", desc=False)
            .limit(validated_limit)
            .execute()
        )
        deliveries = _response_rows(response)

    except Exception as error:
        logger.exception(
            "Could not load pending commercial notifications: %s",
            str(error),
        )
        raise CommercialOperationError(
            "Could not load pending commercial notifications.",
            code="COMMERCIAL_NOTIFICATION_LOAD_FAILED",
        ) from error

    created_count = 0
    sent_count = 0
    failed_count = 0
    reused_count = 0
    results: list[dict[str, Any]] = []

    for delivery in deliveries:
        delivery_id = _normalized_text(delivery.get("id"))

        try:
            result = _process_delivery(delivery)
            results.append(result)

            if result["status"] == "sent":
                sent_count += 1
            else:
                created_count += 1

            if result["reused_existing_notification"]:
                reused_count += 1

        except Exception as error:
            logger.exception(
                "Commercial notification delivery failed: %s",
                delivery_id,
            )

            error_code = getattr(
                error,
                "code",
                "COMMERCIAL_NOTIFICATION_PROCESSING_FAILED",
            )
            error_message = str(error)[:2000]

            try:
                _update_delivery(
                    delivery_id=delivery_id,
                    status="failed",
                    notification_id=None,
                    error_code=error_code,
                    error_message=error_message,
                )
            except Exception:
                logger.exception(
                    "Could not store commercial notification failure: %s",
                    delivery_id,
                )

            failed_count += 1
            results.append(
                {
                    "delivery_id": delivery_id,
                    "status": "failed",
                    "error_code": error_code,
                    "error_message": error_message,
                }
            )

    return {
        "loaded_count": len(deliveries),
        "created_count": created_count,
        "sent_count": sent_count,
        "failed_count": failed_count,
        "reused_existing_notification_count": reused_count,
        "results": results,
    }
