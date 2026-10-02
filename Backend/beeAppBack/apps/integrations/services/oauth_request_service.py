from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import timedelta
from typing import Any

from django.utils import timezone

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.integrations.exceptions import IntegrationAuthorizationError
from apps.integrations.services.credential_crypto_service import (
    decrypt_integration_secret,
    encrypt_integration_secret,
)
from apps.integrations.services.google_oauth_service import build_pkce_pair


OAUTH_REQUEST_TTL_MINUTES = 10
MOBILE_RETURN_PATH = "/(main)/profile/integrations"
WEB_RETURN_PATH = "/app/profile/integrations/result"


def _supabase():
    return get_supabase_admin_client()


def _hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _extract_single(response) -> dict[str, Any] | None:
    data = getattr(response, "data", None)
    if isinstance(data, list):
        return data[0] if data else None
    if isinstance(data, dict):
        return data
    return None


def _get_return_path(client_channel: str) -> str:
    if client_channel == "web":
        return WEB_RETURN_PATH
    if client_channel == "mobile":
        return MOBILE_RETURN_PATH
    raise IntegrationAuthorizationError("Unsupported OAuth client channel.")


def _get_active_mobile_session_id(
    *, user_id: str, access_token: str
) -> str:
    from apps.accounts.services.device_session_service import (
        get_active_mobile_device_session_for_auth_session,
    )

    device_session = get_active_mobile_device_session_for_auth_session(
        user_id=user_id,
        access_token=access_token,
    )
    session_id = str(device_session.get("auth_session_id") or "").strip()
    if not session_id:
        raise IntegrationAuthorizationError(
            "Mobile authorization session is unavailable."
        )
    return session_id


def create_oauth_request(
    *,
    user_id: str,
    access_token: str,
    provider: str,
    requested_scopes: list[str],
    requested_capabilities: list[str],
    client_channel: str,
    existing_connection_id: str | None = None,
) -> dict[str, str]:
    state = secrets.token_urlsafe(48)
    verifier, challenge = build_pkce_pair()
    browser_binding_secret = secrets.token_urlsafe(48)
    browser_start_token = secrets.token_urlsafe(48)
    expires_at = timezone.now() + timedelta(minutes=OAUTH_REQUEST_TTL_MINUTES)
    return_path = _get_return_path(client_channel)
    auth_session_id = _get_active_mobile_session_id(
        user_id=user_id,
        access_token=access_token,
    )

    payload = {
        "user_id": user_id,
        "provider": provider,
        "requested_scopes": requested_scopes,
        "requested_capabilities": requested_capabilities,
        "state_hash": _hash_value(state),
        "pkce_verifier_ciphertext": encrypt_integration_secret(verifier),
        "existing_connection_id": existing_connection_id,
        "return_path": return_path,
        "expires_at": expires_at.isoformat(),
        "browser_binding_hash": _hash_value(browser_binding_secret),
        "browser_start_token_hash": _hash_value(browser_start_token),
        "browser_binding_secret_ciphertext": encrypt_integration_secret(
            browser_binding_secret
        ),
        "oauth_state_ciphertext": encrypt_integration_secret(state),
        "pkce_challenge_ciphertext": encrypt_integration_secret(challenge),
        "initiating_auth_session_hash": _hash_value(auth_session_id),
    }

    try:
        response = (
            _supabase()
            .table("integration_oauth_requests")
            .insert(payload)
            .execute()
        )
        oauth_request = _extract_single(response)
        if not oauth_request:
            raise IntegrationAuthorizationError(
                "Could not create authorization request."
            )
        return {
            "request_id": str(oauth_request["id"]),
            "state": state,
            "code_challenge": challenge,
            "browser_start_token": browser_start_token,
            "expires_at": oauth_request["expires_at"],
        }
    except IntegrationAuthorizationError:
        raise
    except Exception as error:
        raise IntegrationAuthorizationError(
            "Could not store authorization request."
        ) from error


