from __future__ import annotations

from typing import Any

from apps.mail.exceptions import MailMessageNotFoundError

from .database import (
    MAIL_MESSAGE_DETAIL_COLUMNS,
    MAIL_MESSAGE_LIST_COLUMNS,
    get_mail_message_supabase,
    get_response_single,
    get_response_rows,
)
from .serialization import (
    get_mail_message_attachments,
    get_recipients_for_message_ids,
    serialize_mail_list_message,
    serialize_mail_recipient,
)


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
            get_mail_message_supabase()
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

        rows = get_response_rows(response)
        total_count = getattr(response, "count", None)

        recipient_map = get_recipients_for_message_ids(
            message_ids=[
                str(message["id"])
                for message in rows
            ],
        )

        messages = [
            serialize_mail_list_message(
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
            get_mail_message_supabase()
            .table("mail_messages")
            .select(MAIL_MESSAGE_DETAIL_COLUMNS)
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

        recipients_response = (
            get_mail_message_supabase()
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

        for recipient in get_response_rows(recipients_response):
            recipient_kind = str(
                recipient.get("recipient_kind") or ""
            )

            if recipient_kind not in recipients_by_kind:
                continue

            serialized_recipient = serialize_mail_recipient(
                recipient
            )

            if serialized_recipient:
                recipients_by_kind[recipient_kind].append(
                    serialized_recipient
                )

        return {
            "message": {
                **message,
                "recipients": recipients_by_kind,
                "attachments": get_mail_message_attachments(
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
