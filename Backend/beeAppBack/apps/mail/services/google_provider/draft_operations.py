"""Remote Gmail draft operations."""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

from apps.mail.services.google_provider.client import GmailApiClient
from apps.mail.services.google_provider.constants import (
    GOOGLE_GMAIL_DRAFTS_ENDPOINT,
)
from apps.mail.services.google_provider.draft_payloads import (
    GmailDraftPayloadBuilder,
)
from apps.mail.services.google_provider.message_normalizer import (
    GmailMessageNormalizer,
)
from apps.mail.services.mail_provider_service import MailProviderError


class GmailDraftOperations:
    """Create, update, delete and send Gmail drafts."""

    def __init__(
        self,
        *,
        client: GmailApiClient,
        payload_builder: GmailDraftPayloadBuilder,
        normalizer: GmailMessageNormalizer,
    ) -> None:
        self._client = client
        self._payload_builder = payload_builder
        self._normalizer = normalizer

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
        message = self._payload_builder.build_draft_message(
            to_recipients=to_recipients,
            cc_recipients=cc_recipients,
            bcc_recipients=bcc_recipients,
            subject=subject,
            body=body,
            body_content_type=body_content_type,
            attachments=attachments,
        )
        draft_data = self._client.request(
            method="POST",
            url=GOOGLE_GMAIL_DRAFTS_ENDPOINT,
            access_token=access_token,
            json={
                "message": {
                    "raw": self._payload_builder.encode_raw_message(message),
                }
            },
        )
        return self._normalize_draft_response(draft_data)

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
        draft_id = self._payload_builder.required_draft_id(
            provider_draft_id
        )
        message = self._payload_builder.build_draft_message(
            to_recipients=to_recipients,
            cc_recipients=cc_recipients,
            bcc_recipients=bcc_recipients,
            subject=subject,
            body=body,
            body_content_type=body_content_type,
            attachments=attachments,
        )
        draft_data = self._client.request(
            method="PUT",
            url=(
                f"{GOOGLE_GMAIL_DRAFTS_ENDPOINT}/"
                f"{quote(draft_id, safe='')}"
            ),
            access_token=access_token,
            json={
                "id": draft_id,
                "message": {
                    "raw": self._payload_builder.encode_raw_message(message),
                },
            },
        )
        return self._normalize_draft_response(draft_data)

    def delete_draft(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        provider_draft_id: str | None,
    ) -> None:
        draft_id = self._payload_builder.required_draft_id(
            provider_draft_id
        )
        self._client.request(
            method="DELETE",
            url=(
                f"{GOOGLE_GMAIL_DRAFTS_ENDPOINT}/"
                f"{quote(draft_id, safe='')}"
            ),
            access_token=access_token,
        )

    def send_draft(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        provider_draft_id: str | None,
        draft_snapshot: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        draft_id = self._payload_builder.required_draft_id(
            provider_draft_id
        )
        self._payload_builder.validate_draft_snapshot_for_send(
            draft_snapshot=draft_snapshot,
        )
        sent_data = self._client.request(
            method="POST",
            url=f"{GOOGLE_GMAIL_DRAFTS_ENDPOINT}/send",
            access_token=access_token,
            json={"id": draft_id},
        )
        sent_message = self._normalizer.normalize_message(sent_data)

        if sent_message.get("status") != "sent":
            raise MailProviderError(
                "Gmail no confirmó que el borrador fuera enviado."
            )

        return sent_message

    def _normalize_draft_response(
        self,
        draft_data: dict[str, Any],
    ) -> dict[str, Any]:
        draft_id = str(draft_data.get("id") or "").strip()
        message_data = draft_data.get("message")

        if not draft_id or not isinstance(message_data, dict):
            raise MailProviderError(
                "Gmail no devolvió el borrador creado."
            )

        message = self._normalizer.normalize_message(message_data)
        metadata = dict(message.get("metadata") or {})
        metadata["gmail_draft_id"] = draft_id
        message["metadata"] = metadata

        return message
