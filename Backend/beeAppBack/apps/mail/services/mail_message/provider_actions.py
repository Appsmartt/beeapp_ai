from __future__ import annotations

from typing import Any

from apps.integrations.exceptions import (
    IntegrationCredentialError,
)
from apps.integrations.services.connection.token_service import (
    get_valid_google_access_token,
    get_valid_microsoft_access_token,
)
from apps.mail.exceptions import MailMessageNotFoundError
from apps.mail.services.google_provider import GoogleMailProvider
from apps.mail.services.microsoft_provider.provider import (
    MicrosoftMailProvider,
)

from .database import (
    get_mail_message_supabase,
    get_response_single,
)


def get_actionable_mail_message(
    *,
    user_id: str,
    message_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_mail_message_supabase()
            .table("mail_messages")
            .select(
                "id,user_id,mail_integration_id,provider,"
                "provider_message_id,is_provider_deleted"
            )
            .eq("id", message_id)
            .eq("user_id", user_id)
            .eq("is_provider_deleted", False)
            .maybe_single()
            .execute()
        )

        message = get_response_single(response)

        if not message:
            raise MailMessageNotFoundError(
                "El correo no fue encontrado."
            )

        integration_response = (
            get_mail_message_supabase()
            .table("mail_integrations")
            .select(
                "id,user_id,provider,integration_connection_id,"
                "status"
            )
            .eq("id", message["mail_integration_id"])
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        integration = get_response_single(integration_response)

        if not integration:
            raise MailMessageNotFoundError(
                "La integración de correo no fue encontrada."
            )

        if integration.get("status") != "active":
            raise MailMessageNotFoundError(
                "La integración de correo no está activa."
            )

        if integration.get("provider") != message.get("provider"):
            raise MailMessageNotFoundError(
                "La integración de correo no coincide con el proveedor."
            )

        connection_id = str(
            integration.get("integration_connection_id") or ""
        ).strip()

        if not connection_id:
            raise MailMessageNotFoundError(
                "La integración de correo no tiene una conexión válida."
            )

        return {
            **message,
            "integration_connection_id": connection_id,
        }
    except MailMessageNotFoundError:
        raise
    except Exception as error:
        raise MailMessageNotFoundError(
            "No fue posible preparar la actualización del correo."
        ) from error


def get_mail_provider(
    *,
    provider_name: str,
):
    provider = str(provider_name or "").strip().lower()

    if provider == "google":
        return GoogleMailProvider()

    if provider == "microsoft":
        return MicrosoftMailProvider()

    raise MailMessageNotFoundError(
        "El proveedor de correo no es compatible."
    )


def get_integration_access_token(
    *,
    user_id: str,
    connection_id: str,
    provider_name: str,
) -> str:
    provider = str(provider_name or "").strip().lower()

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
        raise MailMessageNotFoundError(
            "No fue posible obtener acceso a la cuenta de correo."
        ) from error

    raise MailMessageNotFoundError(
        "El proveedor de correo no es compatible."
    )
