from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol


class MailProviderError(Exception):
    """Error returned by Gmail or Microsoft Graph."""


class ExternalMailProvider(Protocol):
    provider: str

    def list_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
    ) -> tuple[list[str], str | None]:
        """
        Return provider message IDs and the latest provider cursor.

        For Gmail the cursor is the latest historyId.
        For Microsoft this will later be a delta link.
        """

    def get_message(
        self,
        *,
        access_token: str,
        provider_message_id: str,
    ) -> dict[str, Any]:
        """
        Return a normalized message compatible with Mail services.
        """


def normalize_email_address(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized = value.strip().lower()

    if not normalized:
        return None

    return normalized[:320]


def normalize_text(
    value: Any,
    *,
    max_length: int,
    fallback: str | None = None,
) -> str | None:
    if value is None:
        return fallback

    normalized = str(value).strip()

    if not normalized:
        return fallback

    return normalized[:max_length]