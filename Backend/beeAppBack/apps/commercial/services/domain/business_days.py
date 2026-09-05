from __future__ import annotations

from datetime import datetime, timedelta

from .constants import LIMITS


def add_business_days(start: datetime, business_days: int = LIMITS.request_expiration_business_days) -> datetime:
    if start.tzinfo is None:
        raise ValueError("start must be timezone-aware")
    if business_days < 0:
        raise ValueError("business_days must be non-negative")

    current = start
    remaining = business_days

    while remaining:
        current += timedelta(days=1)
        if current.weekday() < 5:
            remaining -= 1

    return current


def request_expires_at(created_at: datetime) -> datetime:
    return add_business_days(created_at)
