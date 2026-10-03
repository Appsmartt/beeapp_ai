from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from apps.integrations.exceptions import IntegrationCredentialError
from apps.mail.exceptions import MailIntegrationInactiveError, MailSyncError
from apps.mail.services.google_provider import GoogleMailProvider
from apps.mail.services.microsoft_provider.provider import MicrosoftMailProvider

from .common import (
    INCREMENTAL_SYNC_LOOKBACK_DAYS,
    INCREMENTAL_SYNC_MAX_MESSAGES,
    INCREMENTAL_SYNC_MAX_SPAM_MESSAGES,
    INITIAL_SYNC_LOOKBACK_DAYS,
    INITIAL_SYNC_MAX_MESSAGES,
    INITIAL_SYNC_MAX_SPAM_MESSAGES,
    utc_now,
)


def get_mail_provider(provider: str):
    normalized_provider = str(provider or "").strip().lower()

    if normalized_provider == "google":
        return GoogleMailProvider()

    if normalized_provider == "microsoft":
        return MicrosoftMailProvider()

    raise MailSyncError(
        f"El proveedor {normalized_provider} no está implementado."
    )


def get_valid_access_token(
    *,
    user_id: str,
    integration: dict[str, Any],
) -> str:
    from apps.integrations.services.integration_connection_service import (
        get_valid_google_access_token,
        get_valid_microsoft_access_token,
    )

    provider = str(integration["provider"]).strip().lower()
    connection_id = str(
        integration["integration_connection_id"]
    ).strip()

    try:
        if provider == "google":
            return get_valid_google_access_token(
                user_id=user_id,
                connection_id=connection_id,
            )

        if provider == "microsoft":
            return get_valid_microsoft_access_token(
                user_id=user_id,
                connection_id=connection_id,
            )
    except IntegrationCredentialError as error:
        raise MailIntegrationInactiveError(
            "No fue posible obtener acceso a la cuenta de Email."
        ) from error

    raise MailSyncError(
        f"El proveedor {provider} no está implementado."
    )


def get_sync_window(
    *,
    integration: dict[str, Any],
    force_full_sync: bool,
) -> tuple[datetime, int, int, bool]:
    initial_sync = (
        force_full_sync
        or integration.get("initial_sync_completed_at") is None
    )

    if initial_sync:
        return (
            utc_now() - timedelta(days=INITIAL_SYNC_LOOKBACK_DAYS),
            INITIAL_SYNC_MAX_MESSAGES,
            INITIAL_SYNC_MAX_SPAM_MESSAGES,
            True,
        )

    return (
        utc_now() - timedelta(days=INCREMENTAL_SYNC_LOOKBACK_DAYS),
        INCREMENTAL_SYNC_MAX_MESSAGES,
        INCREMENTAL_SYNC_MAX_SPAM_MESSAGES,
        False,
    )


def get_provider_message_ids(
    *,
    provider: Any,
    access_token: str,
    after: datetime,
    max_messages: int,
    max_spam_messages: int,
) -> tuple[list[str], str | None, dict[str, int]]:
    normal_message_ids, cursor_after = provider.list_message_ids(
        access_token=access_token,
        after=after,
        max_results=max_messages,
    )
    spam_message_ids = provider.list_spam_message_ids(
        access_token=access_token,
        after=after,
        max_results=max_spam_messages,
    )

    seen_message_ids: set[str] = set()
    message_ids: list[str] = []

    for message_id in [*normal_message_ids, *spam_message_ids]:
        normalized_message_id = str(message_id or "").strip()

        if (
            not normalized_message_id
            or normalized_message_id in seen_message_ids
        ):
            continue

        seen_message_ids.add(normalized_message_id)
        message_ids.append(normalized_message_id)

    return (
        message_ids,
        cursor_after,
        {
            "normal_message_count": len(normal_message_ids),
            "spam_message_count": len(spam_message_ids),
            "unique_message_count": len(message_ids),
        },
    )


def get_provider_message(
    *,
    provider: Any,
    access_token: str,
    provider_message_id: str,
    load_attachments: bool,
) -> dict[str, Any]:
    if isinstance(provider, MicrosoftMailProvider):
        return provider.get_message(
            access_token=access_token,
            provider_message_id=provider_message_id,
            include_attachments=load_attachments,
        )

    return provider.get_message(
        access_token=access_token,
        provider_message_id=provider_message_id,
    )
