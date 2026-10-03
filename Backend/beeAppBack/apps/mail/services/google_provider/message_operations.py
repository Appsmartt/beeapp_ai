"""Remote Gmail message operations."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

from apps.mail.services.google_provider.client import GmailApiClient
from apps.mail.services.google_provider.constants import (
    GOOGLE_GMAIL_MESSAGES_ENDPOINT,
    GOOGLE_GMAIL_PROFILE_ENDPOINT,
    GOOGLE_GMAIL_SYSTEM_LABEL_INBOX,
    GOOGLE_GMAIL_SYSTEM_LABEL_SPAM,
    GOOGLE_GMAIL_SYSTEM_LABEL_STARRED,
    GOOGLE_GMAIL_SYSTEM_LABEL_TRASH,
    GOOGLE_GMAIL_SYSTEM_LABEL_UNREAD,
    MAX_PAGE_SIZE,
)
from apps.mail.services.google_provider.message_normalizer import (
    GmailMessageNormalizer,
)
from apps.mail.services.mail_provider_service import (
    MailProviderError,
    normalize_mail_folder,
    validate_message_state_update,
)


class GmailMessageOperations:
    """Read and update Gmail messages."""

    def __init__(
        self,
        *,
        client: GmailApiClient,
        normalizer: GmailMessageNormalizer,
    ) -> None:
        self._client = client
        self._normalizer = normalizer

    def get_profile_history_id(
        self,
        *,
        access_token: str,
    ) -> str | None:
        data = self._client.request(
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
        message_ids = self._list_message_ids(
            access_token=access_token,
            after=after,
            max_results=max_results,
            label_ids=None,
            include_spam_trash=True,
        )
        return (
            message_ids,
            self.get_profile_history_id(access_token=access_token),
        )

    def list_spam_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
    ) -> list[str]:
        return self._list_message_ids(
            access_token=access_token,
            after=after,
            max_results=max_results,
            label_ids=[GOOGLE_GMAIL_SYSTEM_LABEL_SPAM],
            include_spam_trash=True,
        )

    def get_message(
        self,
        *,
        access_token: str,
        provider_message_id: str,
    ) -> dict[str, Any]:
        data = self._client.request(
            method="GET",
            url=(
                f"{GOOGLE_GMAIL_MESSAGES_ENDPOINT}/"
                f"{quote(provider_message_id, safe='')}"
            ),
            access_token=access_token,
            params={"format": "full"},
        )
        return self._normalizer.normalize_message(data)

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
        add_label_ids: list[str] = []
        remove_label_ids: list[str] = []

        if is_read is True:
            remove_label_ids.append(GOOGLE_GMAIL_SYSTEM_LABEL_UNREAD)
        elif is_read is False:
            add_label_ids.append(GOOGLE_GMAIL_SYSTEM_LABEL_UNREAD)

        if is_starred is True:
            add_label_ids.append(GOOGLE_GMAIL_SYSTEM_LABEL_STARRED)
        elif is_starred is False:
            remove_label_ids.append(GOOGLE_GMAIL_SYSTEM_LABEL_STARRED)

        return self._normalize_modified_message(
            access_token=access_token,
            provider_message_id=provider_message_id,
            add_label_ids=add_label_ids,
            remove_label_ids=remove_label_ids,
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

        add_label_ids: list[str] = []
        remove_label_ids: list[str] = []

        if normalized_folder == "inbox":
            add_label_ids.append(GOOGLE_GMAIL_SYSTEM_LABEL_INBOX)
            remove_label_ids.extend(
                [
                    GOOGLE_GMAIL_SYSTEM_LABEL_SPAM,
                    GOOGLE_GMAIL_SYSTEM_LABEL_TRASH,
                ]
            )
        elif normalized_folder == "archived":
            remove_label_ids.extend(
                [
                    GOOGLE_GMAIL_SYSTEM_LABEL_INBOX,
                    GOOGLE_GMAIL_SYSTEM_LABEL_SPAM,
                    GOOGLE_GMAIL_SYSTEM_LABEL_TRASH,
                ]
            )
        elif normalized_folder == "spam":
            add_label_ids.append(GOOGLE_GMAIL_SYSTEM_LABEL_SPAM)
            remove_label_ids.extend(
                [
                    GOOGLE_GMAIL_SYSTEM_LABEL_INBOX,
                    GOOGLE_GMAIL_SYSTEM_LABEL_TRASH,
                ]
            )
        elif normalized_folder == "trash":
            add_label_ids.append(GOOGLE_GMAIL_SYSTEM_LABEL_TRASH)
            remove_label_ids.extend(
                [
                    GOOGLE_GMAIL_SYSTEM_LABEL_INBOX,
                    GOOGLE_GMAIL_SYSTEM_LABEL_SPAM,
                ]
            )
        else:
            raise MailProviderError(
                "No puedes mover un correo a esa carpeta."
            )

        return self._normalize_modified_message(
            access_token=access_token,
            provider_message_id=provider_message_id,
            add_label_ids=add_label_ids,
            remove_label_ids=remove_label_ids,
        )

    def _list_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
        label_ids: list[str] | None,
        include_spam_trash: bool,
    ) -> list[str]:
        normalized_max_results = max(0, int(max_results))

        if normalized_max_results == 0:
            return []

        message_ids: list[str] = []
        page_token: str | None = None
        after_timestamp = int(
            after.astimezone(timezone.utc).timestamp()
        )

        while len(message_ids) < normalized_max_results:
            params: dict[str, Any] = {
                "q": f"after:{after_timestamp}",
                "maxResults": min(
                    MAX_PAGE_SIZE,
                    normalized_max_results - len(message_ids),
                ),
                "includeSpamTrash": include_spam_trash,
            }

            if label_ids:
                params["labelIds"] = label_ids
            if page_token:
                params["pageToken"] = page_token

            data = self._client.request(
                method="GET",
                url=GOOGLE_GMAIL_MESSAGES_ENDPOINT,
                access_token=access_token,
                params=params,
            )
            messages = data.get("messages")

            if not isinstance(messages, list):
                messages = []

            for message in messages:
                if isinstance(message, dict):
                    message_id = str(message.get("id") or "").strip()

                    if message_id:
                        message_ids.append(message_id)

                    if len(message_ids) >= normalized_max_results:
                        break

            next_page_token = data.get("nextPageToken")
            page_token = str(next_page_token) if next_page_token else None

            if not page_token:
                break

        return message_ids[:normalized_max_results]

    def _normalize_modified_message(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        add_label_ids: list[str],
        remove_label_ids: list[str],
    ) -> dict[str, Any]:
        normalized_message_id = str(provider_message_id or "").strip()

        if not normalized_message_id:
            raise MailProviderError(
                "El identificador del correo de Gmail es inválido."
            )

        if not add_label_ids and not remove_label_ids:
            raise MailProviderError(
                "No hay cambios para aplicar al correo."
            )

        data = self._client.request(
            method="POST",
            url=(
                f"{GOOGLE_GMAIL_MESSAGES_ENDPOINT}/"
                f"{quote(normalized_message_id, safe='')}/modify"
            ),
            access_token=access_token,
            json={
                "addLabelIds": list(dict.fromkeys(add_label_ids)),
                "removeLabelIds": list(
                    dict.fromkeys(remove_label_ids)
                ),
            },
        )
        return self._normalizer.normalize_message(data)
