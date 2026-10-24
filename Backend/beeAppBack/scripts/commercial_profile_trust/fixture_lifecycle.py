from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .http_client import request
from .profile_repository import (
    PROTECTED_FIELDS,
    auth_headers,
    create_profile,
    delete_profile,
    profile_url,
)
from .runtime_config import RuntimeConfig


SAFE_PROTECTED_STATE = {
    "verification_status": "not_requested",
    "verification_badge_visible": False,
    "suspended_at": None,
    "suspension_reason": None,
}


@dataclass(frozen=True)
class FixtureCreation:
    fixture_id: str
    row: dict[str, Any]
    protected_state_is_safe: bool


def protected_state(row: dict[str, Any]) -> dict[str, Any]:
    return {field: row.get(field) for field in PROTECTED_FIELDS}


def create_malicious_fixture(
    config: RuntimeConfig,
    token: str,
    owner_id: str,
    offer_type: Any,
    country_code: Any,
) -> FixtureCreation:
    status, rows = create_profile(
        config,
        token,
        {
            "owner_id": str(owner_id),
            "offer_type": offer_type,
            "custom_activity_text": "S8 temporary security test",
            "display_name": "S8 Temporary Security Fixture",
            "description": "Disposable commercial profile for S8 testing.",
            "country_code": country_code,
            "city": "Bogota",
            "publication_status": "paused",
            "is_public": False,
            "is_available": False,
            "verification_status": "verified",
            "verification_badge_visible": True,
            "suspended_at": "2026-10-01T12:00:00Z",
            "suspension_reason": "attempted override",
        },
    )
    if (
        status != 201
        or not isinstance(rows, list)
        or len(rows) != 1
        or str(rows[0].get("owner_id")) != str(owner_id)
    ):
        raise RuntimeError("Fixture B creation was not confirmed.")
    fixture_id = str(rows[0].get("id") or "")
    if not fixture_id:
        raise RuntimeError("Fixture B did not return an identifier.")
    return FixtureCreation(
        fixture_id=fixture_id,
        row=rows[0],
        protected_state_is_safe=(
            protected_state(rows[0]) == SAFE_PROTECTED_STATE
        ),
    )


def assert_fixture_safe(creation: FixtureCreation) -> None:
    if not creation.protected_state_is_safe:
        raise RuntimeError("INSERT did not normalize protected values.")


def delete_fixture_or_raise(
    config: RuntimeConfig,
    token: str,
    fixture_id: str,
    owner_id: str,
) -> None:
    status, rows = delete_profile(config, token, fixture_id, owner_id)
    read_status, remaining_rows = request(
        "GET",
        profile_url(
            config,
            {
                "id": f"eq.{fixture_id}",
                "owner_id": f"eq.{owner_id}",
            },
            ("id",),
        ),
        headers=auth_headers(config, token),
    )
    if (
        status != 200
        or not isinstance(rows, list)
        or len(rows) != 1
        or str(rows[0].get("id")) != fixture_id
        or read_status != 200
        or remaining_rows != []
    ):
        raise RuntimeError("Fixture B deletion was not confirmed.")
