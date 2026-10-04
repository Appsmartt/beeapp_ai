from __future__ import annotations

from typing import Any

from apps.integrations.exceptions import (
    IntegrationCredentialError,
)
from apps.integrations.services.integration_connection_service import (
    get_valid_google_access_token,
    get_valid_microsoft_access_token,
)
from apps.mail.exceptions import (
    MailIntegrationInactiveError,
)
from apps.mail.services.google_provider import GoogleMailProvider
from apps.mail.services.microsoft_provider.provider import (
    MicrosoftMailProvider,
)


def get_mail_provider(
    *,
    provider_name: str,
):
    provider = str(provider_name or "").strip().lower()

    if provider == "google":
        return GoogleMailProvider()

    if provider == "microsoft":
        return MicrosoftMailProvider()

    raise MailIntegrationInactiveError(
        "El proveedor de Email no es compatible."
    )


def get_valid_access_token(
    *,
    user_id: str,
    integration: dict[str, Any],
) -> str:
    provider = str(
        integration.get("provider") or ""
    ).strip().lower()
    connection_id = str(
        integration.get("integration_connection_id") or ""
    ).strip()

    if not connection_id:
        raise MailIntegrationInactiveError(
            "La integración de Email no tiene conexión OAuth."
        )

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

    raise MailIntegrationInactiveError(
        "El proveedor de Email no es compatible."
    )
