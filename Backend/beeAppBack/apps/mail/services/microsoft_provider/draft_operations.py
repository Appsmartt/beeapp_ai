"""Microsoft Graph draft creation, update, deletion and send operations."""

from __future__ import annotations

from datetime import datetime, timezone
import logging
from typing import Any
from urllib.parse import quote

from apps.mail.services.mail_provider_service import (
    MailProviderError,
    validate_mail_attachments,
    validate_sendable_draft,
)
from apps.mail.services.microsoft_provider.attachment_service import (
    MicrosoftAttachmentService,
)
from apps.mail.services.microsoft_provider.constants import (
    MICROSOFT_MESSAGES_ENDPOINT,
)
from apps.mail.services.microsoft_provider.draft_payloads import (
    build_draft_payload,
    normalize_draft_snapshot,
)
from apps.mail.services.microsoft_provider.graph_client import (
    MicrosoftGraphClient,
)
from apps.mail.services.microsoft_provider.message_normalizer import (
    normalize_string,
    require_message_id,
)
from apps.mail.services.microsoft_provider.message_operations import (
    MicrosoftMessageOperations,
)


logger = logging.getLogger(__name__)


class MicrosoftDraftOperations:
    """Perform Microsoft Graph draft operations."""

    def __init__(
        self,
        *,
        graph_client: MicrosoftGraphClient,
        attachment_service: MicrosoftAttachmentService,
        message_operations: MicrosoftMessageOperations,
    ) -> None:
        self._graph_client = graph_client
        self._attachment_service = attachment_service
        self._message_operations = message_operations

    def create_draft(
        self,
        *,
        access_token: str,
        to_recipients: list[dict[str, str | None]],
        cc_recipients: list[dict[str, str | None]],
        bcc_recipients: list[dict[str, str | None]],
        subject: str | None,
        body: str | None,
        body_content_type: str,
        attachments: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Create a remote draft and replace its attachments."""
        payload = build_draft_payload(
            to_recipients=to_recipients,
            cc_recipients=cc_recipients,
            bcc_recipients=bcc_recipients,
            subject=subject,
            body=body,
            body_content_type=body_content_type,
            attachments=attachments,
        )
        normalized_attachments = validate_mail_attachments(attachments)
        data = self._graph_client.request(
            method="POST",
            url=MICROSOFT_MESSAGES_ENDPOINT,
            access_token=access_token,
            json=payload,
        )
        provider_message_id = require_message_id(
            normalize_string(data.get("id"))
        )

        self._attachment_service.replace_draft_attachments(
            access_token=access_token,
            provider_message_id=provider_message_id,
            attachments=normalized_attachments,
        )

        return self._message_operations.get_message(
            access_token=access_token,
            provider_message_id=provider_message_id,
            include_attachments=True,
        )

    def update_draft(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        provider_draft_id: str | None,
        to_recipients: list[dict[str, str | None]],
        cc_recipients: list[dict[str, str | None]],
        bcc_recipients: list[dict[str, str | None]],
        subject: str | None,
        body: str | None,
        body_content_type: str,
        attachments: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Replace remote draft fields and attachments."""
        normalized_message_id = require_message_id(provider_message_id)
        payload = build_draft_payload(
            to_recipients=to_recipients,
            cc_recipients=cc_recipients,
            bcc_recipients=bcc_recipients,
            subject=subject,
            body=body,
            body_content_type=body_content_type,
            attachments=attachments,
        )
        normalized_attachments = validate_mail_attachments(attachments)
        encoded_message_id = quote(normalized_message_id, safe="")

        self._graph_client.request(
            method="PATCH",
            url=(
                f"{MICROSOFT_MESSAGES_ENDPOINT}/"
                f"{encoded_message_id}"
            ),
            access_token=access_token,
            json=payload,
            allow_empty_response=True,
        )
        self._attachment_service.replace_draft_attachments(
            access_token=access_token,
            provider_message_id=normalized_message_id,
            attachments=normalized_attachments,
        )

        return self._message_operations.get_message(
            access_token=access_token,
            provider_message_id=normalized_message_id,
            include_attachments=True,
        )

    def delete_draft(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        provider_draft_id: str | None,
    ) -> None:
        """Delete a remote Microsoft draft."""
        normalized_message_id = require_message_id(provider_message_id)
        encoded_message_id = quote(normalized_message_id, safe="")

        self._graph_client.request(
            method="DELETE",
            url=(
                f"{MICROSOFT_MESSAGES_ENDPOINT}/"
                f"{encoded_message_id}"
            ),
            access_token=access_token,
            allow_empty_response=True,
        )

    def send_draft(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        provider_draft_id: str | None,
        draft_snapshot: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Send a draft and return a sent resource or safe sync fallback."""
        normalized_message_id = require_message_id(provider_message_id)
        normalized_snapshot = normalize_draft_snapshot(
            provider_message_id=normalized_message_id,
            draft_snapshot=draft_snapshot,
        )
        validate_sendable_draft(
            to_recipients=normalized_snapshot["recipients"]["to"],
            cc_recipients=normalized_snapshot["recipients"]["cc"],
            bcc_recipients=normalized_snapshot["recipients"]["bcc"],
        )
        encoded_message_id = quote(normalized_message_id, safe="")

        self._graph_client.request(
            method="POST",
            url=(
                f"{MICROSOFT_MESSAGES_ENDPOINT}/"
                f"{encoded_message_id}/send"
            ),
            access_token=access_token,
            json={},
            allow_empty_response=True,
        )

        sent_message = self._get_sent_message_if_available(
            access_token=access_token,
            provider_message_id=normalized_message_id,
        )

        if sent_message:
            return sent_message

        now = datetime.now(timezone.utc).isoformat()
        metadata = dict(normalized_snapshot.get("metadata") or {})
        metadata.update(
            {
                "microsoft_draft_sent": True,
                "microsoft_sent_message_pending_sync": True,
                "microsoft_immutable_message_id": (
                    normalized_message_id
                ),
                "microsoft_sent_requested_at": now,
            }
        )

        return {
            **normalized_snapshot,
            "provider_message_id": normalized_message_id,
            "provider_updated_at": now,
            "direction": "outbound",
            "status": "sent",
            "folder": "sent",
            "is_read": True,
            "is_archived": False,
            "is_spam": False,
            "is_trashed": False,
            "sent_at": normalized_snapshot.get("sent_at") or now,
            "received_at": None,
            "metadata": metadata,
        }

    def _get_sent_message_if_available(
        self,
        *,
        access_token: str,
        provider_message_id: str,
    ) -> dict[str, Any] | None:
        try:
            message = self._message_operations.get_message(
                access_token=access_token,
                provider_message_id=provider_message_id,
                include_attachments=True,
            )

            if message.get("status") == "sent":
                return message
        except MailProviderError as error:
            logger.info(
                "Microsoft sent message is not yet readable. "
                "provider_message_id=%s detail=%s",
                provider_message_id,
                str(error),
            )

        return None
