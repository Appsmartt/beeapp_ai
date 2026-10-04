from __future__ import annotations

from typing import Any

from .connection_repository import get_connection_map
from .constants import MAIL_INTEGRATION_COLUMNS
from .response_helpers import extract_single, get_supabase, response_data
from .serializer_service import serialize_mail_integration


def list_mail_integrations(
    *,
    user_id: str,
    provider: str | None = None,
    include_inactive: bool = True,
) -> list[dict[str, Any]]:
    try:
        query = (
            get_supabase()
            .table("mail_integrations")
            .select(MAIL_INTEGRATION_COLUMNS)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
        )

        if provider:
            query = query.eq("provider", provider)

        if not include_inactive:
            query = query.eq("status", "active")

        integrations = response_data(query.execute())
        connection_map = get_connection_map(
            user_id=user_id,
            connection_ids=[
                str(item["integration_connection_id"])
                for item in integrations
                if item.get("integration_connection_id")
            ],
        )

        return [
            serialize_mail_integration(
                integration=integration,
                connection=connection_map.get(
                    str(
                        integration.get(
                            "integration_connection_id"
                        )
                        or ""
                    )
                ),
            )
            for integration in integrations
        ]
    except Exception:
        return []


def get_mail_integration(
    *,
    user_id: str,
    integration_id: str,
) -> dict[str, Any] | None:
    try:
        response = (
            get_supabase()
            .table("mail_integrations")
            .select(MAIL_INTEGRATION_COLUMNS)
            .eq("id", integration_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        integration = extract_single(response)

        if not integration:
            return None

        connection_map = get_connection_map(
            user_id=user_id,
            connection_ids=[
                str(integration["integration_connection_id"])
            ],
        )

        return serialize_mail_integration(
            integration=integration,
            connection=connection_map.get(
                str(integration["integration_connection_id"])
            ),
        )
    except Exception:
        return None
