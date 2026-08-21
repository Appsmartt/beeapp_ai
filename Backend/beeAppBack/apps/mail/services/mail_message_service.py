from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.integrations.exceptions import (
    IntegrationCredentialError,
)
from apps.integrations.services.integration_connection_service import (
    get_valid_google_access_token,
    get_valid_microsoft_access_token,
)
from apps.mail.exceptions import (
    MailMessageNotFoundError,
)
from apps.mail.services.google_mail_provider_service import (
    GoogleMailProvider,
)
from apps.mail.services.mail_provider_service import (
    MailProviderError,
    normalize_mail_folder,
)
from apps.mail.services.microsoft_mail_provider_service import (
    MicrosoftMailProvider,
)


MAIL_MESSAGE_LIST_COLUMNS = (
    "id,mail_integration_id,provider,provider_thread_id,"
    "provider_conversation_id,direction,status,folder,"
    "is_read,is_starred,subject,body_preview,snippet,"
    "sent_at,received_at,has_attachments,attachment_count,"
    "created_at,updated_at"
)

MAIL_MESSAGE_DETAIL_COLUMNS = (
    "id,user_id,mail_integration_id,provider,"
    "provider_message_id,provider_thread_id,"
    "provider_conversation_id,provider_change_key,"
    "provider_etag,provider_web_link,provider_created_at,"
    "provider_updated_at,direction,status,folder,is_read,"
    "is_starred,is_archived,is_spam,is_trashed,"
    "is_deleted_permanently,deleted_permanently_at,"
    "subject,body_text,body_html,body_preview,snippet,"
    "message_id_header,in_reply_to_header,references_header,"
    "sent_at,received_at,has_attachments,attachment_count,"
    "is_provider_deleted,provider_deleted_at,last_synced_at,"
    "metadata,created_at,updated_at"
)


def _supabase():
    return get_supabase_admin_client()


