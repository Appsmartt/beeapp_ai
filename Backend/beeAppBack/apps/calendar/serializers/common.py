from __future__ import annotations

from typing import Any
from uuid import UUID

from rest_framework import serializers


class UUIDListField(serializers.ListField):
    child = serializers.UUIDField()

    def __init__(self, **kwargs):
        kwargs.setdefault("required", False)
        kwargs.setdefault("allow_empty", True)
        super().__init__(**kwargs)

    def to_internal_value(
        self,
        data: Any,
    ) -> list[UUID]:
        values = super().to_internal_value(data)
        normalized_values: list[UUID] = []
        seen_values: set[str] = set()

        for value in values:
            normalized_value = str(value)

            if normalized_value in seen_values:
                continue

            seen_values.add(normalized_value)
            normalized_values.append(value)

        return normalized_values
