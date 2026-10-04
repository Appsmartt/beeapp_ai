from __future__ import annotations

from typing import Any

from apps.mail.exceptions import MailMessageNotFoundError
from apps.mail.services.mail_provider_service import (
    MailProviderError,
    normalize_mail_folder,
)

from .persistence import persist_provider_message_update
from .provider_actions import (
    get_actionable_mail_message,
    get_integration_access_token,
    get_mail_provider,
)
from .queries import (
    get_mail_message,
    list_mail_messages,
)


def update_mail_message_state(
    *,
    user_id: str,
    message_id: str,
    is_read: bool | None = None,
    is_starred: bool | None = None,
) -> dict[str, Any]:
    if is_read is None and is_starred is None:
        raise MailMessageNotFoundError(
            "Debes indicar al menos un estado para actualizar."
        )

    message = get_actionable_mail_message(
        user_id=user_id,
        message_id=message_id,
    )
    provider = get_mail_provider(
        provider_name=message["provider"],
    )
    access_token = get_integration_access_token(
        user_id=user_id,
        connection_id=message["integration_connection_id"],
        provider_name=message["provider"],
    )

    try:
        provider_message = provider.update_message_state(
            access_token=access_token,
            provider_message_id=message["provider_message_id"],
            is_read=is_read,
            is_starred=is_starred,
        )
    except MailProviderError as error:
        raise MailMessageNotFoundError(str(error)) from error

    updated_message = persist_provider_message_update(
        message=message,
        provider_message=provider_message,
    )

    return {
        "message": updated_message,
    }


def move_mail_message(
    *,
    user_id: str,
    message_id: str,
    folder: str,
) -> dict[str, Any]:
    normalized_folder = normalize_mail_folder(folder)

    message = get_actionable_mail_message(
        user_id=user_id,
        message_id=message_id,
    )
    provider = get_mail_provider(
        provider_name=message["provider"],
    )
    access_token = get_integration_access_token(
        user_id=user_id,
        connection_id=message["integration_connection_id"],
        provider_name=message["provider"],
    )

    try:
        provider_message = provider.move_message(
            access_token=access_token,
            provider_message_id=message["provider_message_id"],
            folder=normalized_folder,
        )
    except MailProviderError as error:
        raise MailMessageNotFoundError(str(error)) from error

    updated_message = persist_provider_message_update(
        message=message,
        provider_message=provider_message,
    )

    return {
        "message": updated_message,
    }


__all__ = [
    "get_mail_message",
    "list_mail_messages",
    "move_mail_message",
    "update_mail_message_state",
]
