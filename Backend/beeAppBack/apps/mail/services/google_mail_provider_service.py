from __future__ import annotations

import base64
import logging
from datetime import datetime, timezone
from email.header import decode_header, make_header
from email.utils import getaddresses, parsedate_to_datetime
from typing import Any
from urllib.parse import quote

import httpx

from apps.mail.services.mail_provider_service import (
    MailProviderError,
    normalize_email_address,
    normalize_text,
)


logger = logging.getLogger(__name__)


GOOGLE_GMAIL_BASE_URL = "https://gmail.googleapis.com/gmail/v1"
GOOGLE_GMAIL_MESSAGES_ENDPOINT = (
    f"{GOOGLE_GMAIL_BASE_URL}/users/me/messages"
)
GOOGLE_GMAIL_PROFILE_ENDPOINT = (
    f"{GOOGLE_GMAIL_BASE_URL}/users/me/profile"
)


HTTP_TIMEOUT_SECONDS = 25.0
MAX_PAGE_SIZE = 500


class GoogleMailProvider:
    provider = "google"

    def _headers(
        self,
        access_token: str,
    ) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

    def _request(
        self,
        *,
        method: str,
        url: str,
        access_token: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        try:
            response = httpx.request(
                method,
                url,
                headers=self._headers(access_token),
                params=params,
                timeout=HTTP_TIMEOUT_SECONDS,
            )
        except httpx.HTTPError as error:
            raise MailProviderError(
                "Gmail no pudo ser contactado."
            ) from error

        if response.status_code in (401, 403):
            try:
                error_payload = response.json()
            except ValueError:
                error_payload = {
                    "raw_body": response.text[:1_000],
                }

            error = error_payload.get("error") or {}
            errors = error.get("errors") or []
            primary_error = errors[0] if errors else {}

            reason = (
                primary_error.get("reason")
                or error.get("status")
                or "unknown"
            )

            logger.warning(
                "Gmail API request rejected. "
                "status_code=%s reason=%s response=%s",
                response.status_code,
                reason,
                error_payload,
            )

            if reason in {"accessNotConfigured", "SERVICE_DISABLED"}:
                raise MailProviderError(
                    "El servicio de Gmail de BeeApp no está habilitado. "
                    "Contacta al administrador de la aplicación."
                )

            if response.status_code == 401:
                raise MailProviderError(
                    "La conexión con Gmail expiró o fue revocada. "
                    "Vuelve a conectar tu cuenta de Google."
                )

            if reason in {
                "insufficientPermissions",
                "insufficientAuthenticationScopes",
            }:
                raise MailProviderError(
                    "La conexión con Gmail no tiene los permisos necesarios. "
                    "Vuelve a conectar tu cuenta y acepta los permisos solicitados."
                )

            raise MailProviderError(
                "Gmail rechazó la solicitud. "
                "Vuelve a conectar tu cuenta o inténtalo más tarde."
            )

        if response.status_code >= 400:
            raise MailProviderError(
                "Gmail devolvió un error inesperado."
            )

        try:
            data = response.json()
        except ValueError as error:
            raise MailProviderError(
                "Gmail devolvió una respuesta JSON inválida."
            ) from error

        if not isinstance(data, dict):
            raise MailProviderError(
                "Gmail devolvió una respuesta inválida."
            )

        return data

    def get_profile_history_id(
        self,
        *,
        access_token: str,
    ) -> str | None:
        data = self._request(
            method="GET",
            url=GOOGLE_GMAIL_PROFILE_ENDPOINT,
            access_token=access_token,
        )

        history_id = str(data.get("historyId") or "").strip()

        return history_id or None

    def list_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
    ) -> tuple[list[str], str | None]:
        message_ids: list[str] = []
        page_token: str | None = None

        after_timestamp = int(
            after.astimezone(timezone.utc).timestamp()
        )

        while len(message_ids) < max_results:
            page_size = min(
                MAX_PAGE_SIZE,
                max_results - len(message_ids),
            )

            params: dict[str, Any] = {
                "q": f"after:{after_timestamp}",
                "maxResults": page_size,
                "includeSpamTrash": True,
            }

            if page_token:
                params["pageToken"] = page_token

            data = self._request(
                method="GET",
                url=GOOGLE_GMAIL_MESSAGES_ENDPOINT,
                access_token=access_token,
                params=params,
            )

            messages = data.get("messages")

            if not isinstance(messages, list):
                messages = []

            for message in messages:
                if not isinstance(message, dict):
                    continue

                provider_message_id = str(
                    message.get("id") or ""
                ).strip()

                if provider_message_id:
                    message_ids.append(provider_message_id)

            next_page_token = data.get("nextPageToken")
            page_token = (
                str(next_page_token)
                if next_page_token
                else None
            )

            if not page_token:
                break

        history_id = self.get_profile_history_id(
            access_token=access_token,
        )

        return message_ids[:max_results], history_id

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
                f"{GOOGLE_GMAIL_MESSAGES_ENDPOINT}/"
                f"{encoded_message_id}"
            ),
            access_token=access_token,
            params={
                "format": "full",
            },
        )

        return self._normalize_message(data)

    def _normalize_message(
        self,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        provider_message_id = str(
            data.get("id") or ""
        ).strip()

        if not provider_message_id:
            raise MailProviderError(
                "Gmail devolvió un mensaje sin identificador."
            )

        payload = data.get("payload")

        if not isinstance(payload, dict):
            payload = {}

        headers = self._header_map(payload.get("headers"))

        label_ids = [
            str(label).strip()
            for label in (data.get("labelIds") or [])
            if str(label).strip()
        ]

        body_text, body_html = self._extract_bodies(payload)

        snippet = normalize_text(
            data.get("snippet"),
            max_length=1000,
        )

        subject = self._decode_header(
            headers.get("subject")
        )

        sent_at = self._parse_header_datetime(
            headers.get("date")
        )

        internal_date = self._parse_internal_date(
            data.get("internalDate")
        )

        received_at = internal_date or sent_at

        recipients = {
            "from": self._parse_addresses(
                headers.get("from"),
            ),
            "to": self._parse_addresses(
                headers.get("to"),
            ),
            "cc": self._parse_addresses(
                headers.get("cc"),
            ),
            "bcc": self._parse_addresses(
                headers.get("bcc"),
            ),
            "reply_to": self._parse_addresses(
                headers.get("reply-to"),
            ),
        }

        attachments = self._extract_attachments(payload)

        folder = self._map_folder(label_ids)

        is_trashed = "TRASH" in label_ids
        is_spam = "SPAM" in label_ids
        is_archived = (
            "INBOX" not in label_ids
            and "SENT" not in label_ids
            and "DRAFT" not in label_ids
            and not is_spam
            and not is_trashed
        )

        return {
            "provider_message_id": provider_message_id,
            "provider_thread_id": (
                str(data.get("threadId") or "").strip()
                or None
            ),
            "provider_conversation_id": (
                str(data.get("threadId") or "").strip()
                or None
            ),
            "provider_change_key": str(
                data.get("historyId") or ""
            ).strip()
            or None,
            "provider_etag": None,
            "provider_web_link": None,
            "provider_created_at": internal_date,
            "provider_updated_at": internal_date,
            "direction": (
                "outbound"
                if "SENT" in label_ids
                else "inbound"
            ),
            "status": self._map_status(label_ids),
            "folder": folder,
            "is_read": "UNREAD" not in label_ids,
            "is_archived": is_archived,
            "is_spam": is_spam,
            "is_trashed": is_trashed,
            "subject": subject,
            "body_text": body_text,
            "body_html": body_html,
            "body_preview": snippet,
            "snippet": snippet,
            "message_id_header": headers.get("message-id"),
            "in_reply_to_header": headers.get("in-reply-to"),
            "references_header": headers.get("references"),
            "sent_at": sent_at,
            "received_at": received_at,
            "has_attachments": bool(attachments),
            "attachment_count": len(attachments),
            "recipients": recipients,
            "attachments": attachments,
            "metadata": {
                "gmail_label_ids": label_ids,
                "gmail_size_estimate": data.get("sizeEstimate"),
                "gmail_history_id": data.get("historyId"),
                "gmail_raw_headers": {
                    key: value
                    for key, value in headers.items()
                    if key in {
                        "from",
                        "to",
                        "cc",
                        "bcc",
                        "reply-to",
                        "date",
                        "message-id",
                        "in-reply-to",
                        "references",
                    }
                },
            },
        }

    def _header_map(
        self,
        raw_headers: Any,
    ) -> dict[str, str]:
        if not isinstance(raw_headers, list):
            return {}

        result: dict[str, str] = {}

        for header in raw_headers:
            if not isinstance(header, dict):
                continue

            name = str(header.get("name") or "").strip().lower()
            value = str(header.get("value") or "").strip()

            if name and value and name not in result:
                result[name] = value

        return result

    def _decode_header(
        self,
        value: str | None,
    ) -> str | None:
        if not value:
            return None

        try:
            return str(make_header(decode_header(value))).strip() or None
        except Exception:
            return normalize_text(
                value,
                max_length=1000,
            )

    def _parse_addresses(
        self,
        value: str | None,
    ) -> list[dict[str, str | None]]:
        if not value:
            return []

        result: list[dict[str, str | None]] = []

        for display_name, email in getaddresses([value]):
            normalized_email = normalize_email_address(email)

            if not normalized_email:
                continue

            result.append(
                {
                    "email": normalized_email,
                    "display_name": (
                        self._decode_header(display_name)
                        if display_name
                        else None
                    ),
                }
            )

        return result

    def _parse_header_datetime(
        self,
        value: str | None,
    ) -> str | None:
        if not value:
            return None

        try:
            parsed = parsedate_to_datetime(value)

            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)

            return parsed.astimezone(timezone.utc).isoformat()
        except Exception:
            return None

    def _parse_internal_date(
        self,
        value: Any,
    ) -> str | None:
        try:
            milliseconds = int(str(value))
            parsed = datetime.fromtimestamp(
                milliseconds / 1000,
                tz=timezone.utc,
            )
            return parsed.isoformat()
        except Exception:
            return None

    def _decode_base64url(
        self,
        value: str | None,
    ) -> str:
        if not value:
            return ""

        try:
            padding = "=" * (-len(value) % 4)
            decoded = base64.urlsafe_b64decode(
                f"{value}{padding}"
            )
            return decoded.decode(
                "utf-8",
                errors="replace",
            )
        except Exception:
            return ""

    def _extract_bodies(
        self,
        payload: dict[str, Any],
    ) -> tuple[str | None, str | None]:
        text_parts: list[str] = []
        html_parts: list[str] = []

        def walk(part: dict[str, Any]) -> None:
            mime_type = str(
                part.get("mimeType") or ""
            ).lower()

            body = part.get("body")

            if not isinstance(body, dict):
                body = {}

            data = body.get("data")

            if mime_type == "text/plain" and data:
                decoded = self._decode_base64url(data)

                if decoded:
                    text_parts.append(decoded)

            elif mime_type == "text/html" and data:
                decoded = self._decode_base64url(data)

                if decoded:
                    html_parts.append(decoded)

            child_parts = part.get("parts")

            if isinstance(child_parts, list):
                for child in child_parts:
                    if isinstance(child, dict):
                        walk(child)

        walk(payload)

        body_text = "\n".join(
            part.strip()
            for part in text_parts
            if part.strip()
        ) or None

        body_html = "\n".join(
            part.strip()
            for part in html_parts
            if part.strip()
        ) or None

        if not body_text and body_html:
            body_text = self._html_to_text(body_html)

        return body_text, body_html

    def _extract_attachments(
        self,
        payload: dict[str, Any],
    ) -> list[dict[str, Any]]:
        attachments: list[dict[str, Any]] = []

        def walk(part: dict[str, Any]) -> None:
            filename = str(part.get("filename") or "").strip()

            body = part.get("body")

            if not isinstance(body, dict):
                body = {}

            attachment_id = str(
                body.get("attachmentId") or ""
            ).strip()

            if filename and attachment_id:
                content_disposition = self._header_value(
                    part.get("headers"),
                    "content-disposition",
                )

                attachments.append(
                    {
                        "provider_attachment_id": attachment_id,
                        "provider_message_attachment_id": (
                            attachment_id
                        ),
                        "filename": filename[:255],
                        "mime_type": (
                            str(
                                part.get("mimeType")
                                or "application/octet-stream"
                            ).strip()
                            or "application/octet-stream"
                        ),
                        "size_bytes": (
                            int(body.get("size"))
                            if str(
                                body.get("size") or ""
                            ).isdigit()
                            else None
                        ),
                        "content_id": self._header_value(
                            part.get("headers"),
                            "content-id",
                        ),
                        "content_disposition": content_disposition,
                        "is_inline": (
                            str(content_disposition or "")
                            .lower()
                            .startswith("inline")
                        ),
                        "metadata": {},
                    }
                )

            child_parts = part.get("parts")

            if isinstance(child_parts, list):
                for child in child_parts:
                    if isinstance(child, dict):
                        walk(child)

        walk(payload)

        return attachments

    def _header_value(
        self,
        raw_headers: Any,
        wanted_name: str,
    ) -> str | None:
        if not isinstance(raw_headers, list):
            return None

        normalized_name = wanted_name.lower()

        for header in raw_headers:
            if not isinstance(header, dict):
                continue

            name = str(header.get("name") or "").lower()

            if name == normalized_name:
                value = str(header.get("value") or "").strip()
                return value or None

        return None

    def _map_folder(
        self,
        label_ids: list[str],
    ) -> str:
        labels = set(label_ids)

        if "TRASH" in labels:
            return "trash"

        if "SPAM" in labels:
            return "spam"

        if "DRAFT" in labels:
            return "drafts"

        if "SENT" in labels:
            return "sent"

        if "INBOX" in labels:
            return "inbox"

        return "archived"

    def _map_status(
        self,
        label_ids: list[str],
    ) -> str:
        labels = set(label_ids)

        if "TRASH" in labels:
            return "trashed"

        if "DRAFT" in labels:
            return "draft"

        if "SENT" in labels:
            return "sent"

        return "received"

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