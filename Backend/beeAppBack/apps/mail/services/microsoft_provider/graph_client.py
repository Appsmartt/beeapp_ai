"""Secure HTTP client for Microsoft Graph mail operations."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from apps.mail.services.mail_provider_service import MailProviderError
from apps.mail.services.microsoft_provider.constants import (
    HTTP_TIMEOUT_SECONDS,
    MICROSOFT_IMMUTABLE_ID_PREFER,
)
from apps.mail.services.microsoft_provider.graph_url_guard import (
    validate_microsoft_graph_url,
)


logger = logging.getLogger(__name__)


class MicrosoftGraphClient:
    """Perform validated Microsoft Graph requests."""

    def headers(
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

    def request(
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
        """Call Microsoft Graph after validating the target URL."""
        validate_microsoft_graph_url(url)

        try:
            response = httpx.request(
                method,
                url,
                headers=self.headers(
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
            self._raise_authorization_error(
                method=method,
                url=url,
                response=response,
            )

        if response.status_code >= 400:
            self._raise_response_error(
                method=method,
                url=url,
                response=response,
            )

        if response.status_code in (202, 204):
            return {}

        if allow_empty_response and not response.content:
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

    def _raise_authorization_error(
        self,
        *,
        method: str,
        url: str,
        response: httpx.Response,
    ) -> None:
        error_payload = self._get_error_payload(response)
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

    def _raise_response_error(
        self,
        *,
        method: str,
        url: str,
        response: httpx.Response,
    ) -> None:
        error_payload = self._get_error_payload(response)
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

    def _get_error_payload(
        self,
        response: httpx.Response,
    ) -> dict[str, Any]:
        try:
            payload = response.json()
        except ValueError:
            payload = {
                "raw_body": response.text[:1_000],
            }

        return payload if isinstance(payload, dict) else {}
