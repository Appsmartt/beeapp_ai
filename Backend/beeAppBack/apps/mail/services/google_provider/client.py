"""HTTP client for the Gmail API."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from apps.mail.services.google_provider.constants import (
    HTTP_TIMEOUT_SECONDS,
)
from apps.mail.services.mail_provider_service import MailProviderError


logger = logging.getLogger(__name__)


class GmailApiClient:
    """Perform authenticated requests to the Gmail API."""

    def headers(
        self,
        access_token: str,
        *,
        json_body: bool = False,
    ) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
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
    ) -> dict[str, Any]:
        try:
            response = httpx.request(
                method,
                url,
                headers=self.headers(
                    access_token,
                    json_body=json is not None,
                ),
                params=params,
                json=json,
                timeout=HTTP_TIMEOUT_SECONDS,
            )
        except httpx.HTTPError as error:
            raise MailProviderError(
                "Gmail no pudo ser contactado."
            ) from error

        if response.status_code in (401, 403):
            self._raise_authorization_error(response)

        if response.status_code >= 400:
            self._raise_request_error(
                method=method,
                url=url,
                response=response,
            )

        if response.status_code == 204:
            return {}

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

    def _raise_authorization_error(
        self,
        response: httpx.Response,
    ) -> None:
        error_payload = self._error_payload(response)
        error = error_payload.get("error") or {}
        errors = error.get("errors") or []
        primary_error = errors[0] if errors else {}
        reason = (
            primary_error.get("reason")
            or error.get("status")
            or "unknown"
        )

        logger.warning(
            "Gmail API request rejected. status_code=%s reason=%s response=%s",
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
                "Vuelve a conectar tu cuenta y acepta los permisos "
                "solicitados."
            )

        raise MailProviderError(
            "Gmail rechazó la solicitud. "
            "Vuelve a conectar tu cuenta o inténtalo más tarde."
        )

    def _raise_request_error(
        self,
        *,
        method: str,
        url: str,
        response: httpx.Response,
    ) -> None:
        error_payload = self._error_payload(response)
        error = error_payload.get("error") or {}
        errors = error.get("errors") or []
        primary_error = errors[0] if errors else {}
        reason = (
            primary_error.get("reason")
            or error.get("status")
            or "unknown"
        )
        message = (
            primary_error.get("message")
            or error.get("message")
            or "Gmail devolvió un error inesperado."
        )

        logger.warning(
            "Gmail API request failed. method=%s url=%s status_code=%s "
            "reason=%s response=%s",
            method,
            url,
            response.status_code,
            reason,
            error_payload,
        )

        if reason in {"invalidArgument", "failedPrecondition"}:
            raise MailProviderError(
                "Gmail rechazó el borrador. Verifica los destinatarios, "
                "el asunto y los adjuntos."
            )

        if reason == "notFound":
            raise MailProviderError(
                "El borrador ya no existe en Gmail. "
                "Vuelve a redactar el correo."
            )

        raise MailProviderError(str(message)[:500])

    def _error_payload(
        self,
        response: httpx.Response,
    ) -> dict[str, Any]:
        try:
            payload = response.json()
        except ValueError:
            return {"raw_body": response.text[:1_000]}

        return payload if isinstance(payload, dict) else {}
