from __future__ import annotations

from typing import Any


def unwrap_story_payload(
    row: dict[str, Any],
) -> dict[str, Any] | None:
    if not isinstance(row, dict):
        return None

    payload = row.get("story")

    if isinstance(payload, dict):
        return payload

    return row if row.get("id") else None


def extract_json_payload(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, dict):
        return data

    if isinstance(data, list):
        if not data:
            return None

        first = data[0]

        if isinstance(first, dict):
            payload = first.get("status_get_story")

            if isinstance(payload, dict):
                return payload

            return first

    return None


def extract_first_row(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return [
            row
            for row in data
            if isinstance(row, dict)
        ]

    if isinstance(data, dict):
        return [data]

    return []
