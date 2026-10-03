"""Microsoft Graph mail folder discovery and resolution."""

from __future__ import annotations

from typing import Any

from apps.mail.services.mail_provider_service import MailProviderError
from apps.mail.services.microsoft_provider.constants import (
    MAX_PAGINATION_PAGES,
    MICROSOFT_FOLDER_DISPLAY_NAMES,
    MICROSOFT_MAIL_FOLDERS_ENDPOINT,
    MICROSOFT_WELL_KNOWN_FOLDER_NAMES,
)
from apps.mail.services.microsoft_provider.graph_client import (
    MicrosoftGraphClient,
)
from apps.mail.services.microsoft_provider.message_normalizer import (
    normalize_string,
)


class MicrosoftFolderService:
    """Cache and resolve Microsoft Graph mail folder identifiers."""

    def __init__(
        self,
        *,
        graph_client: MicrosoftGraphClient,
    ) -> None:
        self._graph_client = graph_client
        self._folder_cache: dict[str, str] = {}
        self._folder_cache_loaded = False

    @property
    def cache(self) -> dict[str, str]:
        """Expose the shared folder cache to message normalization."""
        return self._folder_cache

    def cache_mail_folder_ids(
        self,
        *,
        access_token: str,
    ) -> None:
        """Load known Microsoft folders once for this provider instance."""
        if self._folder_cache_loaded:
            return

        next_url: str | None = MICROSOFT_MAIL_FOLDERS_ENDPOINT
        first_params: dict[str, Any] | None = {
            "$select": "id,displayName",
            "$top": 100,
        }
        page_count = 0

        while (
            next_url
            and page_count < MAX_PAGINATION_PAGES
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

            for folder in values:
                if not isinstance(folder, dict):
                    continue

                folder_id = normalize_string(folder.get("id"))
                display_name = normalize_string(
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
                normalize_string(next_link)
                if next_link
                else None
            )

        for folder_key, well_known_name in (
            MICROSOFT_WELL_KNOWN_FOLDER_NAMES.items()
        ):
            if folder_key in self._folder_cache:
                continue

            try:
                data = self._graph_client.request(
                    method="GET",
                    url=(
                        f"{MICROSOFT_MAIL_FOLDERS_ENDPOINT}/"
                        f"{well_known_name}"
                    ),
                    access_token=access_token,
                    params={"$select": "id"},
                )
                folder_id = normalize_string(data.get("id"))

                if folder_id:
                    self._folder_cache[folder_key] = folder_id
            except MailProviderError:
                continue

        self._folder_cache_loaded = True

    def get_destination_folder_id(
        self,
        *,
        access_token: str,
        folder: str,
    ) -> str:
        """Resolve a BeeApp folder to its Microsoft Graph identifier."""
        self.cache_mail_folder_ids(access_token=access_token)
        folder_id = self._folder_cache.get(folder)

        if folder_id:
            return folder_id

        if folder == "archived":
            raise MailProviderError(
                "No se encontró la carpeta Archivo de Microsoft."
            )

        well_known_name = MICROSOFT_WELL_KNOWN_FOLDER_NAMES.get(folder)

        if not well_known_name:
            raise MailProviderError(
                "La carpeta destino no es compatible."
            )

        data = self._graph_client.request(
            method="GET",
            url=(
                f"{MICROSOFT_MAIL_FOLDERS_ENDPOINT}/"
                f"{well_known_name}"
            ),
            access_token=access_token,
            params={"$select": "id"},
        )
        folder_id = normalize_string(data.get("id"))

        if not folder_id:
            raise MailProviderError(
                "Microsoft no devolvió la carpeta destino."
            )

        self._folder_cache[folder] = folder_id
        return folder_id
