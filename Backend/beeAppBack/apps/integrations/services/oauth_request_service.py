from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta
from typing import Any

from django.utils import timezone

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.integrations.exceptions import (
    IntegrationAuthorizationError,
)
from apps.integrations.services.credential_crypto_service import (
    decrypt_integration_secret,
    encrypt_integration_secret,
)
from apps.integrations.services.google_oauth_service import (
    build_pkce_pair,
)


OAUTH_REQUEST_TTL_MINUTES = 10

MOBILE_RETURN_PATH = "/(main)/profile/integrations"
WEB_RETURN_PATH = "/app/profile/integrations/result"


def _supabase():
    return get_supabase_admin_client()


def _hash_state(state: str) -> str:
    return hashlib.sha256(
        state.encode("utf-8")
    ).hexdigest()


def _extract_single(response) -> dict[str, Any] | None:
    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _get_return_path(
    client_channel: str,
) -> str:
    if client_channel == "web":
        return WEB_RETURN_PATH

    if client_channel == "mobile":
        return MOBILE_RETURN_PATH

    raise IntegrationAuthorizationError(
        "Unsupported OAuth client channel."
    )


def create_oauth_request(
    *,
    user_id: str,
    provider: str,
    requested_scopes: list[str],
    requested_capabilities: list[str],
    client_channel: str,
    existing_connection_id: str | None = None,
) -> dict[str, str]:
    state = secrets.token_urlsafe(48)
    verifier, challenge = build_pkce_pair()
    expires_at = timezone.now() + timedelta(
        minutes=OAUTH_REQUEST_TTL_MINUTES
    )

    return_path = _get_return_path(client_channel)

    payload = {
        "user_id": user_id,
        "provider": provider,
        "requested_scopes": requested_scopes,
        "requested_capabilities": requested_capabilities,
        "state_hash": _hash_state(state),
        "pkce_verifier_ciphertext": encrypt_integration_secret(
            verifier
        ),
        "existing_connection_id": existing_connection_id,
        "return_path": return_path,
        "expires_at": expires_at.isoformat(),
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
            "request_id": oauth_request["id"],
            "state": state,
            "code_challenge": challenge,
            "expires_at": oauth_request["expires_at"],
        }
    except IntegrationAuthorizationError:
        raise
    except Exception as error:
        raise IntegrationAuthorizationError(
            "Could not store authorization request."
        ) from error


def consume_oauth_request(
    *,
    provider: str,
    state: str,
) -> dict[str, Any]:
    state_hash = _hash_state(state)
    now = timezone.now().isoformat()

    try:
        response = (
            _supabase()
            .table("integration_oauth_requests")
            .select("*")
            .eq("provider", provider)
            .eq("state_hash", state_hash)
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

        consumed_response = (
            _supabase()
            .table("integration_oauth_requests")
            .update(
                {
                    "consumed_at": now,
                }
            )
            .eq("id", oauth_request["id"])
            .is_("consumed_at", "null")
            .execute()
        )

        consumed_request = _extract_single(consumed_response)

        if not consumed_request:
            raise IntegrationAuthorizationError(
                "Authorization request was already used."
            )

        code_verifier = decrypt_integration_secret(
            oauth_request.get("pkce_verifier_ciphertext")
        )

        if not code_verifier:
            raise IntegrationAuthorizationError(
                "Authorization verifier is unavailable."
            )

        return {
            **oauth_request,
            "code_verifier": code_verifier,
        }
    except IntegrationAuthorizationError:
        raise
    except Exception as error:
        raise IntegrationAuthorizationError(
            "Could not validate authorization request."
        ) from error