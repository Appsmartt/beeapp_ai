"""Google Gmail provider public facade."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from apps.mail.services.google_provider.client import GmailApiClient
from apps.mail.services.google_provider.draft_operations import (
    GmailDraftOperations,
)
from apps.mail.services.google_provider.draft_payloads import (
    GmailDraftPayloadBuilder,
)
from apps.mail.services.google_provider.message_normalizer import (
    GmailMessageNormalizer,
)
from apps.mail.services.google_provider.message_operations import (
    GmailMessageOperations,
)


class GoogleMailProvider:
    """Gmail provider compatible with the BeeApp mail provider contract."""

    provider = "google"

    def __init__(self) -> None:
        client = GmailApiClient()
        normalizer = GmailMessageNormalizer()
        payload_builder = GmailDraftPayloadBuilder()
        self._message_operations = GmailMessageOperations(
            client=client,
            normalizer=normalizer,
        )
        self._draft_operations = GmailDraftOperations(
            client=client,
            payload_builder=payload_builder,
            normalizer=normalizer,
        )

    def _extract_bodies(
        self,
        payload: dict[str, Any],
    ) -> tuple[str | None, str | None]:
        """Compatibility adapter for existing Gmail body protection tests."""
        return self._message_operations._normalizer.extract_bodies(
            payload
        )

    def get_profile_history_id(
        self,
        *,
        access_token: str,
    ) -> str | None:
        return self._message_operations.get_profile_history_id(
            access_token=access_token,
        )

    def list_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
    ) -> tuple[list[str], str | None]:
        return self._message_operations.list_message_ids(
            access_token=access_token,
            after=after,
            max_results=max_results,
        )

    def list_spam_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
    ) -> list[str]:
        return self._message_operations.list_spam_message_ids(
            access_token=access_token,
            after=after,
            max_results=max_results,
        )

    def get_message(
        self,
        *,
        access_token: str,
        provider_message_id: str,
    ) -> dict[str, Any]:
        return self._message_operations.get_message(
            access_token=access_token,
            provider_message_id=provider_message_id,
        )

    def update_message_state(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        is_read: bool | None = None,
        is_starred: bool | None = None,
    ) -> dict[str, Any]:
        return self._message_operations.update_message_state(
            access_token=access_token,
            provider_message_id=provider_message_id,
            is_read=is_read,
            is_starred=is_starred,
        )

    def move_message(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        folder: str,
    ) -> dict[str, Any]:
        return self._message_operations.move_message(
            access_token=access_token,
            provider_message_id=provider_message_id,
            folder=folder,
        )

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
        return self._draft_operations.create_draft(
            access_token=access_token,
            to_recipients=to_recipients,
            cc_recipients=cc_recipients,
            bcc_recipients=bcc_recipients,
            subject=subject,
            body=body,
            body_content_type=body_content_type,
            attachments=attachments,
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
        return self._draft_operations.update_draft(
            access_token=access_token,
            provider_message_id=provider_message_id,
            provider_draft_id=provider_draft_id,
            to_recipients=to_recipients,
            cc_recipients=cc_recipients,
            bcc_recipients=bcc_recipients,
            subject=subject,
            body=body,
            body_content_type=body_content_type,
            attachments=attachments,
        )

    def delete_draft(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        provider_draft_id: str | None,
    ) -> None:
        self._draft_operations.delete_draft(
            access_token=access_token,
            provider_message_id=provider_message_id,
            provider_draft_id=provider_draft_id,
        )

    def send_draft(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        provider_draft_id: str | None,
        draft_snapshot: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return self._draft_operations.send_draft(
            access_token=access_token,
            provider_message_id=provider_message_id,
            provider_draft_id=provider_draft_id,
            draft_snapshot=draft_snapshot,
        )
