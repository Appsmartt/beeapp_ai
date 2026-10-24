"""Microsoft Graph message listing, reading and state operations."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

from apps.mail.services.mail_provider_service import (
    MailProviderError,
    normalize_mail_folder,
    validate_message_state_update,
)
from apps.mail.services.microsoft_provider.attachment_service import (
    MicrosoftAttachmentService,
)
from apps.mail.services.microsoft_provider.constants import (
    MAX_PAGE_SIZE,
    MAX_PAGINATION_PAGES,
    MICROSOFT_MAIL_FOLDERS_ENDPOINT,
    MICROSOFT_MESSAGES_ENDPOINT,
)
from apps.mail.services.microsoft_provider.folder_service import (
    MicrosoftFolderService,
)
from apps.mail.services.microsoft_provider.graph_client import (
    MicrosoftGraphClient,
)
from apps.mail.services.microsoft_provider.message_normalizer import (
    normalize_message,
    normalize_string,
    require_message_id,
)


logger = logging.getLogger(__name__)


class MicrosoftMessageOperations:
    """Perform normalized Microsoft Graph message operations."""

    def __init__(
        self,
        *,
        graph_client: MicrosoftGraphClient,
        folder_service: MicrosoftFolderService,
        attachment_service: MicrosoftAttachmentService,
    ) -> None:
        self._graph_client = graph_client
        self._folder_service = folder_service
        self._attachment_service = attachment_service

    def list_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
    ) -> tuple[list[str], str | None]:
        """List inbox message IDs after a UTC timestamp."""
        return (
            self.list_message_ids_for_folder(
                access_token=access_token,
                after=after,
                max_results=max_results,
                folder_id=None,
            ),
            None,
        )

    def list_spam_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
    ) -> list[str]:
        """List junk mail message IDs when the folder is available."""
        normalized_max_results = max(0, int(max_results))

        if normalized_max_results == 0:
            return []

        self._folder_service.cache_mail_folder_ids(
            access_token=access_token,
        )
        spam_folder_id = self._folder_service.cache.get("spam")

        if not spam_folder_id:
            logger.warning(
                "Microsoft Junk Email folder could not be resolved. "
                "Skipping spam synchronization."
            )
            return []

        return self.list_message_ids_for_folder(
            access_token=access_token,
            after=after,
            max_results=normalized_max_results,
            folder_id=spam_folder_id,
        )

    def list_message_ids_for_folder(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
        folder_id: str | None,
    ) -> list[str]:
        """List message IDs with bounded Microsoft Graph pagination."""
        normalized_max_results = max(0, int(max_results))

        if normalized_max_results == 0:
            return []

        if folder_id:
            encoded_folder_id = quote(folder_id, safe="")
            next_url: str | None = (
                f"{MICROSOFT_MAIL_FOLDERS_ENDPOINT}/"
                f"{encoded_folder_id}/messages"
            )
        else:
            next_url = MICROSOFT_MESSAGES_ENDPOINT

        message_ids: list[str] = []
        after_utc = after.astimezone(timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        first_request_params: dict[str, Any] | None = {
            "$select": (
                "id,receivedDateTime,lastModifiedDateTime,"
                "parentFolderId"
            ),
            "$filter": f"receivedDateTime ge {after_utc}",
            "$orderby": "receivedDateTime desc",
            "$top": min(MAX_PAGE_SIZE, normalized_max_results),
        }
        page_count = 0

        while (
            next_url
            and len(message_ids) < normalized_max_results
            and page_count < MAX_PAGINATION_PAGES
        ):
            page_count += 1
            data = self._graph_client.request(
                method="GET",
                url=next_url,
                access_token=access_token,
                params=first_request_params,
            )
            first_request_params = None
            values = data.get("value")

            if not isinstance(values, list):
                values = []

            for message in values:
                if not isinstance(message, dict):
                    continue

                provider_message_id = normalize_string(
                    message.get("id")
                )

                if provider_message_id:
                    message_ids.append(provider_message_id)

                if len(message_ids) >= normalized_max_results:
                    break

            next_link = data.get("@odata.nextLink")
            next_url = (
                normalize_string(next_link)
                if next_link
                else None
            )

        if page_count >= MAX_PAGINATION_PAGES and next_url:
            logger.warning(
                "Microsoft message pagination stopped at limit. "
                "max_pages=%s max_results=%s folder_id=%s",
                MAX_PAGINATION_PAGES,
                normalized_max_results,
                folder_id,
            )

        return message_ids[:normalized_max_results]

    def get_message(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        include_attachments: bool = True,
    ) -> dict[str, Any]:
        """Fetch and normalize a single Microsoft Graph message."""
        normalized_message_id = require_message_id(provider_message_id)
        encoded_message_id = quote(normalized_message_id, safe="")
        data = self._graph_client.request(
            method="GET",
            url=(
                f"{MICROSOFT_MESSAGES_ENDPOINT}/"
                f"{encoded_message_id}"
            ),
            access_token=access_token,
            params={
                "$select": (
                    "id,conversationId,changeKey,webLink,"
                    "createdDateTime,lastModifiedDateTime,"
                    "sentDateTime,receivedDateTime,subject,"
                    "body,bodyPreview,from,toRecipients,"
                    "ccRecipients,bccRecipients,replyTo,"
                    "isRead,isDraft,hasAttachments,importance,"
                    "flag,parentFolderId,internetMessageId"
                ),
            },
            prefer_text_body=False,
        )

        self._folder_service.cache_mail_folder_ids(
            access_token=access_token,
        )
        attachments: list[dict[str, Any]] = []

        if include_attachments and bool(data.get("hasAttachments")):
            attachments = self._attachment_service.get_attachments(
                access_token=access_token,
                provider_message_id=normalized_message_id,
            )

        return normalize_message(
            data=data,
            attachments=attachments,
            attachments_loaded=include_attachments,
            folder_cache=self._folder_service.cache,
        )

    def update_message_state(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        is_read: bool | None = None,
        is_starred: bool | None = None,
    ) -> dict[str, Any]:
        """Update remote read and starred state, then refresh."""
        validate_message_state_update(
            is_read=is_read,
            is_starred=is_starred,
        )
        normalized_message_id = require_message_id(provider_message_id)
        payload: dict[str, Any] = {}

        if is_read is not None:
            payload["isRead"] = is_read

        if is_starred is not None:
            payload["flag"] = {
                "flagStatus": (
                    "flagged" if is_starred else "notFlagged"
                ),
            }

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

        return self.get_message(
            access_token=access_token,
            provider_message_id=normalized_message_id,
            include_attachments=True,
        )

    def move_message(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        folder: str,
    ) -> dict[str, Any]:
        """Move one message to a supported Microsoft Graph folder."""
        normalized_folder = normalize_mail_folder(folder)

        if normalized_folder in {"sent", "drafts"}:
            raise MailProviderError(
                "No puedes mover un correo a esa carpeta."
            )

        normalized_message_id = require_message_id(provider_message_id)
        destination_id = (
            self._folder_service.get_destination_folder_id(
                access_token=access_token,
                folder=normalized_folder,
            )
        )
        encoded_message_id = quote(normalized_message_id, safe="")
        moved_data = self._graph_client.request(
            method="POST",
            url=(
                f"{MICROSOFT_MESSAGES_ENDPOINT}/"
                f"{encoded_message_id}/move"
            ),
            access_token=access_token,
            json={"destinationId": destination_id},
        )
        moved_message_id = normalize_string(moved_data.get("id"))

        if not moved_message_id:
            raise MailProviderError(
                "Microsoft no devolvió el correo movido."
            )

        return self.get_message(
            access_token=access_token,
            provider_message_id=moved_message_id,
            include_attachments=True,
        )
