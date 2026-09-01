from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.statuses.exceptions import StatusOperationError


TEXT_BACKGROUND_COLUMNS = (
    "id,code,label,hex_color,is_active,sort_order,created_at"
)


def list_active_text_backgrounds() -> list[dict[str, Any]]:
    """
    Devuelve los fondos sólidos activos para estados de texto.

    La tabla queda protegida por RLS para los clientes. Django usa el
    cliente administrativo y expone únicamente los campos necesarios
    para que el frontend renderice el selector de color.
    """
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("status_text_backgrounds")
                .select(TEXT_BACKGROUND_COLUMNS)
                .eq("is_active", True)
                .order("sort_order")
                .execute()
            ),
        )

        data = getattr(response, "data", None)

        if not isinstance(data, list):
            return []

        return [
            {
                "id": str(background["id"]),
                "code": background["code"],
                "label": background["label"],
                "hex_color": background["hex_color"],
                "sort_order": int(background["sort_order"]),
            }
            for background in data
        ]

    except Exception as error:
        raise StatusOperationError(
            "Could not retrieve text backgrounds."
        ) from error
