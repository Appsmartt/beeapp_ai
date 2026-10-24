from __future__ import annotations

from typing import Any

from .fixture_lifecycle import SAFE_PROTECTED_STATE, protected_state
from .profile_repository import (
    PROTECTED_FIELDS,
    list_owner_profiles,
    profile_url,
    update_profile,
)
from .http_client import request
from .runtime_config import RuntimeConfig


PROTECTED_ATTEMPTS = (
    ("verification_status", "verified"),
    ("verification_badge_visible", True),
    ("suspended_at", "2026-10-01T12:00:00Z"),
    ("suspension_reason", "S8 rejected test"),
)
PROTECTED_ERROR_CODE = "42501"
PROTECTED_ERROR_MESSAGE = (
    "Commercial profile verification and suspension fields are protected"
)


def baseline_for(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(row["id"]): protected_state(row) for row in rows}


def protected_rejection_confirmed(status: int, body: Any) -> bool:
    return (
        status in (400, 403)
        and isinstance(body, dict)
        and body.get("code") == PROTECTED_ERROR_CODE
        and PROTECTED_ERROR_MESSAGE in str(body.get("message", ""))
    )


def assert_ordinary_update(
    config: RuntimeConfig,
    token: str,
    owner_id: str,
    profile: dict[str, Any],
) -> None:
    value = profile.get("is_available")
    if not isinstance(value, bool):
        raise RuntimeError("Ordinary update requires a boolean is_available.")
    status, rows = update_profile(
        config,
        token,
        str(profile["id"]),
        owner_id,
        {"is_available": value},
        (
            "id",
            "is_available",
            *PROTECTED_FIELDS,
        ),
    )
    if (
        status != 200
        or not isinstance(rows, list)
        or len(rows) != 1
        or rows[0].get("is_available") is not value
    ):
        raise RuntimeError("Ordinary update regression failed.")


def run_owner_protected_cycles(
    config: RuntimeConfig,
    token: str,
    owner_id: str,
    baseline: dict[str, dict[str, Any]],
    lines: list[str],
    label: str,
) -> int:
    rejected = 0
    for cycle in range(1, 6):
        for profile_id in baseline:
            for field, value in PROTECTED_ATTEMPTS:
                status, body = update_profile(
                    config,
                    token,
                    profile_id,
                    owner_id,
                    {field: value},
                    ("id", *PROTECTED_FIELDS),
                )
                if not protected_rejection_confirmed(status, body):
                    raise RuntimeError(
                        f"{label} protected rejection failed for {field}."
                    )
                rejected += 1
        status, rows = list_owner_profiles(config, token, owner_id)
        if status != 200 or not isinstance(rows, list):
            raise RuntimeError(f"{label} post-cycle read failed.")
        if baseline_for(rows) != baseline:
            raise RuntimeError(f"{label} protected values changed.")
        lines.append(
            f"{label} cycle {cycle}/5: protected fields unchanged"
        )
    return rejected


def run_fixture_protected_cycles(
    config: RuntimeConfig,
    token: str,
    owner_id: str,
    fixture_id: str,
    lines: list[str],
) -> int:
    rejected = 0
    for cycle in range(1, 6):
        for field, value in PROTECTED_ATTEMPTS:
            status, body = update_profile(
                config,
                token,
                fixture_id,
                owner_id,
                {field: value},
                ("id", *PROTECTED_FIELDS),
            )
            if not protected_rejection_confirmed(status, body):
                raise RuntimeError(
                    f"Fixture owner protected rejection failed for {field}."
                )
            rejected += 1
        status, rows = request(
            "GET",
            profile_url(
                config,
                {
                    "id": f"eq.{fixture_id}",
                    "owner_id": f"eq.{owner_id}",
                },
                ("id", *PROTECTED_FIELDS),
            ),
            headers={
                "apikey": config.anon_key,
                "Authorization": f"Bearer {token}",
                "Prefer": "return=representation",
            },
        )
        if (
            status != 200
            or not isinstance(rows, list)
            or len(rows) != 1
            or protected_state(rows[0]) != SAFE_PROTECTED_STATE
        ):
            raise RuntimeError("Fixture changed after protected-field attacks.")
        lines.append(f"Fixture B cycle {cycle}/5: 4 rejections confirmed")
    return rejected


def assert_cross_account_isolation(
    config: RuntimeConfig,
    first_token: str,
    first_profile_id: str,
    second_token: str,
    fixture_id: str,
    lines: list[str],
) -> None:
    second_status, second_body = update_profile(
        config,
        second_token,
        first_profile_id,
        None,
        {"verification_badge_visible": True},
        ("id",),
    )
    if second_status not in (200, 204) or second_body not in ([], {}):
        raise RuntimeError("Account B modified account A profile.")
    first_status, first_body = update_profile(
        config,
        first_token,
        fixture_id,
        None,
        {"verification_badge_visible": True},
        ("id",),
    )
    if first_status not in (200, 204) or first_body not in ([], {}):
        raise RuntimeError("Account A modified account B profile.")
    lines.append("Cross-account A-to-B and B-to-A isolation: zero rows")
