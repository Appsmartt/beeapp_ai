from __future__ import annotations

from typing import Any

from apps.mail.exceptions import (
    MailMessageNotFoundError,
    MailSyncError,
)
from apps.mail.services.mail_provider_service import (
    MailProviderError,
    normalize_recipients,
    validate_sendable_draft,
)
from apps.mail.services.mail_sync import (
    persist_provider_mail_message,
)

from .attachments import (
    load_mail_attachments,
    replace_storage_attachment_links,
    validate_draft_storage_attachment_access,
)
from .database import (
    get_active_mail_integration,
    get_draft_message,
    get_supabase,
)
from .integration import (
    get_mail_provider,
    get_valid_access_token,
)
from .persistence import persist_sent_provider_message
from .recipients import (
    get_google_draft_id,
    normalize_draft_recipients,
)
from .serialization import (
    build_draft_snapshot,
    serialize_message,
)


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
    integration = get_active_mail_integration(
        user_id=user_id,
        integration_id=integration_id,
    )
    provider = get_mail_provider(
        provider_name=integration["provider"],
    )
    access_token = get_valid_access_token(
        user_id=user_id,
        integration=integration,
    )
    attachments = load_mail_attachments(
        user_id=user_id,
        file_ids=file_ids,
    )

    try:
        provider_message = provider.create_draft(
            access_token=access_token,
            to_recipients=normalize_draft_recipients(
                to_recipients
            ),
            cc_recipients=normalize_draft_recipients(
                cc_recipients
            ),
            bcc_recipients=normalize_draft_recipients(
                bcc_recipients
            ),
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

        replace_storage_attachment_links(
            message_id=message_id,
            attachments=attachments,
        )

        return serialize_message(
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
    draft = get_draft_message(
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

    integration = get_active_mail_integration(
        user_id=user_id,
        integration_id=str(effective_integration_id),
    )

    if integration["provider"] != draft["provider"]:
        raise MailMessageNotFoundError(
            "La integración no coincide con el proveedor del borrador."
        )

    provider = get_mail_provider(
        provider_name=integration["provider"],
    )
    access_token = get_valid_access_token(
        user_id=user_id,
        integration=integration,
    )
    attachments = load_mail_attachments(
        user_id=user_id,
        file_ids=file_ids,
    )

    try:
        provider_message = provider.update_draft(
            access_token=access_token,
            provider_message_id=draft["provider_message_id"],
            provider_draft_id=get_google_draft_id(
                message=draft
            ),
            to_recipients=normalize_draft_recipients(
                to_recipients
            ),
            cc_recipients=normalize_draft_recipients(
                cc_recipients
            ),
            bcc_recipients=normalize_draft_recipients(
                bcc_recipients
            ),
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

        replace_storage_attachment_links(
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
                get_supabase()
                .table("mail_messages")
                .delete()
                .eq("id", draft["id"])
                .eq("user_id", user_id)
                .execute()
            )

        return serialize_message(
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
    draft = get_draft_message(
        user_id=user_id,
        message_id=message_id,
    )
    integration = get_active_mail_integration(
        user_id=user_id,
        integration_id=str(draft["mail_integration_id"]),
    )
    provider = get_mail_provider(
        provider_name=integration["provider"],
    )
    access_token = get_valid_access_token(
        user_id=user_id,
        integration=integration,
    )

    try:
        provider.delete_draft(
            access_token=access_token,
            provider_message_id=draft["provider_message_id"],
            provider_draft_id=get_google_draft_id(
                message=draft
            ),
        )

        (
            get_supabase()
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
    draft = get_draft_message(
        user_id=user_id,
        message_id=message_id,
    )
    integration = get_active_mail_integration(
        user_id=user_id,
        integration_id=str(draft["mail_integration_id"]),
    )

    if integration["provider"] != draft["provider"]:
        raise MailMessageNotFoundError(
            "La integración no coincide con el proveedor del borrador."
        )

    draft_snapshot = build_draft_snapshot(
        draft=draft,
    )

    validate_draft_storage_attachment_access(
        user_id=user_id,
        attachments=draft_snapshot["attachments"],
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

    provider = get_mail_provider(
        provider_name=integration["provider"],
    )
    access_token = get_valid_access_token(
        user_id=user_id,
        integration=integration,
    )

    try:
        provider_message = provider.send_draft(
            access_token=access_token,
            provider_message_id=draft["provider_message_id"],
            provider_draft_id=get_google_draft_id(
                message=draft
            ),
            draft_snapshot=draft_snapshot,
        )

        saved_message_id = persist_sent_provider_message(
            user_id=user_id,
            draft=draft,
            integration=integration,
            provider_message=provider_message,
        )

        return serialize_message(
            user_id=user_id,
            message_id=saved_message_id,
        )

    except MailProviderError as error:
        raise MailSyncError(str(error)) from error
