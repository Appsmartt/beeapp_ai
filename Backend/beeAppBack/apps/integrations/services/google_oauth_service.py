from __future__ import annotations

import base64
import hashlib
import secrets
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


GOOGLE_AUTHORIZATION_ENDPOINT = (
    "https://accounts.google.com/o/oauth2/v2/auth"
)

GOOGLE_TOKEN_ENDPOINT = (
    "https://oauth2.googleapis.com/token"
)

GOOGLE_USERINFO_ENDPOINT = (
    "https://openidconnect.googleapis.com/v1/userinfo"
)

GOOGLE_IDENTITY_SCOPES = (
    "openid",
    "email",
    "profile",
)

HTTP_TIMEOUT_SECONDS = 15.0


def _get_required_setting(name: str) -> str:
    value = getattr(settings, name, "")

    if not value:
        raise IntegrationConfigurationError(
            f"Missing required integration setting: {name}"
        )

    return value


def build_pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)

    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(
            verifier.encode("utf-8")
        ).digest()
    ).decode("utf-8").rstrip("=")

    return verifier, challenge


def build_google_authorization_url(
    *,
    state: str,
    code_challenge: str,
    requested_scopes: list[str] | None = None,
) -> str:
    client_id = _get_required_setting(
        "GOOGLE_OAUTH_CLIENT_ID"
    )
    redirect_uri = _get_required_setting(
        "GOOGLE_OAUTH_REDIRECT_URI"
    )

    scopes = list(GOOGLE_IDENTITY_SCOPES)

    for scope in requested_scopes or []:
        normalized_scope = str(scope).strip()

        if normalized_scope and normalized_scope not in scopes:
            scopes.append(normalized_scope)

    query = urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
        }
    )

    return f"{GOOGLE_AUTHORIZATION_ENDPOINT}?{query}"


def exchange_google_authorization_code(
    *,
    authorization_code: str,
    code_verifier: str,
) -> dict[str, Any]:
    client_id = _get_required_setting(
        "GOOGLE_OAUTH_CLIENT_ID"
    )
    client_secret = _get_required_setting(
        "GOOGLE_OAUTH_CLIENT_SECRET"
    )
    redirect_uri = _get_required_setting(
        "GOOGLE_OAUTH_REDIRECT_URI"
    )

    payload = {
        "code": authorization_code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
        "code_verifier": code_verifier,
    }

    try:
        response = httpx.post(
            GOOGLE_TOKEN_ENDPOINT,
            data=payload,
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as error:
        raise IntegrationProviderError(
            "Google token endpoint could not be reached."
        ) from error

    if response.status_code >= 400:
        raise IntegrationProviderError(
            "Google could not complete the authorization."
        )

    try:
        token_data = response.json()
    except ValueError as error:
        raise IntegrationProviderError(
            "Google returned an invalid token response."
        ) from error

    if not token_data.get("access_token"):
        raise IntegrationProviderError(
            "Google did not return an access token."
        )

    return token_data


def refresh_google_access_token(
    *,
    refresh_token: str,
) -> dict[str, Any]:
    client_id = _get_required_setting(
        "GOOGLE_OAUTH_CLIENT_ID"
    )
    client_secret = _get_required_setting(
        "GOOGLE_OAUTH_CLIENT_SECRET"
    )

    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    try:
        response = httpx.post(
            GOOGLE_TOKEN_ENDPOINT,
            data=payload,
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as error:
        raise IntegrationProviderError(
            "Google token refresh endpoint could not be reached."
        ) from error

    if response.status_code >= 400:
        try:
            error_data = response.json()
        except ValueError:
            error_data = {}

        if error_data.get("error") in {
            "invalid_grant",
            "invalid_client",
        }:
            raise IntegrationReauthorizationRequiredError(
                "Google authorization must be granted again."
            )

        raise IntegrationProviderError(
            "Google could not refresh the access token."
        )

    try:
        token_data = response.json()
    except ValueError as error:
        raise IntegrationProviderError(
            "Google returned an invalid refresh response."
        ) from error

    if not token_data.get("access_token"):
        raise IntegrationProviderError(
            "Google did not return a refreshed access token."
        )

    return token_data


def get_google_user_info(
    *,
    access_token: str,
) -> dict[str, Any]:
    try:
        response = httpx.get(
            GOOGLE_USERINFO_ENDPOINT,
            headers={
                "Authorization": f"Bearer {access_token}",
            },
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as error:
        raise IntegrationProviderError(
            "Google user information endpoint could not be reached."
        ) from error

    if response.status_code >= 400:
        raise IntegrationProviderError(
            "Google could not return account information."
        )

    try:
        user_info = response.json()
    except ValueError as error:
        raise IntegrationProviderError(
            "Google returned invalid account information."
        ) from error

    if not user_info.get("sub"):
        raise IntegrationProviderError(
            "Google did not return a stable account identifier."
        )

    return user_info


def calculate_token_expiration(
    token_data: dict[str, Any],
) -> datetime | None:
    expires_in = token_data.get("expires_in")

    if not isinstance(expires_in, int):
        return None

    return datetime.now(timezone.utc) + timedelta(
        seconds=expires_in
    )