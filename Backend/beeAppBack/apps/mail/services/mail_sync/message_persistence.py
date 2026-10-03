from __future__ import annotations

from typing import Any

from apps.mail.exceptions import MailSyncError

from .common import extract_single, get_supabase
from .message_payloads import (
    build_message_payload,
    provider_message_is_unchanged,
)
from .message_relations import (
    replace_message_attachments,
    replace_message_recipients,
)


def find_existing_message(
    *,
    user_id: str,
    mail_integration_id: str,
    provider_message_id: str,
) -> dict[str, Any] | None:
    try:
        response = (
            get_supabase()
            .table("mail_messages")
            .select(
                "id,provider_change_key,provider_etag,metadata,"
                "is_starred,is_deleted_permanently"
            )
            .eq("user_id", user_id)
            .eq("mail_integration_id", mail_integration_id)
            .eq("provider_message_id", provider_message_id)
            .maybe_single()
            .execute()
        )
        return extract_single(response)
    except Exception as error:
        raise MailSyncError(
            "No fue posible buscar un correo existente."
        ) from error


def upsert_provider_message(
    *,
    user_id: str,
    integration: dict[str, Any],
    provider_message: dict[str, Any],
) -> tuple[bool, bool, str | None]:
    provider_message_id = str(
        provider_message.get("provider_message_id") or ""
    ).strip()

    if not provider_message_id:
        raise MailSyncError(
            "El proveedor devolvió un correo sin identificador."
        )

    existing_message = find_existing_message(
        user_id=user_id,
        mail_integration_id=str(integration["id"]),
        provider_message_id=provider_message_id,
    )

    if provider_message_is_unchanged(
        existing_message=existing_message,
        provider_message=provider_message,
    ):
        return False, True, str(existing_message["id"])

    payload = build_message_payload(
        user_id=user_id,
        integration=integration,
        provider_message=provider_message,
        existing_message=existing_message,
    )

    try:
        if existing_message:
            response = (
                get_supabase()
                .table("mail_messages")
                .update(payload)
                .eq("id", existing_message["id"])
                .execute()
            )
            message = extract_single(response)
            created = False
        else:
            response = (
                get_supabase()
                .table("mail_messages")
                .insert(payload)
                .execute()
            )
            message = extract_single(response)
            created = True

        if not message:
            raise MailSyncError(
                "No fue posible guardar el correo."
            )

        replace_message_recipients(
            message_id=str(message["id"]),
            recipients=(
                provider_message.get("recipients")
                if isinstance(provider_message.get("recipients"), dict)
                else {}
            ),
        )
        replace_message_attachments(
            message_id=str(message["id"]),
            attachments=(
                provider_message.get("attachments")
                if isinstance(provider_message.get("attachments"), list)
                else []
            ),
        )

        return created, False, str(message["id"])
    except MailSyncError:
        raise
    except Exception as error:
        raise MailSyncError(
            "No fue posible guardar el correo del proveedor."
        ) from error


def persist_provider_mail_message(
    *,
    user_id: str,
    integration: dict[str, Any],
    provider_message: dict[str, Any],
) -> dict[str, Any]:
    """Persist a provider message with recipients and attachment metadata."""
    try:
        _, _, message_id = upsert_provider_message(
            user_id=user_id,
            integration=integration,
            provider_message=provider_message,
        )

        if not message_id:
            raise MailSyncError(
                "No fue posible recuperar el correo guardado."
            )

        return {"id": message_id}
    except MailSyncError:
        raise
    except Exception as error:
        raise MailSyncError(
            "No fue posible persistir el correo del proveedor."
        ) from error
