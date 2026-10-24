from __future__ import annotations

from typing import Any
from uuid import UUID

from apps.calendar.exceptions import (
    CalendarTagError,
    CalendarTagNotFoundError,
)
from apps.calendar.services.calendar_service_modules.shared import (
    get_supabase,
    response_data,
    to_string_list,
)
def assign_event_tags(
    *,
    user_id: str,
    event_id: str,
    tag_ids: list[UUID | str],
) -> None:
    normalized_tag_ids = list(dict.fromkeys(to_string_list(tag_ids)))

    if not normalized_tag_ids:
        return

    try:
        supabase = get_supabase()
        tags_response = (
            supabase.table("calendar_tags")
            .select("id")
            .eq("owner_id", user_id)
            .in_("id", normalized_tag_ids)
            .execute()
        )
        found_tag_ids = {
            tag["id"] for tag in response_data(tags_response)
        }
        missing_tag_ids = set(normalized_tag_ids).difference(
            found_tag_ids
        )

        if missing_tag_ids:
            raise CalendarTagNotFoundError(
                "One or more calendar tags were not found."
            )

        response = (
            supabase.table("calendar_event_tag_assignments")
            .insert(
                [
                    {
                        "event_id": event_id,
                        "tag_id": tag_id,
                        "assigned_by_user_id": user_id,
                    }
                    for tag_id in normalized_tag_ids
                ]
            )
            .execute()
        )

        if len(response_data(response)) != len(normalized_tag_ids):
            raise CalendarTagError(
                "Could not assign all calendar tags."
            )

    except (
        CalendarTagNotFoundError,
        CalendarTagError,
    ):
        raise

    except Exception as error:
        raise CalendarTagError(
            "Could not assign calendar tags."
        ) from error


def replace_event_tags(
    *,
    user_id: str,
    event_id: str,
    tag_ids: list[UUID | str],
) -> None:
    try:
        get_supabase().table(
            "calendar_event_tag_assignments"
        ).delete().eq(
            "event_id",
            event_id,
        ).execute()

        assign_event_tags(
            user_id=user_id,
            event_id=event_id,
            tag_ids=tag_ids,
        )

    except (
        CalendarTagNotFoundError,
        CalendarTagError,
    ):
        raise

    except Exception as error:
        raise CalendarTagError(
            "Could not replace calendar tags."
        ) from error
