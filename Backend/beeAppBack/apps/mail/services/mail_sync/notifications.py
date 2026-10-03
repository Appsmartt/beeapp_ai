from __future__ import annotations

from typing import Any

from apps.notifications.services.notification_service import (
    create_mail_message_received_notification,
)


def get_sender(
    *,
    provider_message: dict[str, Any],
) -> tuple[str | None, str | None]:
    recipients = provider_message.get("recipients")

    if not isinstance(recipients, dict):
        return None, None

    from_recipients = recipients.get("from")

    if not isinstance(from_recipients, list):
        return None, None

    for recipient in from_recipients:
        if not isinstance(recipient, dict):
            continue

        sender_email = str(
            recipient.get("email") or ""
        ).strip() or None
        sender_name = str(
            recipient.get("display_name") or ""
        ).strip() or None

        if sender_name or sender_email:
            return sender_name, sender_email

    return None, None


def is_notifiable_incoming_message(
    *,
    provider_message: dict[str, Any],
) -> bool:
    return (
        str(provider_message.get("direction") or "")
        .strip()
        .lower()
        == "inbound"
        and str(provider_message.get("folder") or "")
        .strip()
        .lower()
        == "inbox"
        and not bool(provider_message.get("is_spam"))
        and not bool(provider_message.get("is_trashed"))
    )


def create_new_mail_notification(
    *,
    user_id: str,
    integration: dict[str, Any],
    message_id: str,
    provider_message: dict[str, Any],
    initial_sync: bool,
) -> None:
    if initial_sync or not is_notifiable_incoming_message(
        provider_message=provider_message,
    ):
        return

    sender_name, sender_email = get_sender(
        provider_message=provider_message,
    )

    create_mail_message_received_notification(
        recipient_id=user_id,
        message_id=message_id,
        mail_integration_id=str(integration["id"]),
        provider=str(integration["provider"]),
        sender_name=sender_name,
        sender_email=sender_email,
        subject=provider_message.get("subject"),
        body_preview=(
            provider_message.get("body_preview")
            or provider_message.get("snippet")
        ),
        received_at=provider_message.get("received_at"),
    )
