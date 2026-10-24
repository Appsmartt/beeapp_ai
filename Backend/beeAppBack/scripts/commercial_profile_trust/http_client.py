from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any


JsonValue = dict[str, Any] | list[Any]


def request(
    method: str,
    url: str,
    payload: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, JsonValue]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request_headers = {"Content-Type": "application/json", **(headers or {})}
    http_request = urllib.request.Request(
        url,
        data=data,
        headers=request_headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(http_request, timeout=20) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        try:
            body = json.load(error)
        except (ValueError, UnicodeError):
            body = {}
        return error.code, body
