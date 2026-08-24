from __future__ import annotations

import base64
import logging
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx

from apps.mail.services.mail_provider_service import (
    MailProviderError,
    normalize_body_content_type,
    normalize_email_address,
    normalize_mail_folder,
    normalize_recipients,
    normalize_text,
    validate_draft_content,
    validate_mail_attachments,
    validate_message_state_update,
    validate_sendable_draft,
)


logger = logging.getLogger(__name__)


MICROSOFT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
MICROSOFT_MESSAGES_ENDPOINT = (
    f"{MICROSOFT_GRAPH_BASE_URL}/me/messages"
)
MICROSOFT_MAIL_FOLDERS_ENDPOINT = (
    f"{MICROSOFT_GRAPH_BASE_URL}/me/mailFolders"
)

MICROSOFT_WELL_KNOWN_FOLDER_NAMES = {
    "inbox": "inbox",
    "drafts": "drafts",
    "sent": "sentitems",
    "spam": "junkemail",
    "trash": "deleteditems",
}

MICROSOFT_FOLDER_DISPLAY_NAMES = {
    "inbox": {
        "inbox",
        "bandeja de entrada",
        "inbox folder",
    },
    "drafts": {
        "drafts",
        "borradores",
    },
    "sent": {
        "sent items",
        "sent",
        "elementos enviados",
        "enviados",
    },
    "spam": {
        "junk email",
        "junk",
        "correo no deseado",
        "spam",
    },
    "trash": {
        "deleted items",
        "deleted",
        "elementos eliminados",
        "papelera",
    },
    "archived": {
        "archive",
        "archivados",
        "archivo",
    },
}

HTTP_TIMEOUT_SECONDS = 25.0
MAX_PAGE_SIZE = 250
MAX_PAGINATION_PAGES = 100
MAX_ATTACHMENT_PAGES = 20

MICROSOFT_IMMUTABLE_ID_PREFER = 'IdType="ImmutableId"'


