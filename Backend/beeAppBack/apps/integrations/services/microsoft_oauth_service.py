from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from django.conf import settings

from apps.integrations.exceptions import (
    IntegrationConfigurationError,
    IntegrationProviderError,
    IntegrationReauthorizationRequiredError,
)


logger = logging.getLogger(__name__)


MICROSOFT_AUTHORIZATION_ENDPOINT = (
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
)

MICROSOFT_TOKEN_ENDPOINT = (
    "https://login.microsoftonline.com/common/oauth2/v2.0/token"
)

MICROSOFT_GRAPH_ME_ENDPOINT = (
    "https://graph.microsoft.com/v1.0/me"
)

MICROSOFT_IDENTITY_SCOPES = (
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "Mail.ReadWrite",
    "Mail.Send",
    "Calendars.ReadWrite",
)

HTTP_TIMEOUT_SECONDS = 15.0


def _get_required_setting(name: str) -> str:
    value = getattr(settings, name, "")

    if not value:
        raise IntegrationConfigurationError(
            f"Missing required integration setting: {name}"
        )

    return value


def _parse_error_response(
    response: httpx.Response,
) -> dict[str, Any]:
    try:
        data = response.json()
    except ValueError:
        return {
            "raw_body": response.text[:1_000],
        }

    return data if isinstance(data, dict) else {}


def build_microsoft_authorization_url(
    *,
    state: str,
    code_challenge: str,
    requested_scopes: list[str] | None = None,
) -> str:
    client_id = _get_required_setting(
        "MICROSOFT_OAUTH_CLIENT_ID"
    )
    redirect_uri = _get_required_setting(
        "MICROSOFT_OAUTH_REDIRECT_URI"
    )

    scopes = list(MICROSOFT_IDENTITY_SCOPES)

    for scope in requested_scopes or []:
        normalized_scope = str(scope).strip()

        if normalized_scope and normalized_scope not in scopes:
            scopes.append(normalized_scope)

    query = urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "response_mode": "query",
            "scope": " ".join(scopes),
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "prompt": "select_account",
        }
    )

    return f"{MICROSOFT_AUTHORIZATION_ENDPOINT}?{query}"


def exchange_microsoft_authorization_code(
    *,
    authorization_code: str,
    code_verifier: str,
) -> dict[str, Any]:
    client_id = _get_required_setting(
        "MICROSOFT_OAUTH_CLIENT_ID"
    )
    client_secret = _get_required_setting(
        "MICROSOFT_OAUTH_CLIENT_SECRET"
    )
    redirect_uri = _get_required_setting(
        "MICROSOFT_OAUTH_REDIRECT_URI"
    )

    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": authorization_code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
        "code_verifier": code_verifier,
    }

    try:
        response = httpx.post(
            MICROSOFT_TOKEN_ENDPOINT,
            data=payload,
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as error:
        raise IntegrationProviderError(
            "Microsoft token endpoint could not be reached."
        ) from error

    if response.status_code >= 400:
        error_data = _parse_error_response(response)

        logger.warning(
            "Microsoft authorization-code exchange failed. "
            "status_code=%s error=%s",
            response.status_code,
            error_data,
        )

        raise IntegrationProviderError(
            "Microsoft could not complete the authorization."
        )

    try:
        token_data = response.json()
    except ValueError as error:
        raise IntegrationProviderError(
            "Microsoft returned an invalid token response."
        ) from error

    if not isinstance(token_data, dict):
        raise IntegrationProviderError(
            "Microsoft returned an invalid token response."
        )

    if not token_data.get("access_token"):
        raise IntegrationProviderError(
            "Microsoft did not return an access token."
        )

    return token_data


def refresh_microsoft_access_token(
    *,
    refresh_token: str,
) -> dict[str, Any]:
    client_id = _get_required_setting(
        "MICROSOFT_OAUTH_CLIENT_ID"
    )
    client_secret = _get_required_setting(
        "MICROSOFT_OAUTH_CLIENT_SECRET"
    )

    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
        "scope": " ".join(MICROSOFT_IDENTITY_SCOPES),
    }

    try:
        response = httpx.post(
            MICROSOFT_TOKEN_ENDPOINT,
            data=payload,
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as error:
        raise IntegrationProviderError(
            "Microsoft token refresh endpoint could not be reached."
        ) from error

    if response.status_code >= 400:
        error_data = _parse_error_response(response)
        error_code = str(error_data.get("error") or "")

        logger.warning(
            "Microsoft refresh-token exchange failed. "
            "status_code=%s error=%s",
            response.status_code,
            error_data,
        )

        if error_code in {
            "invalid_grant",
            "invalid_client",
        }:
            raise IntegrationReauthorizationRequiredError(
                "Microsoft authorization must be granted again."
            )

        raise IntegrationProviderError(
            "Microsoft could not refresh the access token."
        )

    try:
        token_data = response.json()
    except ValueError as error:
        raise IntegrationProviderError(
            "Microsoft returned an invalid refresh response."
        ) from error

    if not isinstance(token_data, dict):
        raise IntegrationProviderError(
            "Microsoft returned an invalid refresh response."
        )

    if not token_data.get("access_token"):
        raise IntegrationProviderError(
            "Microsoft did not return a refreshed access token."
        )

    return token_data


def get_microsoft_user_info(
    *,
    access_token: str,
) -> dict[str, Any]:
    try:
        response = httpx.get(
            MICROSOFT_GRAPH_ME_ENDPOINT,
            headers={
                "Authorization": f"Bearer {access_token}",
            },
            params={
                "$select": (
                    "id,displayName,mail,userPrincipalName,"
                    "userType"
                ),
            },
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as error:
        raise IntegrationProviderError(
            "Microsoft profile endpoint could not be reached."
        ) from error

    if response.status_code >= 400:
        error_data = _parse_error_response(response)

        logger.warning(
            "Microsoft profile request failed. "
            "status_code=%s error=%s",
            response.status_code,
            error_data,
        )

        raise IntegrationProviderError(
            "Microsoft could not return account information."
        )

    try:
        user_info = response.json()
    except ValueError as error:
        raise IntegrationProviderError(
            "Microsoft returned invalid account information."
        ) from error

    if not isinstance(user_info, dict):
        raise IntegrationProviderError(
            "Microsoft returned invalid account information."
        )

    if not user_info.get("id"):
        raise IntegrationProviderError(
            "Microsoft did not return a stable account identifier."
        )

    return user_info


def calculate_token_expiration(
    token_data: dict[str, Any],
) -> datetime | None:
    expires_in = token_data.get("expires_in")

    try:
        seconds = int(expires_in)
    except (TypeError, ValueError):
        return None

    return datetime.now(timezone.utc) + timedelta(
        seconds=seconds
    )