def start_browser_oauth_request(
    *, browser_start_token: str
) -> dict[str, Any]:
    now = timezone.now().isoformat()
    try:
        response = (
            _supabase()
            .table("integration_oauth_requests")
            .select("*")
            .eq("browser_start_token_hash", _hash_value(browser_start_token))
            .is_("consumed_at", "null")
            .is_("cancelled_at", "null")
            .is_("browser_started_at", "null")
            .gt("expires_at", now)
            .maybe_single()
            .execute()
        )
        oauth_request = getattr(response, "data", None)
        if not oauth_request:
            raise IntegrationAuthorizationError(
                "Browser authorization request is invalid or expired."
            )

        updated = (
            _supabase()
            .table("integration_oauth_requests")
            .update({"browser_started_at": now})
            .eq("id", oauth_request["id"])
            .is_("browser_started_at", "null")
            .execute()
        )
        if not _extract_single(updated):
            raise IntegrationAuthorizationError(
                "Browser authorization request was already started."
            )

        state = decrypt_integration_secret(
            oauth_request.get("oauth_state_ciphertext")
        )
        challenge = decrypt_integration_secret(
            oauth_request.get("pkce_challenge_ciphertext")
        )
        binding_secret = decrypt_integration_secret(
            oauth_request.get("browser_binding_secret_ciphertext")
        )
        if not state or not challenge or not binding_secret:
            raise IntegrationAuthorizationError(
                "Browser authorization request is unavailable."
            )

        return {
            **oauth_request,
            "state": state,
            "code_challenge": challenge,
            "browser_binding_secret": binding_secret,
        }
    except IntegrationAuthorizationError:
        raise
    except Exception as error:
        raise IntegrationAuthorizationError(
            "Could not start browser authorization request."
        ) from error


def find_callback_oauth_request(
    *,
    provider: str,
    state: str,
) -> dict[str, Any]:
    now = timezone.now().isoformat()

    try:
        response = (
            _supabase()
            .table("integration_oauth_requests")
            .select("id")
            .eq("provider", provider)
            .eq("state_hash", _hash_value(state))
            .is_("consumed_at", "null")
            .is_("cancelled_at", "null")
            .gt("expires_at", now)
            .maybe_single()
            .execute()
        )

        oauth_request = getattr(response, "data", None)

        if not oauth_request:
            raise IntegrationAuthorizationError(
                "Authorization request is invalid or expired."
            )

        return oauth_request
    except IntegrationAuthorizationError:
        raise
    except Exception as error:
        raise IntegrationAuthorizationError(
            "Could not locate authorization request."
        ) from error


def get_callback_oauth_request(
    *,
    provider: str,
    state: str,
    browser_binding_secret: str,
) -> dict[str, Any]:
    normalized_secret = browser_binding_secret.strip()

    if not normalized_secret:
        raise IntegrationAuthorizationError(
            "Browser authorization binding is missing."
        )

    now = timezone.now().isoformat()
    binding_hash = _hash_value(normalized_secret)

    try:
        response = (
            _supabase()
            .table("integration_oauth_requests")
            .select("*")
            .eq("provider", provider)
            .eq("state_hash", _hash_value(state))
            .eq("browser_binding_hash", binding_hash)
            .is_("consumed_at", "null")
            .is_("cancelled_at", "null")
            .not_.is_("browser_started_at", "null")
            .gt("expires_at", now)
            .maybe_single()
            .execute()
        )

        oauth_request = getattr(response, "data", None)

        if not oauth_request:
            raise IntegrationAuthorizationError(
                "Authorization request is invalid or expired."
            )

        return oauth_request
    except IntegrationAuthorizationError:
        raise
    except Exception as error:
        raise IntegrationAuthorizationError(
            "Could not validate authorization request."
        ) from error

def cancel_oauth_request(
    *,
    oauth_request_id: str,
    provider_error_code: str | None = None,
    provider_error_description: str | None = None,
) -> None:
    now = timezone.now().isoformat()
    payload = {
        "cancelled_at": now,
        "provider_error_code": provider_error_code,
        "provider_error_description": (
            provider_error_description[:500]
            if provider_error_description
            else None
        ),
        "provider_callback_received_at": now,
    }
    try:
        response = (
            _supabase()
            .table("integration_oauth_requests")
            .update(payload)
            .eq("id", oauth_request_id)
            .is_("provider_callback_received_at", "null")
            .is_("consumed_at", "null")
            .is_("cancelled_at", "null")
            .execute()
        )
        if not _extract_single(response):
            raise IntegrationAuthorizationError(
                "Authorization callback was already received."
            )
    except IntegrationAuthorizationError:
        raise
    except Exception as error:
        raise IntegrationAuthorizationError(
            "Could not cancel authorization request."
        ) from error


