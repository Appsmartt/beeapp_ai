from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.notes.exceptions import NoteTemplateError


NOTE_TEMPLATE_COLUMNS = (
    "id,slug,name,description,icon,color,content,"
    "is_active,display_order,created_by,created_at,updated_at"
)


def list_note_templates(
    *,
    include_inactive: bool = False,
) -> list[dict[str, Any]]:
    try:
        query = (
            get_supabase_admin_client()
            .table("note_templates")
            .select(NOTE_TEMPLATE_COLUMNS)
            .order("display_order")
            .order("name")
        )

        if not include_inactive:
            query = query.eq("is_active", True)

        response = query.execute()

        return response.data or []

    except Exception as error:
        raise NoteTemplateError(
            "Could not retrieve note templates."
        ) from error