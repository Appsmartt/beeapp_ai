"""Microsoft Graph mail attachment operations."""

from __future__ import annotations

import base64
from typing import Any
from urllib.parse import quote

from apps.mail.services.microsoft_provider.constants import (
    MAX_ATTACHMENT_PAGES,
    MICROSOFT_MESSAGES_ENDPOINT,
)
from apps.mail.services.microsoft_provider.graph_client import (
    MicrosoftGraphClient,
)
from apps.mail.services.microsoft_provider.message_normalizer import (
    normalize_string,
    safe_int,
)


class MicrosoftAttachmentService:
    """Read and replace Microsoft Graph message attachments."""

    def __init__(
        self,
        *,
        graph_client: MicrosoftGraphClient,
    ) -> None:
        self._graph_client = graph_client

    def get_attachments(
        self,
        *,
        access_token: str,
        provider_message_id: str,
    ) -> list[dict[str, Any]]:
        """Return normalized attachment metadata for one message."""
        encoded_message_id = quote(
            provider_message_id,
            safe="",
        )
        next_url: str | None = (
            f"{MICROSOFT_MESSAGES_ENDPOINT}/"
            f"{encoded_message_id}/attachments"
        )
        first_request_params: dict[str, Any] | None = {
            "$select": (
                "id,name,contentType,size,isInline,"
                "lastModifiedDateTime"
            ),
            "$top": 100,
        }
        attachments: list[dict[str, Any]] = []
        page_count = 0

        while (
            next_url
            and page_count < MAX_ATTACHMENT_PAGES
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

            for attachment in values:
                if not isinstance(attachment, dict):
                    continue

                attachment_id = normalize_string(
                    attachment.get("id")
                )
                filename = normalize_string(attachment.get("name"))

                if not attachment_id or not filename:
                    continue

                is_inline = bool(attachment.get("isInline"))
                mime_type = normalize_string(
                    attachment.get("contentType")
                ) or "application/octet-stream"

                attachments.append(
                    {
                        "provider_attachment_id": attachment_id,
                        "provider_message_attachment_id": (
                            attachment_id
                        ),
                        "filename": filename[:255],
                        "mime_type": mime_type,
                        "size_bytes": safe_int(
                            attachment.get("size")
                        ),
                        "content_id": None,
                        "content_disposition": (
                            "inline"
                            if is_inline
                            else "attachment"
                        ),
                        "is_inline": is_inline,
                        "metadata": {
                            "last_modified_date_time": (
                                attachment.get(
                                    "lastModifiedDateTime"
                                )
                            ),
                        },
                    }
                )

            next_link = data.get("@odata.nextLink")
            next_url = (
                normalize_string(next_link)
                if next_link
                else None
            )

        return attachments

    def replace_draft_attachments(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        attachments: list[dict[str, Any]],
    ) -> None:
        """Delete every remote draft attachment, then add replacements."""
        self.delete_all_draft_attachments(
            access_token=access_token,
            provider_message_id=provider_message_id,
        )

        for attachment in attachments:
            self.add_draft_attachment(
                access_token=access_token,
                provider_message_id=provider_message_id,
                attachment=attachment,
            )

    def delete_all_draft_attachments(
        self,
        *,
        access_token: str,
        provider_message_id: str,
    ) -> None:
        """Delete all attachments currently linked to a draft."""
        encoded_message_id = quote(
            provider_message_id,
            safe="",
        )
        next_url: str | None = (
            f"{MICROSOFT_MESSAGES_ENDPOINT}/"
            f"{encoded_message_id}/attachments"
        )
        first_params: dict[str, Any] | None = {
            "$select": "id",
            "$top": 100,
        }
        attachment_ids: list[str] = []
        page_count = 0

        while (
            next_url
            and page_count < MAX_ATTACHMENT_PAGES
        ):
            page_count += 1
            data = self._graph_client.request(
                method="GET",
                url=next_url,
                access_token=access_token,
                params=first_params,
            )
            first_params = None
            values = data.get("value")

            if not isinstance(values, list):
                values = []

            for item in values:
                if not isinstance(item, dict):
                    continue

                attachment_id = normalize_string(item.get("id"))

                if attachment_id:
                    attachment_ids.append(attachment_id)

            next_link = data.get("@odata.nextLink")
            next_url = (
                normalize_string(next_link)
                if next_link
                else None
            )

        for attachment_id in attachment_ids:
            encoded_attachment_id = quote(
                attachment_id,
                safe="",
            )
            self._graph_client.request(
                method="DELETE",
                url=(
                    f"{MICROSOFT_MESSAGES_ENDPOINT}/"
                    f"{encoded_message_id}/attachments/"
                    f"{encoded_attachment_id}"
                ),
                access_token=access_token,
                allow_empty_response=True,
            )

    def add_draft_attachment(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        attachment: dict[str, Any],
    ) -> None:
        """Upload one validated BeeApp attachment to a draft."""
        encoded_message_id = quote(
            provider_message_id,
            safe="",
        )
        content_bytes = attachment["content"]

        self._graph_client.request(
            method="POST",
            url=(
                f"{MICROSOFT_MESSAGES_ENDPOINT}/"
                f"{encoded_message_id}/attachments"
            ),
            access_token=access_token,
            json={
                "@odata.type": (
                    "#microsoft.graph.fileAttachment"
                ),
                "name": attachment["filename"],
                "contentType": attachment["mime_type"],
                "contentBytes": base64.b64encode(
                    content_bytes
                ).decode("ascii"),
            },
        )