def record_provider_callback(
    *,
    oauth_request_id: str,
    authorization_code: str | None = None,
    provider_error_code: str | None = None,
    provider_error_description: str | None = None,
) -> str | None:
    now = timezone.now().isoformat()
    confirmation_token = (
        secrets.token_urlsafe(48) if authorization_code else None
    )
    payload = {
        "provider_authorization_code_ciphertext": (
            encrypt_integration_secret(authorization_code)
            if authorization_code
            else None
        ),
        "provider_error_code": provider_error_code,
        "provider_error_description": (
            provider_error_description[:500]
            if provider_error_description
            else None
        ),
        "provider_callback_received_at": now,
        "mobile_confirmation_token_hash": (
            _hash_value(confirmation_token)
            if confirmation_token
            else None
        ),
    }

    try:
        response = (
            _supabase()
            .table("integration_oauth_requests")
            .update(payload)
            .eq("id", oauth_request_id)
            .is_("provider_callback_received_at", "null")
            .is_("consumed_at", "null")
            .is_("cancelled_at", "null")
            .execute()
        )
        if not _extract_single(response):
            raise IntegrationAuthorizationError(
                "Authorization callback was already received."
            )
        return confirmation_token
    except IntegrationAuthorizationError:
        raise
    except Exception as error:
        raise IntegrationAuthorizationError(
            "Could not store authorization callback."
        ) from error


def get_mobile_confirmation_context(
    *,
    user_id: str,
    access_token: str,
    request_id: str,
    confirmation_token: str,
) -> dict[str, Any]:
    now = timezone.now().isoformat()
    auth_session_id = _get_active_mobile_session_id(
        user_id=user_id,
        access_token=access_token,
    )

    try:
        response = (
            _supabase()
            .table("integration_oauth_requests")
            .select("*")
            .eq("id", request_id)
            .eq("user_id", user_id)
            .eq(
                "initiating_auth_session_hash",
                _hash_value(auth_session_id),
            )
            .eq(
                "mobile_confirmation_token_hash",
                _hash_value(confirmation_token),
            )
            .is_("consumed_at", "null")
            .is_("cancelled_at", "null")
            .is_("mobile_confirmed_at", "null")
            .not_.is_("provider_callback_received_at", "null")
            .gt("expires_at", now)
            .maybe_single()
            .execute()
        )

        oauth_request = getattr(response, "data", None)

        if not oauth_request:
            raise IntegrationAuthorizationError(
                "Authorization confirmation is invalid or expired."
            )

        authorization_code = decrypt_integration_secret(
            oauth_request.get(
                "provider_authorization_code_ciphertext"
            )
        )
        code_verifier = decrypt_integration_secret(
            oauth_request.get("pkce_verifier_ciphertext")
        )

        if not authorization_code or not code_verifier:
            raise IntegrationAuthorizationError(
                "Authorization result is unavailable."
            )

        return {
            **oauth_request,
            "authorization_code": authorization_code,
            "code_verifier": code_verifier,
        }
    except IntegrationAuthorizationError:
        raise
    except Exception as error:
        raise IntegrationAuthorizationError(
            "Could not validate authorization confirmation."
        ) from error


def finalize_mobile_confirmation(
    *,
    request_id: str,
    confirmation_token: str,
) -> None:
    now = timezone.now().isoformat()

    try:
        response = (
            _supabase()
            .table("integration_oauth_requests")
            .update(
                {
                    "mobile_confirmed_at": now,
                    "consumed_at": now,
                }
            )
            .eq("id", request_id)
            .eq(
                "mobile_confirmation_token_hash",
                _hash_value(confirmation_token),
            )
            .is_("consumed_at", "null")
            .is_("cancelled_at", "null")
            .is_("mobile_confirmed_at", "null")
            .execute()
        )

        if not _extract_single(response):
            raise IntegrationAuthorizationError(
                "Authorization confirmation was already used."
            )
    except IntegrationAuthorizationError:
        raise
    except Exception as error:
        raise IntegrationAuthorizationError(
            "Could not finalize authorization confirmation."
        ) from error
