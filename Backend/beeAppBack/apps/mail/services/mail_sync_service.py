from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
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
    MailSyncError,
)
from apps.mail.services.google_mail_provider_service import (
    GoogleMailProvider,
)
from apps.mail.services.mail_provider_service import (
    MailProviderError,
)
from apps.mail.services.microsoft_mail_provider_service import (
    MicrosoftMailProvider,
)
from apps.notifications.services.notification_service import (
    create_mail_message_received_notification,
)


logger = logging.getLogger(__name__)


INITIAL_SYNC_LOOKBACK_DAYS = 90
INITIAL_SYNC_MAX_MESSAGES = 10
INITIAL_SYNC_MAX_SPAM_MESSAGES = 10

INCREMENTAL_SYNC_LOOKBACK_DAYS = 90
INCREMENTAL_SYNC_MAX_MESSAGES = 10
INCREMENTAL_SYNC_MAX_SPAM_MESSAGES = 10

MAIL_INTEGRATION_COLUMNS = (
    "id,user_id,integration_connection_id,provider,"
    "provider_account_id,provider_email,provider_display_name,"
    "status,connected_at,initial_sync_completed_at,"
    "initial_sync_started_at,last_successful_sync_at,"
    "last_attempted_sync_at,next_sync_at,sync_cursor,"
    "sync_cursor_updated_at,reauth_required_at,disconnected_at,"
    "last_error_code,last_error_message,metadata,"
    "created_at,updated_at"
)


def _supabase():
    return get_supabase_admin_client()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_now_iso() -> str:
    return _utc_now().isoformat()


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


