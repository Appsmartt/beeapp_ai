"""Public Microsoft Graph mail provider facade."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from apps.mail.services.microsoft_provider.attachment_service import (
    MicrosoftAttachmentService,
)
from apps.mail.services.microsoft_provider.draft_operations import (
    MicrosoftDraftOperations,
)
from apps.mail.services.microsoft_provider.folder_service import (
    MicrosoftFolderService,
)
from apps.mail.services.microsoft_provider.graph_client import (
    MicrosoftGraphClient,
)
from apps.mail.services.microsoft_provider.message_normalizer import (
    normalize_message,
)
from apps.mail.services.microsoft_provider.message_operations import (
    MicrosoftMessageOperations,
)


class MicrosoftMailProvider:
    """Stable public facade for Microsoft Graph mail operations."""

    provider = "microsoft"

    def __init__(self) -> None:
        self._graph_client = MicrosoftGraphClient()
        self._folder_service = MicrosoftFolderService(
            graph_client=self._graph_client,
        )
        self._attachment_service = MicrosoftAttachmentService(
            graph_client=self._graph_client,
        )
        self._message_operations = MicrosoftMessageOperations(
            graph_client=self._graph_client,
            folder_service=self._folder_service,
            attachment_service=self._attachment_service,
        )
        self._draft_operations = MicrosoftDraftOperations(
            graph_client=self._graph_client,
            attachment_service=self._attachment_service,
            message_operations=self._message_operations,
        )

    def list_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
    ) -> tuple[list[str], str | None]:
        """List inbox message IDs after the requested timestamp."""
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
        """List junk mail message IDs when available."""
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
        include_attachments: bool = True,
    ) -> dict[str, Any]:
        """Fetch a normalized remote message."""
        return self._message_operations.get_message(
            access_token=access_token,
            provider_message_id=provider_message_id,
            include_attachments=include_attachments,
        )

    def update_message_state(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        is_read: bool | None = None,
        is_starred: bool | None = None,
    ) -> dict[str, Any]:
        """Update remote read or starred state."""
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
        """Move a remote message to a supported folder."""
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
        """Create a remote draft."""
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
        """Update a remote draft."""
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
        """Delete a remote draft."""
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
        """Send a remote draft."""
        return self._draft_operations.send_draft(
            access_token=access_token,
            provider_message_id=provider_message_id,
            provider_draft_id=provider_draft_id,
            draft_snapshot=draft_snapshot,
        )

    def _request(
        self,
        *,
        method: str,
        url: str,
        access_token: str,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
        prefer_text_body: bool = False,
        allow_empty_response: bool = False,
    ) -> dict[str, Any]:
        """Compatibility adapter for existing security tests."""
        return self._graph_client.request(
            method=method,
            url=url,
            access_token=access_token,
            params=params,
            json=json,
            prefer_text_body=prefer_text_body,
            allow_empty_response=allow_empty_response,
        )

    def _list_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
        folder_id: str | None,
    ) -> list[str]:
        """Compatibility adapter for existing pagination tests."""
        return self._message_operations.list_message_ids_for_folder(
            access_token=access_token,
            after=after,
            max_results=max_results,
            folder_id=folder_id,
        )

    def _normalize_message(
        self,
        *,
        data: dict[str, Any],
        attachments: list[dict[str, Any]],
        attachments_loaded: bool,
    ) -> dict[str, Any]:
        """Compatibility adapter for existing normalization tests."""
        return normalize_message(
            data=data,
            attachments=attachments,
            attachments_loaded=attachments_loaded,
            folder_cache=self._folder_service.cache,
        )
