from __future__ import annotations

import re

from apps.chat.exceptions import ChatRecipientNotFoundError
from apps.chat.services.recipient_search.constants import (
    PHONE_SUFFIX_MIN_LENGTH,
    POSTGREST_SEARCH_ALLOWED_PUNCTUATION,
)


def validate_postgrest_search_value(value: str) -> str:
    normalized_value = str(value or "").strip()

    if any(
        not (
            character.isalnum()
            or character == " "
            or character in POSTGREST_SEARCH_ALLOWED_PUNCTUATION
        )
        for character in normalized_value
    ):
        raise ChatRecipientNotFoundError(
            "Search query contains unsupported characters."
        )

    return normalized_value


def build_postgrest_ilike_or_filter(
    *,
    columns: tuple[str, ...],
    value: str,
) -> str:
    safe_value = validate_postgrest_search_value(value)
    literal_value = safe_value.replace("%", "\\%").replace("_", "\\_")
    pattern = f"%{literal_value}%"

    return ",".join(
        f"{column}.ilike.{pattern}"
        for column in columns
    )


def normalize_query(value: str) -> str:
    return str(value or "").strip().lower()


def normalize_phone_digits(value: str) -> str | None:
    digits = re.sub(r"\D", "", value)

    if len(digits) < PHONE_SUFFIX_MIN_LENGTH:
        return None

    return digits
