from __future__ import annotations

from datetime import datetime, timezone
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
    MailIntegrationInactiveError,
    MailIntegrationNotFoundError,
    MailMessageNotFoundError,
    MailSyncError,
)
from apps.mail.services.google_mail_provider_service import (
    GoogleMailProvider,
)
from apps.mail.services.mail_provider_service import (
    MAX_MAIL_ATTACHMENT_SIZE_BYTES,
    MailProviderError,
    normalize_recipients,
    normalize_text,
    validate_sendable_draft,
)
from apps.mail.services.mail_sync_service import (
    persist_provider_mail_message,
)
from apps.mail.services.microsoft_mail_provider_service import (
    MicrosoftMailProvider,
)
from apps.storage.exceptions import (
    StorageFileNotFoundError,
    StorageFileOperationError,
)
from apps.storage.services.storage_file_service import (
    get_file_content_for_mail_attachment,
)


MAIL_INTEGRATION_ACTION_COLUMNS = (
    "id,user_id,integration_connection_id,provider,status,"
    "provider_account_id,provider_email,provider_display_name,"
    "metadata"
)


def _supabase():
    return get_supabase_admin_client()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_single(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _response_data(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def _get_active_mail_integration(
    *,
    user_id: str,
    integration_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("mail_integrations")
            .select(MAIL_INTEGRATION_ACTION_COLUMNS)
            .eq("id", integration_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        integration = _extract_single(response)

        if not integration:
            raise MailIntegrationNotFoundError(
                "La integración de Email no fue encontrada."
            )

        if integration.get("status") != "active":
            raise MailIntegrationInactiveError(
                integration.get("last_error_message")
                or "La integración de Email requiere reconexión."
            )

        if not integration.get("integration_connection_id"):
            raise MailIntegrationInactiveError(
                "La integración de Email no tiene conexión OAuth."
            )

        provider = str(
            integration.get("provider") or ""
        ).strip().lower()

        if provider not in {"google", "microsoft"}:
            raise MailIntegrationInactiveError(
                "El proveedor de Email no es compatible."
            )

        return integration

    except (
        MailIntegrationNotFoundError,
        MailIntegrationInactiveError,
    ):
        raise

    except Exception as error:
        raise MailIntegrationNotFoundError(
            "No fue posible cargar la integración de Email."
        ) from error


def _get_draft_message(
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
                "provider_message_id,provider_thread_id,"
                "provider_conversation_id,provider_change_key,"
                "provider_etag,provider_web_link,"
                "provider_created_at,provider_updated_at,"
                "direction,status,folder,is_read,is_starred,"
                "is_archived,is_spam,is_trashed,subject,"
                "body_text,body_html,body_preview,snippet,"
                "message_id_header,in_reply_to_header,"
                "references_header,sent_at,received_at,"
                "has_attachments,attachment_count,metadata,"
                "is_provider_deleted"
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
                "El borrador no fue encontrado."
            )

        if (
            message.get("status") != "draft"
            or message.get("folder") != "drafts"
        ):
            raise MailMessageNotFoundError(
                "El correo indicado no es un borrador."
            )

        provider_message_id = str(
            message.get("provider_message_id") or ""
        ).strip()

        if not provider_message_id:
            raise MailMessageNotFoundError(
                "El borrador no tiene identificador del proveedor."
            )

        return message

    except MailMessageNotFoundError:
        raise

    except Exception as error:
        raise MailMessageNotFoundError(
            "No fue posible cargar el borrador."
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

    raise MailIntegrationInactiveError(
        "El proveedor de Email no es compatible."
    )


def _get_valid_access_token(
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


def _normalize_recipients(
    recipients: list[dict[str, Any]] | None,
) -> list[dict[str, str | None]]:
    normalized: list[dict[str, str | None]] = []
    seen_emails: set[str] = set()

    for recipient in recipients or []:
        if not isinstance(recipient, dict):
            continue

        email = str(recipient.get("email") or "").strip().lower()

        if not email or email in seen_emails:
            continue

        display_name = str(
            recipient.get("display_name") or ""
        ).strip()

        normalized.append(
            {
                "email": email[:320],
                "display_name": display_name[:255] or None,
            }
        )
        seen_emails.add(email)

    return normalized


def _get_gmail_draft_id(
    *,
    message: dict[str, Any],
) -> str | None:
    metadata = message.get("metadata")

    if not isinstance(metadata, dict):
        return None

    draft_id = str(
        metadata.get("gmail_draft_id") or ""
    ).strip()

    return draft_id or None


def _load_mail_attachments(
    *,
    user_id: str,
    file_ids: list[str] | None,
) -> list[dict[str, Any]]:
    attachments: list[dict[str, Any]] = []

    for file_id in file_ids or []:
        try:
            attachment = get_file_content_for_mail_attachment(
                user_id=user_id,
                file_id=str(file_id),
                max_size_bytes=MAX_MAIL_ATTACHMENT_SIZE_BYTES,
            )
        except StorageFileNotFoundError as error:
            raise MailSyncError(
                "Uno de los archivos seleccionados no fue encontrado."
            ) from error
        except StorageFileOperationError as error:
            raise MailSyncError(str(error)) from error

        attachments.append(attachment)

    return attachments


def _replace_storage_attachment_links(
    *,
    message_id: str,
    attachments: list[dict[str, Any]],
) -> None:
    try:
        (
            _supabase()
            .table("mail_message_attachments")
            .delete()
            .eq("message_id", message_id)
            .eq("source", "storage")
            .execute()
        )

        rows: list[dict[str, Any]] = []

        for attachment in attachments:
            rows.append(
                {
                    "message_id": message_id,
                    "storage_file_id": attachment[
                        "storage_file_id"
                    ],
                    "source": "storage",
                    "provider_attachment_id": None,
                    "provider_message_attachment_id": None,
                    "filename": attachment["filename"],
                    "mime_type": attachment["mime_type"],
                    "size_bytes": attachment["size_bytes"],
                    "content_id": None,
                    "content_disposition": "attachment",
                    "is_inline": False,
                    "checksum_sha256": None,
                    "metadata": attachment.get("metadata") or {},
                }
            )

        if rows:
            (
                _supabase()
                .table("mail_message_attachments")
                .insert(rows)
                .execute()
            )

    except Exception as error:
        raise MailSyncError(
            "No fue posible guardar los adjuntos del borrador."
        ) from error


def _get_message_recipients(
    *,
    message_id: str,
) -> dict[str, list[dict[str, str | None]]]:
    recipients: dict[str, list[dict[str, str | None]]] = {
        "from": [],
        "to": [],
        "cc": [],
        "bcc": [],
        "reply_to": [],
    }

    try:
        response = (
            _supabase()
            .table("mail_message_recipients")
            .select(
                "recipient_kind,email,display_name,position"
            )
            .eq("message_id", message_id)
            .order("position")
            .execute()
        )

        for recipient in _response_data(response):
            recipient_kind = str(
                recipient.get("recipient_kind") or ""
            ).strip()

            if recipient_kind not in recipients:
                continue

            email = str(recipient.get("email") or "").strip()

            if not email:
                continue

            recipients[recipient_kind].append(
                {
                    "email": email[:320],
                    "display_name": (
                        str(
                            recipient.get("display_name") or ""
                        ).strip()[:255]
                        or None
                    ),
                }
            )

        return recipients

    except Exception as error:
        raise MailSyncError(
            "No fue posible cargar los destinatarios del borrador."
        ) from error


def _get_message_attachments(
    *,
    message_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            _supabase()
            .table("mail_message_attachments")
            .select(
                "id,storage_file_id,source,"
                "provider_attachment_id,"
                "provider_message_attachment_id,filename,"
                "mime_type,size_bytes,content_id,"
                "content_disposition,is_inline,"
                "checksum_sha256,metadata,created_at"
            )
            .eq("message_id", message_id)
            .order("created_at")
            .execute()
        )

        return _response_data(response)

    except Exception as error:
        raise MailSyncError(
            "No fue posible cargar los adjuntos del borrador."
        ) from error


def _build_draft_snapshot(
    *,
    draft: dict[str, Any],
) -> dict[str, Any]:
    recipients = _get_message_recipients(
        message_id=str(draft["id"]),
    )
    attachments = _get_message_attachments(
        message_id=str(draft["id"]),
    )

    metadata = draft.get("metadata")

    return {
        "provider_message_id": draft["provider_message_id"],
        "provider_thread_id": draft.get(
            "provider_thread_id"
        ),
        "provider_conversation_id": draft.get(
            "provider_conversation_id"
        ),
        "provider_change_key": draft.get(
            "provider_change_key"
        ),
        "provider_etag": draft.get("provider_etag"),
        "provider_web_link": draft.get(
            "provider_web_link"
        ),
        "provider_created_at": draft.get(
            "provider_created_at"
        ),
        "provider_updated_at": draft.get(
            "provider_updated_at"
        ),
        "direction": draft.get("direction") or "outbound",
        "status": draft.get("status") or "draft",
        "folder": draft.get("folder") or "drafts",
        "is_read": bool(draft.get("is_read")),
        "is_starred": bool(draft.get("is_starred")),
        "is_archived": bool(draft.get("is_archived")),
        "is_spam": bool(draft.get("is_spam")),
        "is_trashed": bool(draft.get("is_trashed")),
        "subject": draft.get("subject"),
        "body_text": draft.get("body_text"),
        "body_html": draft.get("body_html"),
        "body_preview": draft.get("body_preview"),
        "snippet": draft.get("snippet"),
        "message_id_header": draft.get(
            "message_id_header"
        ),
        "in_reply_to_header": draft.get(
            "in_reply_to_header"
        ),
        "references_header": draft.get(
            "references_header"
        ),
        "sent_at": draft.get("sent_at"),
        "received_at": draft.get("received_at"),
        "has_attachments": bool(
            draft.get("has_attachments")
            or attachments
        ),
        "attachment_count": int(
            draft.get("attachment_count") or len(attachments)
        ),
        "recipients": recipients,
        "attachments": attachments,
        "metadata": (
            metadata
            if isinstance(metadata, dict)
            else {}
        ),
    }


def _serialize_message(
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
                "provider_message_id,provider_thread_id,"
                "provider_conversation_id,direction,status,"
                "folder,is_read,is_starred,is_archived,is_spam,"
                "is_trashed,subject,body_text,body_html,"
                "body_preview,snippet,sent_at,received_at,"
                "has_attachments,attachment_count,metadata,"
                "created_at,updated_at"
            )
            .eq("id", message_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        message = _extract_single(response)

        if not message:
            raise MailMessageNotFoundError(
                "No fue posible recuperar el correo guardado."
            )

        recipients = _get_message_recipients(
            message_id=message_id,
        )

        attachments = _get_message_attachments(
            message_id=message_id,
        )

        return {
            "message": {
                **message,
                "recipients": recipients,
                "attachments": attachments,
            }
        }

    except MailMessageNotFoundError:
        raise

    except MailSyncError as error:
        raise MailMessageNotFoundError(str(error)) from error

    except Exception as error:
        raise MailMessageNotFoundError(
            "No fue posible cargar el correo guardado."
        ) from error


def _mark_draft_as_sent_from_snapshot(
    *,
    user_id: str,
    draft: dict[str, Any],
    integration: dict[str, Any],
    provider_message: dict[str, Any],
) -> str:
    """
    Persists Microsoft Graph's asynchronous send fallback.

    Microsoft returns HTTP 202 without a Message body. The provider supplies
    an accepted local snapshot with the immutable provider message ID, which
    is enough to update the existing BeeApp draft record into a sent record.
    A later synchronization enriches it with definitive Graph data.
    """
    try:
        now = _utc_now_iso()

        existing_metadata = draft.get("metadata")
        provider_metadata = provider_message.get("metadata")

        metadata = {
            **(
                existing_metadata
                if isinstance(existing_metadata, dict)
                else {}
            ),
            **(
                provider_metadata
                if isinstance(provider_metadata, dict)
                else {}
            ),
            "last_synced_at": now,
        }

        payload = {
            "mail_integration_id": integration["id"],
            "provider": integration["provider"],
            "provider_message_id": (
                provider_message.get("provider_message_id")
                or draft["provider_message_id"]
            ),
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
            "provider_created_at": provider_message.get(
                "provider_created_at"
            ),
            "provider_updated_at": provider_message.get(
                "provider_updated_at"
            ),
            "direction": "outbound",
            "status": "sent",
            "folder": "sent",
            "is_read": True,
            "is_starred": bool(
                provider_message.get(
                    "is_starred",
                    draft.get("is_starred"),
                )
            ),
            "is_archived": False,
            "is_spam": False,
            "is_trashed": False,
            "is_deleted_permanently": False,
            "deleted_permanently_at": None,
            "subject": provider_message.get(
                "subject",
                draft.get("subject"),
            ),
            "body_text": provider_message.get(
                "body_text",
                draft.get("body_text"),
            ),
            "body_html": provider_message.get(
                "body_html",
                draft.get("body_html"),
            ),
            "body_preview": provider_message.get(
                "body_preview",
                draft.get("body_preview"),
            ),
            "snippet": provider_message.get(
                "snippet",
                draft.get("snippet"),
            ),
            "message_id_header": provider_message.get(
                "message_id_header",
                draft.get("message_id_header"),
            ),
            "in_reply_to_header": provider_message.get(
                "in_reply_to_header",
                draft.get("in_reply_to_header"),
            ),
            "references_header": provider_message.get(
                "references_header",
                draft.get("references_header"),
            ),
            "sent_at": (
                provider_message.get("sent_at")
                or draft.get("sent_at")
                or now
            ),
            "received_at": None,
            "has_attachments": bool(
                provider_message.get(
                    "has_attachments",
                    draft.get("has_attachments"),
                )
            ),
            "attachment_count": int(
                provider_message.get(
                    "attachment_count",
                    draft.get("attachment_count"),
                )
                or 0
            ),
            "is_provider_deleted": False,
            "provider_deleted_at": None,
            "last_synced_at": now,
            "metadata": metadata,
        }

        response = (
            _supabase()
            .table("mail_messages")
            .update(payload)
            .eq("id", draft["id"])
            .eq("user_id", user_id)
            .execute()
        )

        saved_message = _extract_single(response)

        if not saved_message:
            raise MailSyncError(
                "Microsoft confirmó el envío, pero BeeApp no pudo "
                "actualizar el correo local."
            )

        return str(saved_message["id"])

    except MailSyncError:
        raise

    except Exception as error:
        raise MailSyncError(
            "No fue posible guardar el correo enviado por Microsoft."
        ) from error


def _persist_sent_provider_message(
    *,
    user_id: str,
    draft: dict[str, Any],
    integration: dict[str, Any],
    provider_message: dict[str, Any],
) -> str:
    metadata = provider_message.get("metadata")

    is_microsoft_pending_sync = bool(
        isinstance(metadata, dict)
        and metadata.get(
            "microsoft_sent_message_pending_sync"
        )
    )

    if is_microsoft_pending_sync:
        return _mark_draft_as_sent_from_snapshot(
            user_id=user_id,
            draft=draft,
            integration=integration,
            provider_message=provider_message,
        )

    saved_message = persist_provider_mail_message(
        user_id=user_id,
        integration=integration,
        provider_message=provider_message,
    )

    saved_message_id = str(saved_message["id"])

    if saved_message_id != str(draft["id"]):
        (
            _supabase()
            .table("mail_messages")
            .delete()
            .eq("id", draft["id"])
            .eq("user_id", user_id)
            .execute()
        )

    return saved_message_id


def create_mail_draft(
    *,
    user_id: str,
    integration_id: str,
    to_recipients: list[dict[str, Any]] | None,
    cc_recipients: list[dict[str, Any]] | None,
    bcc_recipients: list[dict[str, Any]] | None,
    subject: str | None,
    body: str | None,
    body_content_type: str,
    file_ids: list[str] | None,
) -> dict[str, Any]:
    integration = _get_active_mail_integration(
        user_id=user_id,
        integration_id=integration_id,
    )
    provider = _get_mail_provider(
        provider_name=integration["provider"],
    )
    access_token = _get_valid_access_token(
        user_id=user_id,
        integration=integration,
    )
    attachments = _load_mail_attachments(
        user_id=user_id,
        file_ids=file_ids,
    )

    try:
        provider_message = provider.create_draft(
            access_token=access_token,
            to_recipients=_normalize_recipients(to_recipients),
            cc_recipients=_normalize_recipients(cc_recipients),
            bcc_recipients=_normalize_recipients(bcc_recipients),
            subject=subject,
            body=body,
            body_content_type=body_content_type,
            attachments=attachments,
        )

        saved_message = persist_provider_mail_message(
            user_id=user_id,
            integration=integration,
            provider_message=provider_message,
        )
        message_id = str(saved_message["id"])

        _replace_storage_attachment_links(
            message_id=message_id,
            attachments=attachments,
        )

        return _serialize_message(
            user_id=user_id,
            message_id=message_id,
        )

    except MailProviderError as error:
        raise MailSyncError(str(error)) from error


def update_mail_draft(
    *,
    user_id: str,
    message_id: str,
    integration_id: str | None,
    to_recipients: list[dict[str, Any]] | None,
    cc_recipients: list[dict[str, Any]] | None,
    bcc_recipients: list[dict[str, Any]] | None,
    subject: str | None,
    body: str | None,
    body_content_type: str,
    file_ids: list[str] | None,
) -> dict[str, Any]:
    draft = _get_draft_message(
        user_id=user_id,
        message_id=message_id,
    )

    effective_integration_id = (
        integration_id
        or str(draft["mail_integration_id"])
    )

    if str(draft["mail_integration_id"]) != str(
        effective_integration_id
    ):
        raise MailMessageNotFoundError(
            "No puedes cambiar la integración de un borrador."
        )

    integration = _get_active_mail_integration(
        user_id=user_id,
        integration_id=str(effective_integration_id),
    )

    if integration["provider"] != draft["provider"]:
        raise MailMessageNotFoundError(
            "La integración no coincide con el proveedor del borrador."
        )

    provider = _get_mail_provider(
        provider_name=integration["provider"],
    )
    access_token = _get_valid_access_token(
        user_id=user_id,
        integration=integration,
    )
    attachments = _load_mail_attachments(
        user_id=user_id,
        file_ids=file_ids,
    )

    try:
        provider_message = provider.update_draft(
            access_token=access_token,
            provider_message_id=draft["provider_message_id"],
            provider_draft_id=_get_gmail_draft_id(
                message=draft
            ),
            to_recipients=_normalize_recipients(to_recipients),
            cc_recipients=_normalize_recipients(cc_recipients),
            bcc_recipients=_normalize_recipients(bcc_recipients),
            subject=subject,
            body=body,
            body_content_type=body_content_type,
            attachments=attachments,
        )

        saved_message = persist_provider_mail_message(
            user_id=user_id,
            integration=integration,
            provider_message=provider_message,
        )
        saved_message_id = str(saved_message["id"])

        _replace_storage_attachment_links(
            message_id=saved_message_id,
            attachments=attachments,
        )

        previous_provider_message_id = str(
            draft["provider_message_id"]
        )

        if (
            previous_provider_message_id
            != provider_message["provider_message_id"]
            and saved_message_id != str(draft["id"])
        ):
            (
                _supabase()
                .table("mail_messages")
                .delete()
                .eq("id", draft["id"])
                .eq("user_id", user_id)
                .execute()
            )

        return _serialize_message(
            user_id=user_id,
            message_id=saved_message_id,
        )

    except MailProviderError as error:
        raise MailSyncError(str(error)) from error


def delete_mail_draft(
    *,
    user_id: str,
    message_id: str,
) -> None:
    draft = _get_draft_message(
        user_id=user_id,
        message_id=message_id,
    )
    integration = _get_active_mail_integration(
        user_id=user_id,
        integration_id=str(draft["mail_integration_id"]),
    )
    provider = _get_mail_provider(
        provider_name=integration["provider"],
    )
    access_token = _get_valid_access_token(
        user_id=user_id,
        integration=integration,
    )

    try:
        provider.delete_draft(
            access_token=access_token,
            provider_message_id=draft["provider_message_id"],
            provider_draft_id=_get_gmail_draft_id(
                message=draft
            ),
        )

        (
            _supabase()
            .table("mail_messages")
            .delete()
            .eq("id", message_id)
            .eq("user_id", user_id)
            .execute()
        )

    except MailProviderError as error:
        raise MailSyncError(str(error)) from error


def send_mail_draft(
    *,
    user_id: str,
    message_id: str,
) -> dict[str, Any]:
    draft = _get_draft_message(
        user_id=user_id,
        message_id=message_id,
    )
    integration = _get_active_mail_integration(
        user_id=user_id,
        integration_id=str(draft["mail_integration_id"]),
    )

    if integration["provider"] != draft["provider"]:
        raise MailMessageNotFoundError(
            "La integración no coincide con el proveedor del borrador."
        )

    draft_snapshot = _build_draft_snapshot(
        draft=draft,
    )

    validate_sendable_draft(
        to_recipients=normalize_recipients(
            draft_snapshot["recipients"]["to"]
        ),
        cc_recipients=normalize_recipients(
            draft_snapshot["recipients"]["cc"]
        ),
        bcc_recipients=normalize_recipients(
            draft_snapshot["recipients"]["bcc"]
        ),
    )

    provider = _get_mail_provider(
        provider_name=integration["provider"],
    )
    access_token = _get_valid_access_token(
        user_id=user_id,
        integration=integration,
    )

    try:
        provider_message = provider.send_draft(
            access_token=access_token,
            provider_message_id=draft["provider_message_id"],
            provider_draft_id=_get_gmail_draft_id(
                message=draft
            ),
            draft_snapshot=draft_snapshot,
        )

        saved_message_id = _persist_sent_provider_message(
            user_id=user_id,
            draft=draft,
            integration=integration,
            provider_message=provider_message,
        )

        return _serialize_message(
            user_id=user_id,
            message_id=saved_message_id,
        )

    except MailProviderError as error:
        raise MailSyncError(str(error)) from error