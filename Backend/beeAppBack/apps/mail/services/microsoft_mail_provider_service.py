from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx

from apps.mail.services.mail_provider_service import (
    MailProviderError,
    normalize_email_address,
    normalize_text,
)


logger = logging.getLogger(__name__)


MICROSOFT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
MICROSOFT_MESSAGES_ENDPOINT = (
    f"{MICROSOFT_GRAPH_BASE_URL}/me/messages"
)

HTTP_TIMEOUT_SECONDS = 25.0
MAX_PAGE_SIZE = 250


class MicrosoftMailProvider:
    provider = "microsoft"

    def _headers(
        self,
        access_token: str,
        *,
        prefer_text_body: bool = False,
    ) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        if prefer_text_body:
            headers["Prefer"] = (
                'outlook.body-content-type="text"'
            )

        return headers

    def _request(
        self,
        *,
        method: str,
        url: str,
        access_token: str,
        params: dict[str, Any] | None = None,
        prefer_text_body: bool = False,
    ) -> dict[str, Any]:
        try:
            response = httpx.request(
                method,
                url,
                headers=self._headers(
                    access_token,
                    prefer_text_body=prefer_text_body,
                ),
                params=params,
                timeout=HTTP_TIMEOUT_SECONDS,
            )
        except httpx.HTTPError as error:
            raise MailProviderError(
                "Microsoft Graph no pudo ser contactado."
            ) from error

        if response.status_code in (401, 403):
            try:
                error_payload = response.json()
            except ValueError:
                error_payload = {
                    "raw_body": response.text[:1_000],
                }

            error = error_payload.get("error") or {}
            error_code = str(error.get("code") or "unknown")

            logger.warning(
                "Microsoft Graph request rejected. "
                "status_code=%s error_code=%s response=%s",
                response.status_code,
                error_code,
                error_payload,
            )

            if response.status_code == 401:
                raise MailProviderError(
                    "La conexión con Microsoft expiró o fue revocada. "
                    "Vuelve a conectar tu cuenta."
                )

            if error_code in {
                "Authorization_RequestDenied",
                "ErrorAccessDenied",
                "AccessDenied",
            }:
                raise MailProviderError(
                    "La conexión con Microsoft no tiene permisos "
                    "suficientes para acceder al correo. "
                    "Vuelve a conectar tu cuenta y acepta los permisos."
                )

            raise MailProviderError(
                "Microsoft rechazó la solicitud. "
                "Vuelve a conectar tu cuenta o inténtalo más tarde."
            )

        if response.status_code >= 400:
            try:
                error_payload = response.json()
            except ValueError:
                error_payload = {
                    "raw_body": response.text[:1_000],
                }

            logger.warning(
                "Microsoft Graph request failed. "
                "status_code=%s response=%s",
                response.status_code,
                error_payload,
            )

            raise MailProviderError(
                "Microsoft Graph devolvió un error inesperado."
            )

        try:
            data = response.json()
        except ValueError as error:
            raise MailProviderError(
                "Microsoft Graph devolvió una respuesta JSON inválida."
            ) from error

        if not isinstance(data, dict):
            raise MailProviderError(
                "Microsoft Graph devolvió una respuesta inválida."
            )

        return data

    def list_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
    ) -> tuple[list[str], str | None]:
        message_ids: list[str] = []
        next_url: str | None = MICROSOFT_MESSAGES_ENDPOINT

        after_utc = after.astimezone(timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )

        first_request_params: dict[str, Any] | None = {
            "$select": (
                "id,receivedDateTime,lastModifiedDateTime,"
                "parentFolderId"
            ),
            "$filter": (
                f"receivedDateTime ge {after_utc}"
            ),
            "$orderby": "receivedDateTime desc",
            "$top": min(MAX_PAGE_SIZE, max_results),
        }

        while next_url and len(message_ids) < max_results:
            data = self._request(
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

                provider_message_id = str(
                    message.get("id") or ""
                ).strip()

                if provider_message_id:
                    message_ids.append(provider_message_id)

                if len(message_ids) >= max_results:
                    break

            next_link = data.get("@odata.nextLink")
            next_url = (
                str(next_link).strip()
                if next_link
                else None
            )

        return message_ids[:max_results], None

    def get_message(
        self,
        *,
        access_token: str,
        provider_message_id: str,
    ) -> dict[str, Any]:
        encoded_message_id = quote(
            provider_message_id,
            safe="",
        )

        data = self._request(
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
                    "flag,parentFolderId,internetMessageId,"
                ),
            },
            prefer_text_body=True,
        )

        attachments = self._get_attachments(
            access_token=access_token,
            provider_message_id=provider_message_id,
        )

        return self._normalize_message(
            data=data,
            attachments=attachments,
        )

    def _get_attachments(
        self,
        *,
        access_token: str,
        provider_message_id: str,
    ) -> list[dict[str, Any]]:
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

        while next_url:
            data = self._request(
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

                attachment_id = str(
                    attachment.get("id") or ""
                ).strip()
                filename = str(
                    attachment.get("name") or ""
                ).strip()

                if not attachment_id or not filename:
                    continue

                attachments.append(
                    {
                        "provider_attachment_id": attachment_id,
                        "provider_message_attachment_id": (
                            attachment_id
                        ),
                        "filename": filename[:255],
                        "mime_type": (
                            str(
                                attachment.get("contentType")
                                or "application/octet-stream"
                            ).strip()
                            or "application/octet-stream"
                        ),
                        "size_bytes": self._safe_int(
                            attachment.get("size")
                        ),
                        "content_id": None,
                        "content_disposition": (
                            "inline"
                            if bool(attachment.get("isInline"))
                            else "attachment"
                        ),
                        "is_inline": bool(
                            attachment.get("isInline")
                        ),
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
                str(next_link).strip()
                if next_link
                else None
            )

        return attachments

    def _normalize_message(
        self,
        *,
        data: dict[str, Any],
        attachments: list[dict[str, Any]],
    ) -> dict[str, Any]:
        provider_message_id = self._normalize_string(
            data.get("id")
        )

        if not provider_message_id:
            raise MailProviderError(
                "Microsoft Graph devolvió un mensaje sin identificador."
            )

        body = data.get("body")

        if not isinstance(body, dict):
            body = {}

        body_content = self._normalize_string(
            body.get("content")
        )
        body_type = str(
            body.get("contentType") or ""
        ).strip().lower()

        body_text: str | None = None
        body_html: str | None = None

        if body_type == "html":
            body_html = body_content
            body_text = (
                self._html_to_text(body_content)
                if body_content
                else None
            )
        else:
            body_text = body_content

        sender = self._parse_recipient(
            data.get("from")
        )

        recipients = {
            "from": [sender] if sender else [],
            "to": self._parse_recipients(
                data.get("toRecipients")
            ),
            "cc": self._parse_recipients(
                data.get("ccRecipients")
            ),
            "bcc": self._parse_recipients(
                data.get("bccRecipients")
            ),
            "reply_to": self._parse_recipients(
                data.get("replyTo")
            ),
        }

        is_draft = bool(data.get("isDraft"))
        sent_at = self._normalize_datetime(
            data.get("sentDateTime")
        )
        received_at = self._normalize_datetime(
            data.get("receivedDateTime")
        )

        direction = (
            "outbound"
            if sent_at and not received_at
            else "inbound"
        )

        flag = data.get("flag")

        if not isinstance(flag, dict):
            flag = {}

        flag_status = str(
            flag.get("flagStatus") or ""
        ).strip().lower()

        subject = normalize_text(
            data.get("subject"),
            max_length=1000,
        )
        preview = normalize_text(
            data.get("bodyPreview"),
            max_length=1000,
        )

        folder = "drafts" if is_draft else "inbox"
        status = "draft" if is_draft else "received"

        return {
            "provider_message_id": provider_message_id,
            "provider_thread_id": self._normalize_string(
                data.get("conversationId")
            ),
            "provider_conversation_id": self._normalize_string(
                data.get("conversationId")
            ),
            "provider_change_key": self._normalize_string(
                data.get("changeKey")
            ),
            "provider_etag": self._normalize_string(
                data.get("@odata.etag")
            ),
            "provider_web_link": self._normalize_string(
                data.get("webLink")
            ),
            "provider_created_at": self._normalize_datetime(
                data.get("createdDateTime")
            ),
            "provider_updated_at": self._normalize_datetime(
                data.get("lastModifiedDateTime")
            ),
            "direction": direction,
            "status": status,
            "folder": folder,
            "is_read": bool(data.get("isRead")),
            "is_archived": False,
            "is_spam": False,
            "is_trashed": False,
            "subject": subject,
            "body_text": body_text,
            "body_html": body_html,
            "body_preview": preview,
            "snippet": preview,
            "message_id_header": self._normalize_string(
                data.get("internetMessageId")
            ),
            "in_reply_to_header": None,
            "references_header": None,
            "sent_at": sent_at,
            "received_at": received_at,
            "has_attachments": bool(
                data.get("hasAttachments")
            ),
            "attachment_count": len(attachments),
            "recipients": recipients,
            "attachments": attachments,
            "metadata": {
                "microsoft_parent_folder_id": (
                    self._normalize_string(
                        data.get("parentFolderId")
                    )
                ),
                "microsoft_importance": data.get("importance"),
                "microsoft_flag_status": flag_status,
                "microsoft_body_content_type": body_type,
            },
        }

    def _parse_recipients(
        self,
        value: Any,
    ) -> list[dict[str, str | None]]:
        if not isinstance(value, list):
            return []

        recipients: list[dict[str, str | None]] = []

        for item in value:
            recipient = self._parse_recipient(item)

            if recipient:
                recipients.append(recipient)

        return recipients

    def _parse_recipient(
        self,
        value: Any,
    ) -> dict[str, str | None] | None:
        if not isinstance(value, dict):
            return None

        email_address = value.get("emailAddress")

        if not isinstance(email_address, dict):
            return None

        email = normalize_email_address(
            self._normalize_string(email_address.get("address"))
        )

        if not email:
            return None

        return {
            "email": email,
            "display_name": self._normalize_string(
                email_address.get("name")
            ),
        }

    def _normalize_string(
        self,
        value: Any,
    ) -> str | None:
        normalized = str(value or "").strip()
        return normalized or None

    def _normalize_datetime(
        self,
        value: Any,
    ) -> str | None:
        normalized = self._normalize_string(value)

        if not normalized:
            return None

        try:
            parsed = datetime.fromisoformat(
                normalized.replace("Z", "+00:00")
            )

            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)

            return parsed.astimezone(timezone.utc).isoformat()
        except ValueError:
            return normalized

    def _safe_int(
        self,
        value: Any,
    ) -> int | None:
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _html_to_text(
        self,
        value: str,
    ) -> str:
        text = value

        for marker in (
            "<br>",
            "<br/>",
            "<br />",
            "</p>",
            "</div>",
            "</li>",
        ):
            text = text.replace(marker, "\n")

        result: list[str] = []
        inside_tag = False

        for character in text:
            if character == "<":
                inside_tag = True
                continue

            if character == ">":
                inside_tag = False
                continue

            if not inside_tag:
                result.append(character)

        normalized = "".join(result)

        return "\n".join(
            line.strip()
            for line in normalized.splitlines()
            if line.strip()
        )[:50_000]