def _get_mail_integration(
    *,
    user_id: str,
    integration_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("mail_integrations")
            .select(MAIL_INTEGRATION_COLUMNS)
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

        if integration["status"] != "active":
            raise MailIntegrationInactiveError(
                integration.get("last_error_message")
                or "La integración de Email requiere reconexión."
            )

        if not integration.get("integration_connection_id"):
            raise MailIntegrationInactiveError(
                "La integración de Email no tiene conexión OAuth."
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


def _get_mail_provider(
    provider: str,
):
    normalized_provider = str(provider or "").strip().lower()

    if normalized_provider == "google":
        return GoogleMailProvider()

    if normalized_provider == "microsoft":
        return MicrosoftMailProvider()

    raise MailSyncError(
        f"El proveedor {normalized_provider} no está implementado."
    )


def _get_valid_access_token(
    *,
    user_id: str,
    integration: dict[str, Any],
) -> str:
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


def _create_sync_run(
    *,
    user_id: str,
    integration: dict[str, Any],
    trigger: str,
    is_full_sync: bool,
) -> dict[str, Any]:
    now = _utc_now_iso()

    try:
        response = (
            _supabase()
            .table("mail_sync_runs")
            .insert(
                {
                    "user_id": user_id,
                    "mail_integration_id": integration["id"],
                    "trigger": trigger,
                    "status": "running",
                    "is_full_sync": is_full_sync,
                    "started_at": now,
                    "cursor_before": integration.get(
                        "sync_cursor"
                    ),
                    "metadata": {
                        "provider": integration["provider"],
                        "requested_at": now,
                    },
                }
            )
            .execute()
        )

        sync_run = _extract_single(response)

        if not sync_run:
            raise MailSyncError(
                "No fue posible crear el registro de sincronización."
            )

        return sync_run

    except MailSyncError:
        raise

    except Exception as error:
        raise MailSyncError(
            "No fue posible crear el registro de sincronización."
        ) from error


def _mark_sync_run_succeeded(
    *,
    sync_run_id: str,
    counts: dict[str, int],
    cursor_after: str | None,
    metadata: dict[str, Any],
) -> dict[str, Any] | None:
    now = _utc_now_iso()

    try:
        response = (
            _supabase()
            .table("mail_sync_runs")
            .update(
                {
                    "status": "succeeded",
                    "completed_at": now,
                    "messages_fetched_count": counts["fetched"],
                    "messages_created_count": counts["created"],
                    "messages_updated_count": counts["updated"],
                    "messages_deleted_count": counts["deleted"],
                    "messages_skipped_count": counts["skipped"],
                    "cursor_after": cursor_after,
                    "metadata": metadata,
                }
            )
            .eq("id", sync_run_id)
            .execute()
        )

        return _extract_single(response)

    except Exception:
        return None


def _mark_sync_run_failed(
    *,
    sync_run_id: str,
    error_code: str,
    error_message: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    now = _utc_now_iso()

    try:
        response = (
            _supabase()
            .table("mail_sync_runs")
            .update(
                {
                    "status": "failed",
                    "completed_at": now,
                    "error_code": error_code[:120],
                    "error_message": error_message[:500],
                    "metadata": metadata or {},
                }
            )
            .eq("id", sync_run_id)
            .execute()
        )

        return _extract_single(response)

    except Exception:
        return None


def _mark_mail_integration_sync_success(
    *,
    integration_id: str,
    cursor_after: str | None,
    initial_sync: bool,
) -> None:
    now = _utc_now_iso()

    payload: dict[str, Any] = {
        "status": "active",
        "last_attempted_sync_at": now,
        "last_successful_sync_at": now,
        "next_sync_at": (
            _utc_now() + timedelta(minutes=10)
        ).isoformat(),
        "last_error_code": None,
        "last_error_message": None,
    }

    if cursor_after:
        payload["sync_cursor"] = cursor_after
        payload["sync_cursor_updated_at"] = now

    if initial_sync:
        payload["initial_sync_completed_at"] = now

    try:
        (
            _supabase()
            .table("mail_integrations")
            .update(payload)
            .eq("id", integration_id)
            .execute()
        )
    except Exception as error:
        raise MailSyncError(
            "No fue posible actualizar el estado de sincronización."
        ) from error


def _mark_mail_integration_sync_failure(
    *,
    integration_id: str,
    error_code: str,
    error_message: str,
) -> None:
    now = _utc_now_iso()

    try:
        (
            _supabase()
            .table("mail_integrations")
            .update(
                {
                    "last_attempted_sync_at": now,
                    "next_sync_at": (
                        _utc_now() + timedelta(minutes=10)
                    ).isoformat(),
                    "last_error_code": error_code[:120],
                    "last_error_message": error_message[:500],
                }
            )
            .eq("id", integration_id)
            .execute()
        )
    except Exception:
        return


def _find_existing_message(
    *,
    user_id: str,
    mail_integration_id: str,
    provider_message_id: str,
) -> dict[str, Any] | None:
    try:
        response = (
            _supabase()
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

        return _extract_single(response)

    except Exception as error:
        raise MailSyncError(
            "No fue posible buscar un correo existente."
        ) from error


def _provider_message_is_unchanged(
    *,
    existing_message: dict[str, Any] | None,
    provider_message: dict[str, Any],
) -> bool:
    if not existing_message:
        return False

    provider_change_key = str(
        provider_message.get("provider_change_key") or ""
    ).strip()
    existing_change_key = str(
        existing_message.get("provider_change_key") or ""
    ).strip()

    if (
        provider_change_key
        and existing_change_key
        and provider_change_key == existing_change_key
    ):
        return True

    provider_etag = str(
        provider_message.get("provider_etag") or ""
    ).strip()
    existing_etag = str(
        existing_message.get("provider_etag") or ""
    ).strip()

    return bool(
        provider_etag
        and existing_etag
        and provider_etag == existing_etag
    )


def _build_message_payload(
    *,
    user_id: str,
    integration: dict[str, Any],
    provider_message: dict[str, Any],
    existing_message: dict[str, Any] | None,
) -> dict[str, Any]:
    metadata = provider_message.get("metadata")

    normalized_metadata = (
        metadata
        if isinstance(metadata, dict)
        else {}
    )

    existing_metadata = (
        existing_message.get("metadata")
        if existing_message
        and isinstance(existing_message.get("metadata"), dict)
        else {}
    )

    merged_metadata = {
        **existing_metadata,
        **normalized_metadata,
        "last_synced_at": _utc_now_iso(),
    }

    return {
        "user_id": user_id,
        "mail_integration_id": integration["id"],
        "provider": integration["provider"],
        "provider_message_id": provider_message[
            "provider_message_id"
        ],
        "provider_thread_id": provider_message.get(
            "provider_thread_id"
        ),
        "provider_conversation_id": provider_message.get(
            "provider_conversation_id"
        ),
        "provider_change_key": provider_message.get(
            "provider_change_key"
        ),
        "provider_etag": provider_message.get("provider_etag"),
        "provider_web_link": provider_message.get(
            "provider_web_link"
        ),
        "provider_created_at": provider_message.get(
            "provider_created_at"
        ),
        "provider_updated_at": provider_message.get(
            "provider_updated_at"
        ),
        "direction": provider_message["direction"],
        "status": provider_message["status"],
        "folder": provider_message["folder"],
        "is_read": bool(provider_message["is_read"]),
        "is_starred": bool(
            provider_message.get(
                "is_starred",
                existing_message.get("is_starred")
                if existing_message
                else False,
            )
        ),
        "is_archived": bool(provider_message["is_archived"]),
        "is_spam": bool(provider_message["is_spam"]),
        "is_trashed": bool(provider_message["is_trashed"]),
        "is_deleted_permanently": bool(
            existing_message.get("is_deleted_permanently")
            if existing_message
            else False
        ),
        "deleted_permanently_at": None,
        "subject": provider_message.get("subject"),
        "body_text": provider_message.get("body_text"),
        "body_html": provider_message.get("body_html"),
        "body_preview": provider_message.get("body_preview"),
        "snippet": provider_message.get("snippet"),
        "message_id_header": provider_message.get(
            "message_id_header"
        ),
        "in_reply_to_header": provider_message.get(
            "in_reply_to_header"
        ),
        "references_header": provider_message.get(
            "references_header"
        ),
        "sent_at": provider_message.get("sent_at"),
        "received_at": provider_message.get("received_at"),
        "has_attachments": bool(
            provider_message.get("has_attachments")
        ),
        "attachment_count": int(
            provider_message.get("attachment_count") or 0
        ),
        "is_provider_deleted": False,
        "provider_deleted_at": None,
        "last_synced_at": _utc_now_iso(),
        "metadata": merged_metadata,
    }


def _replace_message_recipients(
    *,
    message_id: str,
    recipients: dict[str, Any],
) -> None:
    try:
        (
            _supabase()
            .table("mail_message_recipients")
            .delete()
            .eq("message_id", message_id)
            .execute()
        )

        recipient_rows: list[dict[str, Any]] = []

        for recipient_kind in (
            "from",
            "to",
            "cc",
            "bcc",
            "reply_to",
        ):
            values = recipients.get(recipient_kind)

            if not isinstance(values, list):
                continue

            for position, recipient in enumerate(values):
                if not isinstance(recipient, dict):
                    continue

                email = str(recipient.get("email") or "").strip()

                if not email:
                    continue

                recipient_rows.append(
                    {
                        "message_id": message_id,
                        "recipient_kind": recipient_kind,
                        "email": email[:320],
                        "display_name": (
                            str(
                                recipient.get("display_name")
                                or ""
                            ).strip()[:500]
                            or None
                        ),
                        "position": position,
                        "metadata": {},
                    }
                )

        if recipient_rows:
            (
                _supabase()
                .table("mail_message_recipients")
                .insert(recipient_rows)
                .execute()
            )

    except Exception as error:
        raise MailSyncError(
            "No fue posible guardar los destinatarios del correo."
        ) from error


def _replace_message_attachments(
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
            .eq("source", "provider")
            .execute()
        )

        attachment_rows: list[dict[str, Any]] = []

        for attachment in attachments:
            if not isinstance(attachment, dict):
                continue

            filename = str(
                attachment.get("filename") or ""
            ).strip()

            if not filename:
                continue

            attachment_rows.append(
                {
                    "message_id": message_id,
                    "storage_file_id": None,
                    "source": "provider",
                    "provider_attachment_id": attachment.get(
                        "provider_attachment_id"
                    ),
                    "provider_message_attachment_id": (
                        attachment.get(
                            "provider_message_attachment_id"
                        )
                    ),
                    "filename": filename[:255],
                    "mime_type": (
                        str(
                            attachment.get("mime_type")
                            or "application/octet-stream"
                        ).strip()
                        or "application/octet-stream"
                    ),
                    "size_bytes": attachment.get("size_bytes"),
                    "content_id": attachment.get("content_id"),
                    "content_disposition": attachment.get(
                        "content_disposition"
                    ),
                    "is_inline": bool(
                        attachment.get("is_inline")
                    ),
                    "checksum_sha256": attachment.get(
                        "checksum_sha256"
                    ),
                    "metadata": (
                        attachment.get("metadata")
                        if isinstance(
                            attachment.get("metadata"),
                            dict,
                        )
                        else {}
                    ),
                }
            )

        if attachment_rows:
            (
                _supabase()
                .table("mail_message_attachments")
                .insert(attachment_rows)
                .execute()
            )

    except Exception as error:
        raise MailSyncError(
            "No fue posible guardar los adjuntos del correo."
        ) from error


def _get_sender(
    *,
    provider_message: dict[str, Any],
) -> tuple[str | None, str | None]:
    recipients = provider_message.get("recipients")

    if not isinstance(recipients, dict):
        return None, None

    from_recipients = recipients.get("from")

    if not isinstance(from_recipients, list):
        return None, None

    for recipient in from_recipients:
        if not isinstance(recipient, dict):
            continue

        sender_email = str(
            recipient.get("email") or ""
        ).strip() or None

        sender_name = str(
            recipient.get("display_name") or ""
        ).strip() or None

        if sender_name or sender_email:
            return sender_name, sender_email

    return None, None


def _is_notifiable_incoming_message(
    *,
    provider_message: dict[str, Any],
) -> bool:
    return (
        str(provider_message.get("direction") or "")
        .strip()
        .lower()
        == "inbound"
        and str(provider_message.get("folder") or "")
        .strip()
        .lower()
        == "inbox"
        and not bool(provider_message.get("is_spam"))
        and not bool(provider_message.get("is_trashed"))
    )


def _create_new_mail_notification(
    *,
    user_id: str,
    integration: dict[str, Any],
    message_id: str,
    provider_message: dict[str, Any],
    initial_sync: bool,
) -> None:
    if initial_sync:
        return

    if not _is_notifiable_incoming_message(
        provider_message=provider_message,
    ):
        return

    sender_name, sender_email = _get_sender(
        provider_message=provider_message,
    )

    create_mail_message_received_notification(
        recipient_id=user_id,
        message_id=message_id,
        mail_integration_id=str(integration["id"]),
        provider=str(integration["provider"]),
        sender_name=sender_name,
        sender_email=sender_email,
        subject=provider_message.get("subject"),
        body_preview=(
            provider_message.get("body_preview")
            or provider_message.get("snippet")
        ),
        received_at=provider_message.get("received_at"),
    )


def _upsert_provider_message(
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

    existing_message = _find_existing_message(
        user_id=user_id,
        mail_integration_id=str(integration["id"]),
        provider_message_id=provider_message_id,
    )

    if _provider_message_is_unchanged(
        existing_message=existing_message,
        provider_message=provider_message,
    ):
        return False, True, str(existing_message["id"])

    payload = _build_message_payload(
        user_id=user_id,
        integration=integration,
        provider_message=provider_message,
        existing_message=existing_message,
    )

    try:
        if existing_message:
            response = (
                _supabase()
                .table("mail_messages")
                .update(payload)
                .eq("id", existing_message["id"])
                .execute()
            )
            message = _extract_single(response)
            created = False
        else:
            response = (
                _supabase()
                .table("mail_messages")
                .insert(payload)
                .execute()
            )
            message = _extract_single(response)
            created = True

        if not message:
            raise MailSyncError(
                "No fue posible guardar el correo."
            )

        _replace_message_recipients(
            message_id=str(message["id"]),
            recipients=(
                provider_message.get("recipients")
                if isinstance(
                    provider_message.get("recipients"),
                    dict,
                )
                else {}
            ),
        )

        _replace_message_attachments(
            message_id=str(message["id"]),
            attachments=(
                provider_message.get("attachments")
                if isinstance(
                    provider_message.get("attachments"),
                    list,
                )
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


def _get_sync_window(
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
            _utc_now()
            - timedelta(days=INITIAL_SYNC_LOOKBACK_DAYS),
            INITIAL_SYNC_MAX_MESSAGES,
            INITIAL_SYNC_MAX_SPAM_MESSAGES,
            True,
        )

    return (
        _utc_now()
        - timedelta(days=INCREMENTAL_SYNC_LOOKBACK_DAYS),
        INCREMENTAL_SYNC_MAX_MESSAGES,
        INCREMENTAL_SYNC_MAX_SPAM_MESSAGES,
        False,
    )


def _get_provider_message_ids(
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

    for message_id in [
        *normal_message_ids,
        *spam_message_ids,
    ]:
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


def _get_provider_message(
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


def sync_mail_integration(
    *,
    user_id: str,
    integration_id: str,
    trigger: str = "manual",
    force_full_sync: bool = False,
) -> dict[str, Any]:
    integration = _get_mail_integration(
        user_id=user_id,
        integration_id=integration_id,
    )

    (
        after,
        max_messages,
        max_spam_messages,
        initial_sync,
    ) = _get_sync_window(
        integration=integration,
        force_full_sync=force_full_sync,
    )

    sync_run = _create_sync_run(
        user_id=user_id,
        integration=integration,
        trigger=trigger,
        is_full_sync=initial_sync,
    )

    sync_run_id = str(sync_run["id"])

    counts = {
        "fetched": 0,
        "created": 0,
        "updated": 0,
        "deleted": 0,
        "skipped": 0,
    }

    logger.info(
        "Mail sync started. integration_id=%s provider=%s "
        "trigger=%s initial_sync=%s max_messages=%s "
        "max_spam_messages=%s after=%s",
        integration_id,
        integration["provider"],
        trigger,
        initial_sync,
        max_messages,
        max_spam_messages,
        after.isoformat(),
    )

    try:
        access_token = _get_valid_access_token(
            user_id=user_id,
            integration=integration,
        )

        provider = _get_mail_provider(
            str(integration["provider"])
        )

        (
            provider_message_ids,
            cursor_after,
            source_counts,
        ) = _get_provider_message_ids(
            provider=provider,
            access_token=access_token,
            after=after,
            max_messages=max_messages,
            max_spam_messages=max_spam_messages,
        )

        logger.info(
            "Mail sync listed provider messages. "
            "integration_id=%s provider=%s normal=%s spam=%s unique=%s",
            integration_id,
            integration["provider"],
            source_counts["normal_message_count"],
            source_counts["spam_message_count"],
            source_counts["unique_message_count"],
        )

        for index, provider_message_id in enumerate(
            provider_message_ids,
            start=1,
        ):
            try:
                provider_message = _get_provider_message(
                    provider=provider,
                    access_token=access_token,
                    provider_message_id=provider_message_id,
                    load_attachments=True,
                )

                (
                    created,
                    skipped,
                    saved_message_id,
                ) = _upsert_provider_message(
                    user_id=user_id,
                    integration=integration,
                    provider_message=provider_message,
                )

                counts["fetched"] += 1

                if skipped:
                    counts["skipped"] += 1
                elif created:
                    counts["created"] += 1

                    if saved_message_id:
                        _create_new_mail_notification(
                            user_id=user_id,
                            integration=integration,
                            message_id=saved_message_id,
                            provider_message=provider_message,
                            initial_sync=initial_sync,
                        )
                else:
                    counts["updated"] += 1

                logger.info(
                    "Mail sync progress. integration_id=%s "
                    "message=%s/%s created=%s updated=%s skipped=%s",
                    integration_id,
                    index,
                    len(provider_message_ids),
                    counts["created"],
                    counts["updated"],
                    counts["skipped"],
                )

            except MailProviderError as error:
                counts["skipped"] += 1

                logger.warning(
                    "Mail provider message skipped. "
                    "provider=%s integration_id=%s "
                    "provider_message_id=%s error=%s",
                    integration["provider"],
                    integration_id,
                    provider_message_id,
                    str(error),
                )

            except MailSyncError as error:
                counts["skipped"] += 1

                logger.warning(
                    "Mail persistence message skipped. "
                    "provider=%s integration_id=%s "
                    "provider_message_id=%s error=%s",
                    integration["provider"],
                    integration_id,
                    provider_message_id,
                    str(error),
                )

        _mark_mail_integration_sync_success(
            integration_id=integration_id,
            cursor_after=cursor_after,
            initial_sync=initial_sync,
        )

        completed_sync_run = _mark_sync_run_succeeded(
            sync_run_id=sync_run_id,
            counts=counts,
            cursor_after=cursor_after,
            metadata={
                "provider": integration["provider"],
                "after": after.isoformat(),
                "max_messages": max_messages,
                "max_spam_messages": max_spam_messages,
                "initial_sync": initial_sync,
                "normal_message_id_count": (
                    source_counts["normal_message_count"]
                ),
                "spam_message_id_count": (
                    source_counts["spam_message_count"]
                ),
                "unique_message_id_count": (
                    source_counts["unique_message_count"]
                ),
                "attachment_metadata_loaded": True,
                "attachment_content_downloaded": False,
            },
        )

        logger.info(
            "Mail sync completed. integration_id=%s provider=%s "
            "fetched=%s created=%s updated=%s skipped=%s",
            integration_id,
            integration["provider"],
            counts["fetched"],
            counts["created"],
            counts["updated"],
            counts["skipped"],
        )

        return {
            "integration_id": integration_id,
            "provider": integration["provider"],
            "sync_run": completed_sync_run or sync_run,
            "fetched_message_count": counts["fetched"],
            "created_message_count": counts["created"],
            "updated_message_count": counts["updated"],
            "skipped_message_count": counts["skipped"],
            "initial_sync": initial_sync,
            "cursor_after": cursor_after,
        }

    except (
        MailIntegrationInactiveError,
        MailIntegrationNotFoundError,
    ):
        _mark_sync_run_failed(
            sync_run_id=sync_run_id,
            error_code="integration_inactive",
            error_message=(
                "La integración de Email no está disponible."
            ),
        )
        raise

    except MailProviderError as error:
        _mark_mail_integration_sync_failure(
            integration_id=integration_id,
            error_code="provider_error",
            error_message=str(error),
        )

        _mark_sync_run_failed(
            sync_run_id=sync_run_id,
            error_code="provider_error",
            error_message=str(error),
        )

        logger.exception(
            "Mail sync provider failure. integration_id=%s",
            integration_id,
        )

        raise MailSyncError(str(error)) from error

    except MailSyncError as error:
        _mark_mail_integration_sync_failure(
            integration_id=integration_id,
            error_code="mail_sync_error",
            error_message=str(error),
        )

        _mark_sync_run_failed(
            sync_run_id=sync_run_id,
            error_code="mail_sync_error",
            error_message=str(error),
        )

        logger.exception(
            "Mail sync persistence failure. integration_id=%s",
            integration_id,
        )

        raise

    except Exception as error:
        _mark_mail_integration_sync_failure(
            integration_id=integration_id,
            error_code="unexpected_sync_error",
            error_message=str(error),
        )

        _mark_sync_run_failed(
            sync_run_id=sync_run_id,
            error_code="unexpected_sync_error",
            error_message=str(error),
        )

        logger.exception(
            "Mail sync unexpected failure. integration_id=%s",
            integration_id,
        )

        raise MailSyncError(
            "No fue posible sincronizar la cuenta de Email."
        ) from error


def sync_due_mail_integrations() -> dict[str, int]:
    try:
        now = _utc_now_iso()

        response = (
            _supabase()
            .table("mail_integrations")
            .select(MAIL_INTEGRATION_COLUMNS)
            .eq("status", "active")
            .or_(
                "next_sync_at.is.null,"
                f"next_sync_at.lte.{now}"
            )
            .execute()
        )

        integrations = _response_data(response)

    except Exception as error:
        raise MailSyncError(
            "No fue posible cargar las cuentas pendientes de sync."
        ) from error

    processed_count = 0
    synced_count = 0
    failed_count = 0
    message_count = 0

    for integration in integrations:
        processed_count += 1

        try:
            result = sync_mail_integration(
                user_id=str(integration["user_id"]),
                integration_id=str(integration["id"]),
                trigger="scheduled",
                force_full_sync=False,
            )

            synced_count += 1
            message_count += int(
                result["created_message_count"]
            ) + int(result["updated_message_count"])

        except MailSyncError:
            failed_count += 1

    return {
        "processed_integration_count": processed_count,
        "synced_integration_count": synced_count,
        "failed_integration_count": failed_count,
        "synced_message_count": message_count,
    }


def persist_provider_mail_message(
    *,
    user_id: str,
    integration: dict[str, Any],
    provider_message: dict[str, Any],
) -> dict[str, Any]:
    """
    Persiste un correo ya obtenido desde Google o Microsoft.

    Reutiliza el mismo flujo de persistencia para mensajes,
    destinatarios y metadatos de adjuntos.
    """
    try:
        _, _, message_id = _upsert_provider_message(
            user_id=user_id,
            integration=integration,
            provider_message=provider_message,
        )

        if not message_id:
            raise MailSyncError(
                "No fue posible recuperar el correo guardado."
            )

        return {
            "id": message_id,
        }

    except MailSyncError:
        raise

    except Exception as error:
        raise MailSyncError(
            "No fue posible persistir el correo del proveedor."
        ) from error