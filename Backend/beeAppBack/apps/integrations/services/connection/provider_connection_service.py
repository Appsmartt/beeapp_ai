from __future__ import annotations

from typing import Any

from apps.integrations.services.connection.repository_service import (
    upsert_connection,
)
from apps.integrations.services.connection.shared import (
    normalize_string_list,
    token_granted_scopes,
)
from apps.integrations.services.google_oauth_service import (
    calculate_token_expiration as calculate_google_token_expiration,
)
from apps.integrations.services.microsoft_oauth_service import (
    calculate_token_expiration as calculate_microsoft_token_expiration,
)


def upsert_google_connection(
    *,
    user_id: str,
    oauth_request: dict[str, Any],
    token_data: dict[str, Any],
    user_info: dict[str, Any],
) -> dict[str, Any]:
    return upsert_connection(
        user_id=user_id,
        provider="google",
        provider_account_id=str(user_info["sub"]),
        provider_tenant_id=None,
        provider_email=user_info.get("email"),
        provider_display_name=user_info.get("name"),
        provider_avatar_url=user_info.get("picture"),
        granted_scopes=token_granted_scopes(token_data),
        requested_capabilities=normalize_string_list(
            oauth_request.get("requested_capabilities")
        ),
        token_data=token_data,
        token_expires_at=calculate_google_token_expiration(
            token_data
        ),
        metadata={
            "email_verified": bool(
                user_info.get("email_verified")
            ),
        },
    )


def upsert_microsoft_connection(
    *,
    user_id: str,
    oauth_request: dict[str, Any],
    token_data: dict[str, Any],
    user_info: dict[str, Any],
) -> dict[str, Any]:
    provider_email = (
        user_info.get("mail")
        or user_info.get("userPrincipalName")
    )

    return upsert_connection(
        user_id=user_id,
        provider="microsoft",
        provider_account_id=str(user_info["id"]),
        provider_tenant_id=None,
        provider_email=provider_email,
        provider_display_name=user_info.get("displayName"),
        provider_avatar_url=None,
        granted_scopes=token_granted_scopes(token_data),
        requested_capabilities=normalize_string_list(
            oauth_request.get("requested_capabilities")
        ),
        token_data=token_data,
        token_expires_at=calculate_microsoft_token_expiration(
            token_data
        ),
        metadata={
            "user_type": user_info.get("userType"),
            "user_principal_name": user_info.get(
                "userPrincipalName"
            ),
        },
    )
