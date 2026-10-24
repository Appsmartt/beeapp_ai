from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
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


def get_mail_message_supabase():
    return get_supabase_admin_client()


def get_response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def get_response_single(response) -> dict[str, Any] | None:
    rows = get_response_rows(response)
    return rows[0] if rows else None
