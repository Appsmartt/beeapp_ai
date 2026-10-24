from __future__ import annotations

import re
from typing import Any


def phone_matches_suffix(
    value: Any,
    query_digits: str,
) -> bool:
    candidate_digits = re.sub(
        r"\D",
        "",
        str(value or ""),
    )

    return query_digits in candidate_digits


def commercial_phone_digits(
    commercial_profile: dict[str, Any],
) -> str:
    return "".join(
        re.findall(
            r"\d+",
            (
                f"{commercial_profile.get('phone_dial_code') or ''}"
                f"{commercial_profile.get('phone_number') or ''}"
            ),
        )
    )


def matches_text(
    value: Any,
    query: str,
) -> bool:
    return query in str(value or "").casefold()


def private_display_name(
    profile: dict[str, Any],
) -> str:
    first_name = str(profile.get("first_name") or "").strip()
    last_name = str(profile.get("last_name") or "").strip()

    return " ".join(
        value
        for value in (first_name, last_name)
        if value
    ) or "Usuario"


def private_match_rank(
    *,
    profile: dict[str, Any],
    query: str,
    phone_digits: str | None,
) -> int:
    email = str(profile.get("email") or "").casefold()
    display_name = private_display_name(profile).casefold()

    if phone_digits and phone_matches_suffix(
        profile.get("normalized_phone"),
        phone_digits,
    ):
        return 0

    if email == query:
        return 1

    if email.startswith(query):
        return 2

    if display_name.startswith(query):
        return 3

    return 8


def commercial_match_rank(
    *,
    commercial_profile: dict[str, Any],
    query: str,
    phone_digits: str | None,
) -> int:
    email = str(
        commercial_profile.get("public_email") or ""
    ).casefold()
    display_name = str(
        commercial_profile.get("display_name") or ""
    ).casefold()

    if (
        commercial_profile.get("is_phone_public")
        and phone_digits
        and phone_matches_suffix(
            commercial_phone_digits(commercial_profile),
            phone_digits,
        )
    ):
        return 0

    if (
        commercial_profile.get("is_email_public")
        and email == query
    ):
        return 1

    if (
        commercial_profile.get("is_email_public")
        and email.startswith(query)
    ):
        return 2

    if display_name.startswith(query):
        return 3

    return 8


def deduplicate_and_sort_results(
    *,
    results: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    results_by_identity_id: dict[str, dict[str, Any]] = {}

    for result in results:
        identity_id = result["identity_id"]
        existing_result = results_by_identity_id.get(identity_id)

        if (
            existing_result is None
            or result["match_rank"]
            < existing_result["match_rank"]
        ):
            results_by_identity_id[identity_id] = result

    sorted_results = sorted(
        results_by_identity_id.values(),
        key=lambda result: (
            result["match_rank"],
            result["display_name"].casefold(),
            result["identity_id"],
        ),
    )

    return [
        {
            key: value
            for key, value in result.items()
            if key != "match_rank"
        }
        for result in sorted_results
    ]
