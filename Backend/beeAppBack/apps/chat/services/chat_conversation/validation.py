from __future__ import annotations

from typing import Any


def _extract_rpc_uuid(
    value: Any,
    function_name: str,
) -> str | None:
    if isinstance(value, str):
        return value

    if isinstance(value, list):
        if not value:
            return None

        return _extract_rpc_uuid(
            value[0],
            function_name,
        )

    if isinstance(value, dict):
        return (
            value.get(function_name)
            or value.get("id")
            or value.get("value")
        )

    return None
