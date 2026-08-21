from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.mail.exceptions import (
    MailMessageNotFoundError,
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