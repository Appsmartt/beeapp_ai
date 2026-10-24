"""OAuth redirect, scope, cookie, and authorization request helpers."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlencode

from django.conf import settings
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.response import Response

from apps.accounts.views import (
    AuthenticatedAPIView,
    is_local_development_request,
)
from apps.integrations.exceptions import IntegrationConfigurationError
from apps.integrations.services.google_oauth_service import (
    GOOGLE_CALENDAR_SCOPES,
    GOOGLE_IDENTITY_SCOPES,
    GOOGLE_MAIL_SCOPES,
)
from apps.integrations.services.microsoft_oauth_service import (
    MICROSOFT_IDENTITY_SCOPES,
)

from .dependencies import OAuthDependencies


MOBILE_RETURN_PATH = "/(main)/profile/integrations"
WEB_RETURN_PATH = "/app/profile/integrations/result"
OAUTH_CALLBACK_COOKIE_PREFIX = "beeapp_oauth_binding_"
OAUTH_CALLBACK_COOKIE_PATH = "/api/integrations/oauth/callback/"
OAUTH_CALLBACK_COOKIE_MAX_AGE_SECONDS = 10 * 60


class BeeAppRedirectResponse(HttpResponseRedirect):
    allowed_schemes = ["http", "https", "beeapp"]


def build_redirect_url(
    *,
    base_url: str,
    outcome: str,
    request_id: str | None = None,
    detail: str | None = None,
    confirmation_token: str | None = None,
) -> str:
    query = {"outcome": outcome}
    if request_id:
        query["request_id"] = request_id
    if detail:
        query["detail"] = detail[:200]
    if confirmation_token:
        query["confirmation_token"] = confirmation_token
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}{urlencode(query)}"


def get_web_result_redirect_url() -> str:
    return getattr(settings, "INTEGRATION_WEB_RESULT_REDIRECT", "").strip()


def get_mobile_result_redirect_url(*, outcome: str) -> str:
    setting_name = (
        "INTEGRATION_MOBILE_SUCCESS_REDIRECT"
        if outcome == "success"
        else "INTEGRATION_MOBILE_FAILURE_REDIRECT"
    )
    return getattr(settings, setting_name, "").strip()


def get_callback_redirect_base_url(
    *,
    return_path: str | None,
    outcome: str,
) -> str:
    if return_path == WEB_RETURN_PATH:
        return get_web_result_redirect_url()
    return get_mobile_result_redirect_url(outcome=outcome)


def build_callback_redirect_response(
    *,
    outcome: str,
    request_id: str | None = None,
    detail: str | None = None,
    confirmation_token: str | None = None,
    return_path: str | None = None,
) -> BeeAppRedirectResponse:
    base_url = get_callback_redirect_base_url(
        return_path=return_path,
        outcome=outcome,
    )
    if not base_url:
        raise IntegrationConfigurationError(
            "Integration callback redirect is not configured."
        )
    redirect_url = build_redirect_url(
        base_url=base_url,
        outcome=outcome,
        request_id=request_id,
        detail=detail,
        confirmation_token=confirmation_token,
    )
    return BeeAppRedirectResponse(redirect_url)


def build_callback_failure_response(
    *,
    provider_name: str,
    detail: str,
    return_path: str | None = None,
    request_id: str | None = None,
) -> BeeAppRedirectResponse:
    try:
        return build_callback_redirect_response(
            outcome="failure",
            request_id=request_id,
            detail=f"{provider_name}: {detail}",
            return_path=return_path,
        )
    except IntegrationConfigurationError:
        return BeeAppRedirectResponse(
            "beeapp://integrations/result?outcome=failure"
        )


def unauthorized_response() -> Response:
    return Response(
        {"detail": "Invalid or expired access token."},
        status=status.HTTP_401_UNAUTHORIZED,
    )


def normalize_capabilities(
    capabilities: list[str] | None,
) -> list[str]:
    normalized: list[str] = []
    for capability in capabilities or []:
        value = str(capability).strip().lower()
        if value and value not in normalized:
            normalized.append(value)
    return normalized


def append_unique_scopes(
    scopes: list[str],
    additional_scopes: tuple[str, ...] | list[str],
) -> None:
    for scope in additional_scopes:
        normalized_scope = str(scope).strip()
        if normalized_scope and normalized_scope not in scopes:
            scopes.append(normalized_scope)


def get_identity_scopes(
    provider: str,
    capabilities: list[str] | None = None,
) -> list[str]:
    normalized_capabilities = normalize_capabilities(capabilities)

    if provider == "google":
        scopes = list(GOOGLE_IDENTITY_SCOPES)
        if "calendar" in normalized_capabilities:
            append_unique_scopes(scopes, GOOGLE_CALENDAR_SCOPES)
        if "mail" in normalized_capabilities:
            append_unique_scopes(scopes, GOOGLE_MAIL_SCOPES)
        return scopes

    if provider == "microsoft":
        return list(MICROSOFT_IDENTITY_SCOPES)

    raise IntegrationConfigurationError(
        f"Unsupported integration provider: {provider}"
    )


def callback_cookie_name(request_id: str) -> str:
    return f"{OAUTH_CALLBACK_COOKIE_PREFIX}{request_id}"


def set_callback_cookie(
    response: Any,
    request: Any,
    oauth_request: dict[str, Any],
) -> None:
    response.set_cookie(
        callback_cookie_name(str(oauth_request["id"])),
        oauth_request["browser_binding_secret"],
        httponly=True,
        secure=not is_local_development_request(request),
        samesite="Lax",
        max_age=OAUTH_CALLBACK_COOKIE_MAX_AGE_SECONDS,
        path=OAUTH_CALLBACK_COOKIE_PATH,
    )


def delete_callback_cookie(
    response: Any,
    request_id: str | None,
) -> None:
    if request_id:
        response.delete_cookie(
            callback_cookie_name(str(request_id)),
            path=OAUTH_CALLBACK_COOKIE_PATH,
        )


def build_authorization_response_payload(
    *,
    oauth_request: dict[str, Any],
    dependencies: OAuthDependencies,
) -> dict[str, Any]:
    browser_start_path = (
        "/api/integrations/oauth/browser-start/"
        f"?token={oauth_request['browser_start_token']}"
    )
    return {
        "request_id": oauth_request["request_id"],
        "authorization_url": (
            dependencies.build_provider_authorization_url(
                provider=oauth_request["provider"],
                state=oauth_request["state"],
                code_challenge=oauth_request["code_challenge"],
                requested_scopes=oauth_request["requested_scopes"],
            )
        ),
        "browser_start_path": browser_start_path,
        "expires_at": oauth_request["expires_at"],
    }


def create_authorization_request(
    *,
    request: Any,
    authenticated_user: Any,
    provider: str,
    requested_scopes: list[str],
    requested_capabilities: list[str],
    client_channel: str,
    dependencies: OAuthDependencies,
    existing_connection_id: str | None = None,
) -> dict[str, Any]:
    access_token = AuthenticatedAPIView().get_bearer_access_token(request)
    return dependencies.create_oauth_request(
        user_id=str(authenticated_user.id),
        access_token=access_token,
        provider=provider,
        requested_scopes=requested_scopes,
        requested_capabilities=requested_capabilities,
        client_channel=client_channel,
        existing_connection_id=existing_connection_id,
    )
