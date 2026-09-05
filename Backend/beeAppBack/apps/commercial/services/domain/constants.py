from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CommercePlatformLimits:
    request_expiration_business_days: int = 2
    booking_hold_min_minutes: int = 5
    booking_hold_max_minutes: int = 240
    inventory_hold_min_minutes: int = 5
    inventory_hold_max_minutes: int = 240
    idempotency_key_max_length: int = 200
    notification_dedupe_key_max_length: int = 300


LIMITS = CommercePlatformLimits()

BEE_SERVICES_NOTIFICATION_MODULE = "beeservices"

COMMERCIAL_REQUEST_ACTIVE_STATUSES = frozenset(
    {
        "submitted",
        "under_review",
        "proposal_sent",
        "accepted",
        "payment_pending",
        "payment_submitted",
        "confirmed",
    }
)

COMMERCIAL_REQUEST_TERMINAL_STATUSES = frozenset(
    {
        "completed",
        "rejected",
        "cancelled",
        "expired",
        "disputed",
    }
)

COMMERCIAL_RESERVATION_ACTIVE_STATUSES = frozenset(
    {
        "proposed",
        "hold",
        "payment_pending",
        "confirmed",
    }
)

COMMERCIAL_RESERVATION_TERMINAL_STATUSES = frozenset(
    {
        "completed",
        "cancelled",
        "rejected",
        "expired",
        "no_show",
    }
)
