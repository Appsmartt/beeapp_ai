from __future__ import annotations

from typing import Any


def normalize_draft_recipients(
    recipients: list[dict[str, Any]] | None,
) -> list[dict[str, str | None]]:
    normalized: list[dict[str, str | None]] = []
    seen_emails: set[str] = set()

    for recipient in recipients or []:
        if not isinstance(recipient, dict):
            continue

        email = str(recipient.get("email") or "").strip().lower()

        if not email or email in seen_emails:
            continue

        display_name = str(
            recipient.get("display_name") or ""
        ).strip()

        normalized.append(
            {
                "email": email[:320],
                "display_name": display_name[:255] or None,
            }
        )
        seen_emails.add(email)

    return normalized


def get_google_draft_id(
    *,
    message: dict[str, Any],
) -> str | None:
    metadata = message.get("metadata")

    if not isinstance(metadata, dict):
        return None

    draft_id = str(
        metadata.get("gmail_draft_id") or ""
    ).strip()

    return draft_id or None