class MicrosoftMailProvider:
    provider = "microsoft"

    def __init__(self) -> None:
        self._folder_cache: dict[str, str] = {}
        self._folder_cache_loaded = False

    def _headers(
        self,
        access_token: str,
        *,
        prefer_text_body: bool = False,
        json_body: bool = False,
    ) -> dict[str, str]:
        prefer_values = [MICROSOFT_IMMUTABLE_ID_PREFER]

        if prefer_text_body:
            prefer_values.append(
                'outlook.body-content-type="text"'
            )

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Prefer": ", ".join(prefer_values),
        }

        if json_body:
            headers["Content-Type"] = "application/json"

        return headers

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
        try:
            response = httpx.request(
                method,
                url,
                headers=self._headers(
                    access_token,
                    prefer_text_body=prefer_text_body,
                    json_body=json is not None,
                ),
                params=params,
                json=json,
                timeout=httpx.Timeout(
                    HTTP_TIMEOUT_SECONDS,
                    connect=10.0,
                ),
            )
        except httpx.TimeoutException as error:
            raise MailProviderError(
                "Microsoft Graph tardó demasiado en responder."
            ) from error
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
                "method=%s url=%s status_code=%s error_code=%s "
                "response=%s",
                method,
                url,
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

            error = error_payload.get("error") or {}
            error_code = str(error.get("code") or "unknown")
            error_message = str(
                error.get("message")
                or "Microsoft Graph devolvió un error inesperado."
            ).strip()

            logger.warning(
                "Microsoft Graph request failed. "
                "method=%s url=%s status_code=%s error_code=%s "
                "response=%s",
                method,
                url,
                response.status_code,
                error_code,
                error_payload,
            )

            if error_code in {
                "ErrorItemNotFound",
                "ErrorInvalidIdMalformed",
            }:
                raise MailProviderError(
                    "No fue posible encontrar este correo en Microsoft."
                )

            if error_code in {
                "ErrorInvalidRequest",
                "RequestBodyRead",
                "BadRequest",
            }:
                raise MailProviderError(
                    "Microsoft rechazó el borrador. Verifica los "
                    "destinatarios, el contenido y los adjuntos."
                )

            raise MailProviderError(error_message[:500])

        if response.status_code in (202, 204):
            return {}

        if (
            allow_empty_response
            and not response.content
        ):
            return {}

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
        return (
            self._list_message_ids(
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
        normalized_max_results = max(0, int(max_results))

        if normalized_max_results == 0:
            return []

        self._cache_mail_folder_ids(
            access_token=access_token,
        )

        spam_folder_id = self._folder_cache.get("spam")

        if not spam_folder_id:
            logger.warning(
                "Microsoft Junk Email folder could not be resolved. "
                "Skipping spam synchronization."
            )
            return []

        return self._list_message_ids(
            access_token=access_token,
            after=after,
            max_results=normalized_max_results,
            folder_id=spam_folder_id,
        )

    def _list_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
        folder_id: str | None,
    ) -> list[str]:
        normalized_max_results = max(0, int(max_results))

        if normalized_max_results == 0:
            return []

        if folder_id:
            encoded_folder_id = quote(
                folder_id,
                safe="",
            )
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
            "$top": min(
                MAX_PAGE_SIZE,
                normalized_max_results,
            ),
        }

        page_count = 0

        while (
            next_url
            and len(message_ids) < normalized_max_results
            and page_count < MAX_PAGINATION_PAGES
        ):
            page_count += 1

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

                if len(message_ids) >= normalized_max_results:
                    break

            next_link = data.get("@odata.nextLink")
            next_url = (
                str(next_link).strip()
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
        normalized_message_id = self._required_message_id(
            provider_message_id
        )
        encoded_message_id = quote(
            normalized_message_id,
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
                    "flag,parentFolderId,internetMessageId"
                ),
            },
            prefer_text_body=False,
        )

        self._cache_mail_folder_ids(
            access_token=access_token,
        )

        attachments: list[dict[str, Any]] = []

        if include_attachments and bool(data.get("hasAttachments")):
            attachments = self._get_attachments(
                access_token=access_token,
                provider_message_id=normalized_message_id,
            )

        return self._normalize_message(
            data=data,
            attachments=attachments,
            attachments_loaded=include_attachments,
        )

    def update_message_state(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        is_read: bool | None = None,
        is_starred: bool | None = None,
    ) -> dict[str, Any]:
        validate_message_state_update(
            is_read=is_read,
            is_starred=is_starred,
        )

        normalized_message_id = self._required_message_id(
            provider_message_id
        )
        payload: dict[str, Any] = {}

        if is_read is not None:
            payload["isRead"] = is_read

        if is_starred is not None:
            payload["flag"] = {
                "flagStatus": (
                    "flagged" if is_starred else "notFlagged"
                ),
            }

        encoded_message_id = quote(
            normalized_message_id,
            safe="",
        )

        self._request(
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
        normalized_folder = normalize_mail_folder(folder)

        if normalized_folder in {"sent", "drafts"}:
            raise MailProviderError(
                "No puedes mover un correo a esa carpeta."
            )

        normalized_message_id = self._required_message_id(
            provider_message_id
        )
        destination_id = self._get_destination_folder_id(
            access_token=access_token,
            folder=normalized_folder,
        )
        encoded_message_id = quote(
            normalized_message_id,
            safe="",
        )

        moved_data = self._request(
            method="POST",
            url=(
                f"{MICROSOFT_MESSAGES_ENDPOINT}/"
                f"{encoded_message_id}/move"
            ),
            access_token=access_token,
            json={
                "destinationId": destination_id,
            },
        )

        moved_message_id = self._normalize_string(
            moved_data.get("id")
        )

        if not moved_message_id:
            raise MailProviderError(
                "Microsoft no devolvió el correo movido."
            )

        return self.get_message(
            access_token=access_token,
            provider_message_id=moved_message_id,
            include_attachments=True,
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
        payload = self._build_draft_payload(
            to_recipients=to_recipients,
            cc_recipients=cc_recipients,
            bcc_recipients=bcc_recipients,
            subject=subject,
            body=body,
            body_content_type=body_content_type,
            attachments=attachments,
        )
        normalized_attachments = validate_mail_attachments(
            attachments
        )

        data = self._request(
            method="POST",
            url=MICROSOFT_MESSAGES_ENDPOINT,
            access_token=access_token,
            json=payload,
        )

        provider_message_id = self._required_message_id(
            self._normalize_string(data.get("id"))
        )

        self._replace_draft_attachments(
            access_token=access_token,
            provider_message_id=provider_message_id,
            attachments=normalized_attachments,
        )

        return self.get_message(
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
        normalized_message_id = self._required_message_id(
            provider_message_id
        )
        payload = self._build_draft_payload(
            to_recipients=to_recipients,
            cc_recipients=cc_recipients,
            bcc_recipients=bcc_recipients,
            subject=subject,
            body=body,
            body_content_type=body_content_type,
            attachments=attachments,
        )
        normalized_attachments = validate_mail_attachments(
            attachments
        )
        encoded_message_id = quote(
            normalized_message_id,
            safe="",
        )

        self._request(
            method="PATCH",
            url=(
                f"{MICROSOFT_MESSAGES_ENDPOINT}/"
                f"{encoded_message_id}"
            ),
            access_token=access_token,
            json=payload,
            allow_empty_response=True,
        )

        self._replace_draft_attachments(
            access_token=access_token,
            provider_message_id=normalized_message_id,
            attachments=normalized_attachments,
        )

        return self.get_message(
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
        normalized_message_id = self._required_message_id(
            provider_message_id
        )
        encoded_message_id = quote(
            normalized_message_id,
            safe="",
        )

        self._request(
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
        normalized_message_id = self._required_message_id(
            provider_message_id
        )
        normalized_snapshot = self._normalize_draft_snapshot(
            provider_message_id=normalized_message_id,
            draft_snapshot=draft_snapshot,
        )

        validate_sendable_draft(
            to_recipients=normalized_snapshot["recipients"]["to"],
            cc_recipients=normalized_snapshot["recipients"]["cc"],
            bcc_recipients=normalized_snapshot["recipients"]["bcc"],
        )

        encoded_message_id = quote(
            normalized_message_id,
            safe="",
        )

        self._request(
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
            "sent_at": (
                normalized_snapshot.get("sent_at")
                or now
            ),
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
            message = self.get_message(
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

    def _normalize_draft_snapshot(
        self,
        *,
        provider_message_id: str,
        draft_snapshot: dict[str, Any] | None,
    ) -> dict[str, Any]:
        snapshot = (
            draft_snapshot
            if isinstance(draft_snapshot, dict)
            else {}
        )

        raw_recipients = snapshot.get("recipients")
        recipients_data = (
            raw_recipients
            if isinstance(raw_recipients, dict)
            else {}
        )

        recipients = {
            "from": normalize_recipients(
                recipients_data.get("from")
                if isinstance(recipients_data.get("from"), list)
                else []
            ),
            "to": normalize_recipients(
                recipients_data.get("to")
                if isinstance(recipients_data.get("to"), list)
                else []
            ),
            "cc": normalize_recipients(
                recipients_data.get("cc")
                if isinstance(recipients_data.get("cc"), list)
                else []
            ),
            "bcc": normalize_recipients(
                recipients_data.get("bcc")
                if isinstance(recipients_data.get("bcc"), list)
                else []
            ),
            "reply_to": normalize_recipients(
                recipients_data.get("reply_to")
                if isinstance(recipients_data.get("reply_to"), list)
                else []
            ),
        }

        raw_attachments = snapshot.get("attachments")
        attachments = (
            raw_attachments
            if isinstance(raw_attachments, list)
            else []
        )

        attachment_count = int(
            snapshot.get("attachment_count")
            or len(attachments)
        )

        return {
            "provider_message_id": provider_message_id,
            "provider_thread_id": self._normalize_string(
                snapshot.get("provider_thread_id")
            ),
            "provider_conversation_id": self._normalize_string(
                snapshot.get("provider_conversation_id")
            ),
            "provider_change_key": self._normalize_string(
                snapshot.get("provider_change_key")
            ),
            "provider_etag": self._normalize_string(
                snapshot.get("provider_etag")
            ),
            "provider_web_link": self._normalize_string(
                snapshot.get("provider_web_link")
            ),
            "provider_created_at": self._normalize_string(
                snapshot.get("provider_created_at")
            ),
            "provider_updated_at": self._normalize_string(
                snapshot.get("provider_updated_at")
            ),
            "direction": "outbound",
            "status": "sent",
            "folder": "sent",
            "is_read": True,
            "is_starred": bool(
                snapshot.get("is_starred")
            ),
            "is_archived": False,
            "is_spam": False,
            "is_trashed": False,
            "subject": normalize_text(
                snapshot.get("subject"),
                max_length=1000,
            ),
            "body_text": normalize_text(
                snapshot.get("body_text"),
                max_length=200_000,
            ),
            "body_html": normalize_text(
                snapshot.get("body_html"),
                max_length=200_000,
            ),
            "body_preview": normalize_text(
                snapshot.get("body_preview"),
                max_length=1000,
            ),
            "snippet": normalize_text(
                snapshot.get("snippet"),
                max_length=1000,
            ),
            "message_id_header": self._normalize_string(
                snapshot.get("message_id_header")
            ),
            "in_reply_to_header": self._normalize_string(
                snapshot.get("in_reply_to_header")
            ),
            "references_header": self._normalize_string(
                snapshot.get("references_header")
            ),
            "sent_at": self._normalize_string(
                snapshot.get("sent_at")
            ),
            "received_at": None,
            "has_attachments": bool(
                snapshot.get("has_attachments")
                or attachments
            ),
            "attachment_count": attachment_count,
            "recipients": recipients,
            "attachments": attachments,
            "metadata": (
                snapshot.get("metadata")
                if isinstance(snapshot.get("metadata"), dict)
                else {}
            ),
        }

    def _replace_draft_attachments(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        attachments: list[dict[str, Any]],
    ) -> None:
        self._delete_all_draft_attachments(
            access_token=access_token,
            provider_message_id=provider_message_id,
        )

        for attachment in attachments:
            self._add_draft_attachment(
                access_token=access_token,
                provider_message_id=provider_message_id,
                attachment=attachment,
            )

    def _delete_all_draft_attachments(
        self,
        *,
        access_token: str,
        provider_message_id: str,
    ) -> None:
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

        while next_url and page_count < MAX_ATTACHMENT_PAGES:
            page_count += 1

            data = self._request(
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

                attachment_id = self._normalize_string(
                    item.get("id")
                )

                if attachment_id:
                    attachment_ids.append(attachment_id)

            next_link = data.get("@odata.nextLink")
            next_url = (
                self._normalize_string(next_link)
                if next_link
                else None
            )

        for attachment_id in attachment_ids:
            encoded_attachment_id = quote(
                attachment_id,
                safe="",
            )

            self._request(
                method="DELETE",
                url=(
                    f"{MICROSOFT_MESSAGES_ENDPOINT}/"
                    f"{encoded_message_id}/attachments/"
                    f"{encoded_attachment_id}"
                ),
                access_token=access_token,
                allow_empty_response=True,
            )

    def _add_draft_attachment(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        attachment: dict[str, Any],
    ) -> None:
        encoded_message_id = quote(
            provider_message_id,
            safe="",
        )

        content_bytes = attachment["content"]

        self._request(
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

    def _build_draft_payload(
        self,
        *,
        to_recipients: list[dict[str, str | None]],
        cc_recipients: list[dict[str, str | None]],
        bcc_recipients: list[dict[str, str | None]],
        subject: str | None,
        body: str | None,
        body_content_type: str,
        attachments: list[dict[str, Any]],
    ) -> dict[str, Any]:
        normalized_to = normalize_recipients(to_recipients)
        normalized_cc = normalize_recipients(cc_recipients)
        normalized_bcc = normalize_recipients(bcc_recipients)
        normalized_subject = normalize_text(
            subject,
            max_length=1000,
            fallback="",
        ) or ""
        normalized_body = normalize_text(
            body,
            max_length=200_000,
            fallback="",
        ) or ""
        normalized_content_type = normalize_body_content_type(
            body_content_type
        )

        validate_draft_content(
            to_recipients=normalized_to,
            cc_recipients=normalized_cc,
            bcc_recipients=normalized_bcc,
            subject=normalized_subject,
            body=normalized_body,
            attachments=attachments,
        )

        return {
            "subject": normalized_subject,
            "body": {
                "contentType": (
                    "HTML"
                    if normalized_content_type == "html"
                    else "Text"
                ),
                "content": normalized_body,
            },
            "toRecipients": self._serialize_recipients(
                normalized_to
            ),
            "ccRecipients": self._serialize_recipients(
                normalized_cc
            ),
            "bccRecipients": self._serialize_recipients(
                normalized_bcc
            ),
        }

    def _serialize_recipients(
        self,
        recipients: list[dict[str, str | None]],
    ) -> list[dict[str, dict[str, str]]]:
        return [
            {
                "emailAddress": {
                    "address": recipient["email"],
                    "name": (
                        recipient.get("display_name") or ""
                    ),
                }
            }
            for recipient in recipients
        ]

    def _cache_mail_folder_ids(
        self,
        *,
        access_token: str,
    ) -> None:
        if self._folder_cache_loaded:
            return

        next_url: str | None = MICROSOFT_MAIL_FOLDERS_ENDPOINT
        first_params: dict[str, Any] | None = {
            "$select": "id,displayName",
            "$top": 100,
        }
        page_count = 0

        while next_url and page_count < MAX_PAGINATION_PAGES:
            page_count += 1

            data = self._request(
                method="GET",
                url=next_url,
                access_token=access_token,
                params=first_params,
            )

            first_params = None

            values = data.get("value")

            if not isinstance(values, list):
                values = []

            for folder in values:
                if not isinstance(folder, dict):
                    continue

                folder_id = self._normalize_string(
                    folder.get("id")
                )
                display_name = self._normalize_string(
                    folder.get("displayName")
                )

                if not folder_id or not display_name:
                    continue

                normalized_name = display_name.casefold()

                for folder_key, known_names in (
                    MICROSOFT_FOLDER_DISPLAY_NAMES.items()
                ):
                    if normalized_name in known_names:
                        self._folder_cache[folder_key] = folder_id
                        break

            next_link = data.get("@odata.nextLink")
            next_url = (
                self._normalize_string(next_link)
                if next_link
                else None
            )

        for folder_key, well_known_name in (
            MICROSOFT_WELL_KNOWN_FOLDER_NAMES.items()
        ):
            if folder_key in self._folder_cache:
                continue

            try:
                data = self._request(
                    method="GET",
                    url=(
                        f"{MICROSOFT_MAIL_FOLDERS_ENDPOINT}/"
                        f"{well_known_name}"
                    ),
                    access_token=access_token,
                    params={
                        "$select": "id",
                    },
                )
                folder_id = self._normalize_string(
                    data.get("id")
                )

                if folder_id:
                    self._folder_cache[folder_key] = folder_id
            except MailProviderError:
                continue

        self._folder_cache_loaded = True

    def _get_destination_folder_id(
        self,
        *,
        access_token: str,
        folder: str,
    ) -> str:
        self._cache_mail_folder_ids(
            access_token=access_token,
        )

        folder_id = self._folder_cache.get(folder)

        if folder_id:
            return folder_id

        if folder == "archived":
            raise MailProviderError(
                "No se encontró la carpeta Archivo de Microsoft."
            )

        well_known_name = MICROSOFT_WELL_KNOWN_FOLDER_NAMES.get(
            folder
        )

        if not well_known_name:
            raise MailProviderError(
                "La carpeta destino no es compatible."
            )

        data = self._request(
            method="GET",
            url=(
                f"{MICROSOFT_MAIL_FOLDERS_ENDPOINT}/"
                f"{well_known_name}"
            ),
            access_token=access_token,
            params={
                "$select": "id",
            },
        )

        folder_id = self._normalize_string(data.get("id"))

        if not folder_id:
            raise MailProviderError(
                "Microsoft no devolvió la carpeta destino."
            )

        self._folder_cache[folder] = folder_id

        return folder_id

    def _required_message_id(
        self,
        provider_message_id: str,
    ) -> str:
        normalized_message_id = self._normalize_string(
            provider_message_id
        )

        if not normalized_message_id:
            raise MailProviderError(
                "El identificador del correo de Microsoft es inválido."
            )

        return normalized_message_id

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
        page_count = 0

        while next_url and page_count < MAX_ATTACHMENT_PAGES:
            page_count += 1

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
        attachments_loaded: bool,
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
            if is_draft or (sent_at and not received_at)
            else "inbound"
        )

        flag = data.get("flag")

        if not isinstance(flag, dict):
            flag = {}

        flag_status = str(
            flag.get("flagStatus") or ""
        ).strip().lower()

        parent_folder_id = self._normalize_string(
            data.get("parentFolderId")
        )
        folder = self._map_folder(
            parent_folder_id=parent_folder_id,
            is_draft=is_draft,
        )
        status = self._map_status(
            folder=folder,
            is_draft=is_draft,
        )

        subject = normalize_text(
            data.get("subject"),
            max_length=1000,
        )
        preview = normalize_text(
            data.get("bodyPreview"),
            max_length=1000,
        )

        has_attachments = bool(data.get("hasAttachments"))

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
            "is_starred": flag_status == "flagged",
            "is_archived": folder == "archived",
            "is_spam": folder == "spam",
            "is_trashed": folder == "trash",
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
            "has_attachments": has_attachments,
            "attachment_count": len(attachments),
            "recipients": recipients,
            "attachments": attachments,
            "metadata": {
                "microsoft_parent_folder_id": parent_folder_id,
                "microsoft_importance": data.get("importance"),
                "microsoft_flag_status": flag_status,
                "microsoft_body_content_type": body_type,
                "microsoft_attachments_loaded": (
                    attachments_loaded
                ),
                "microsoft_uses_immutable_id": True,
            },
        }

    def _map_folder(
        self,
        *,
        parent_folder_id: str | None,
        is_draft: bool,
    ) -> str:
        if is_draft:
            return "drafts"

        if parent_folder_id:
            for folder, folder_id in self._folder_cache.items():
                if parent_folder_id == folder_id:
                    return folder

        return "inbox"

    def _map_status(
        self,
        *,
        folder: str,
        is_draft: bool,
    ) -> str:
        if is_draft:
            return "draft"

        if folder == "sent":
            return "sent"

        if folder == "trash":
            return "trashed"

        return "received"

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