def _response_data(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def _extract_single(response) -> dict[str, Any] | None:
    rows = _response_data(response)
    return rows[0] if rows else None


def _serialize_recipient(
    recipient: dict[str, Any] | None,
) -> dict[str, str | None] | None:
    if not recipient:
        return None

    email = str(recipient.get("email") or "").strip()

    if not email:
        return None

    display_name = str(
        recipient.get("display_name") or ""
    ).strip()

    return {
        "email": email,
        "display_name": display_name or None,
    }


def _get_recipients_for_message_ids(
    *,
    message_ids: list[str],
) -> dict[str, list[dict[str, Any]]]:
    if not message_ids:
        return {}

    try:
        response = (
            _supabase()
            .table("mail_message_recipients")
            .select(
                "message_id,recipient_kind,email,"
                "display_name,position"
            )
            .in_("message_id", message_ids)
            .order("position")
            .execute()
        )

        result: dict[str, list[dict[str, Any]]] = {}

        for recipient in _response_data(response):
            message_id = str(
                recipient.get("message_id") or ""
            )

            if message_id:
                result.setdefault(message_id, []).append(
                    recipient
                )

        return result

    except Exception:
        return {}


def _get_attachments(
    *,
    message_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            _supabase()
            .table("mail_message_attachments")
            .select(
                "id,source,provider_attachment_id,"
                "provider_message_attachment_id,filename,"
                "mime_type,size_bytes,content_id,"
                "content_disposition,is_inline,metadata,"
                "created_at"
            )
            .eq("message_id", message_id)
            .order("created_at")
            .execute()
        )

        return _response_data(response)

    except Exception:
        return []


def _serialize_list_message(
    *,
    message: dict[str, Any],
    recipients: list[dict[str, Any]],
) -> dict[str, Any]:
    sender: dict[str, str | None] | None = None

    for recipient in recipients:
        if recipient.get("recipient_kind") == "from":
            sender = _serialize_recipient(recipient)
            break

    return {
        "id": message["id"],
        "mail_integration_id": message[
            "mail_integration_id"
        ],
        "provider": message["provider"],
        "provider_thread_id": message.get(
            "provider_thread_id"
        ),
        "provider_conversation_id": message.get(
            "provider_conversation_id"
        ),
        "direction": message["direction"],
        "status": message["status"],
        "folder": message["folder"],
        "is_read": bool(message["is_read"]),
        "is_starred": bool(message["is_starred"]),
        "subject": message.get("subject"),
        "body_preview": message.get("body_preview"),
        "snippet": message.get("snippet"),
        "sent_at": message.get("sent_at"),
        "received_at": message.get("received_at"),
        "has_attachments": bool(
            message["has_attachments"]
        ),
        "attachment_count": int(
            message["attachment_count"] or 0
        ),
        "sender": sender,
    }


def list_mail_messages(
    *,
    user_id: str,
    integration_id: str | None,
    folder: str | None,
    unread_only: bool,
    starred_only: bool,
    search: str | None,
    limit: int,
    offset: int,
) -> dict[str, Any]:
    try:
        query = (
            _supabase()
            .table("mail_messages")
            .select(MAIL_MESSAGE_LIST_COLUMNS, count="exact")
            .eq("user_id", user_id)
            .eq("is_provider_deleted", False)
        )

        if integration_id:
            query = query.eq(
                "mail_integration_id",
                integration_id,
            )

        if folder:
            query = query.eq("folder", folder)

        if unread_only:
            query = query.eq("is_read", False)

        if starred_only:
            query = query.eq("is_starred", True)

        if search:
            escaped_search = (
                search.replace("%", r"\%")
                .replace("_", r"\_")
                .replace(",", " ")
            )

            query = query.or_(
                f"subject.ilike.%{escaped_search}%,"
                f"snippet.ilike.%{escaped_search}%,"
                f"body_preview.ilike.%{escaped_search}%"
            )

        response = (
            query
            .order("received_at", desc=True, nullsfirst=False)
            .order("id", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        rows = _response_data(response)
        total_count = getattr(response, "count", None)

        recipient_map = _get_recipients_for_message_ids(
            message_ids=[
                str(message["id"])
                for message in rows
            ],
        )

        messages = [
            _serialize_list_message(
                message=message,
                recipients=recipient_map.get(
                    str(message["id"]),
                    [],
                ),
            )
            for message in rows
        ]

        return {
            "messages": messages,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "count": len(messages),
                "total_count": total_count,
                "has_more": (
                    total_count is not None
                    and offset + len(messages) < total_count
                ),
                "next_offset": (
                    offset + len(messages)
                    if (
                        total_count is not None
                        and offset + len(messages) < total_count
                    )
                    else None
                ),
            },
        }

    except Exception as error:
        raise MailMessageNotFoundError(
            "No fue posible cargar los correos."
        ) from error


def get_mail_message(
    *,
    user_id: str,
    message_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("mail_messages")
            .select(MAIL_MESSAGE_DETAIL_COLUMNS)
            .eq("id", message_id)
            .eq("user_id", user_id)
            .eq("is_provider_deleted", False)
            .maybe_single()
            .execute()
        )

        message = _extract_single(response)

        if not message:
            raise MailMessageNotFoundError(
                "El correo no fue encontrado."
            )

        recipients_response = (
            _supabase()
            .table("mail_message_recipients")
            .select(
                "recipient_kind,email,display_name,position,"
                "provider_recipient_id,metadata"
            )
            .eq("message_id", message_id)
            .order("position")
            .execute()
        )

        recipients_by_kind: dict[str, list[dict[str, Any]]] = {
            "from": [],
            "to": [],
            "cc": [],
            "bcc": [],
            "reply_to": [],
        }

        for recipient in _response_data(recipients_response):
            recipient_kind = str(
                recipient.get("recipient_kind") or ""
            )

            if recipient_kind not in recipients_by_kind:
                continue

            serialized_recipient = _serialize_recipient(recipient)

            if serialized_recipient:
                recipients_by_kind[recipient_kind].append(
                    serialized_recipient
                )

        return {
            "message": {
                **message,
                "recipients": recipients_by_kind,
                "attachments": _get_attachments(
                    message_id=message_id,
                ),
            }
        }

    except MailMessageNotFoundError:
        raise

    except Exception as error:
        raise MailMessageNotFoundError(
            "No fue posible cargar el correo."
        ) from error


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

    message = _get_actionable_message(
        user_id=user_id,
        message_id=message_id,
    )
    provider = _get_mail_provider(
        provider_name=message["provider"],
    )
    access_token = _get_integration_access_token(
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

    updated_message = _persist_provider_message_update(
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

    message = _get_actionable_message(
        user_id=user_id,
        message_id=message_id,
    )
    provider = _get_mail_provider(
        provider_name=message["provider"],
    )
    access_token = _get_integration_access_token(
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

    updated_message = _persist_provider_message_update(
        message=message,
        provider_message=provider_message,
    )

    return {
        "message": updated_message,
    }


def _get_actionable_message(
    *,
    user_id: str,
    message_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
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

        message = _extract_single(response)

        if not message:
            raise MailMessageNotFoundError(
                "El correo no fue encontrado."
            )

        integration_response = (
            _supabase()
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

        integration = _extract_single(integration_response)

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


def _get_mail_provider(
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


def _get_integration_access_token(
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


def _persist_provider_message_update(
    *,
    message: dict[str, Any],
    provider_message: dict[str, Any],
) -> dict[str, Any]:
    try:
        provider_message_id = str(
            provider_message.get("provider_message_id") or ""
        ).strip()

        if not provider_message_id:
            raise MailMessageNotFoundError(
                "El proveedor no devolvió el correo actualizado."
            )

        payload = {
            "provider_message_id": provider_message_id,
            "provider_thread_id": provider_message.get(
                "provider_thread_id"
            ),
            "provider_conversation_id": provider_message.get(
                "provider_conversation_id"
            ),
            "provider_change_key": provider_message.get(
                "provider_change_key"
            ),
            "provider_etag": provider_message.get(
                "provider_etag"
            ),
            "provider_web_link": provider_message.get(
                "provider_web_link"
            ),
            "provider_updated_at": provider_message.get(
                "provider_updated_at"
            ),
            "direction": provider_message.get("direction"),
            "status": provider_message.get("status"),
            "folder": provider_message.get("folder"),
            "is_read": bool(provider_message.get("is_read")),
            "is_starred": bool(provider_message.get("is_starred")),
            "is_archived": bool(
                provider_message.get("is_archived")
            ),
            "is_spam": bool(provider_message.get("is_spam")),
            "is_trashed": bool(
                provider_message.get("is_trashed")
            ),
            "body_preview": provider_message.get(
                "body_preview"
            ),
            "snippet": provider_message.get("snippet"),
            "has_attachments": bool(
                provider_message.get("has_attachments")
            ),
            "attachment_count": int(
                provider_message.get("attachment_count") or 0
            ),
            "metadata": provider_message.get("metadata") or {},
            "is_provider_deleted": False,
            "provider_deleted_at": None,
            "last_synced_at": "now()",
        }

        response = (
            _supabase()
            .table("mail_messages")
            .update(payload)
            .eq("id", message["id"])
            .eq("user_id", message["user_id"])
            .execute()
        )

        updated_message = _extract_single(response)

        if not updated_message:
            raise MailMessageNotFoundError(
                "No fue posible guardar el correo actualizado."
            )

        return get_mail_message(
            user_id=message["user_id"],
            message_id=message["id"],
        )["message"]

    except MailMessageNotFoundError:
        raise

    except Exception as error:
        raise MailMessageNotFoundError(
            "No fue posible guardar la actualización del correo."
        ) from error