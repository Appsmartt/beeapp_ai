from __future__ import annotations

from typing import Any
from uuid import UUID

from rest_framework import serializers


CALENDAR_COLORS = (
    "#6025D2",
    "#2563EB",
    "#0891B2",
    "#059669",
    "#65A30D",
    "#CA8A04",
    "#EA580C",
    "#DC2626",
    "#DB2777",
    "#9333EA",
    "#475569",
)

EVENT_KINDS = (
    "virtual",
    "in_person",
    "hybrid",
)

EVENT_SOURCES = (
    "beeapp",
    "google",
    "microsoft",
    "detached",
)

RECURRENCE_FREQUENCIES = (
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "custom",
)

REMINDER_CHANNELS = (
    "push",
    "in_app",
)

CALENDAR_VIEWS = (
    "day",
    "week",
    "month",
    "agenda",
)
