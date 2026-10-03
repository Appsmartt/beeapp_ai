from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import (
    CalendarCreateError,
    CalendarDeleteError,
    CalendarError,
    CalendarNotFoundError,
    CalendarTagError,
    CalendarTagNotFoundError,
    CalendarUpdateError,
)
from apps.calendar.services.calendar_service_modules.access import (
    get_calendar_for_user,
)
from apps.calendar.services.calendar_service_modules.shared import (
    CALENDAR_COLUMNS,
    TAG_COLUMNS,
    extract_single,
    get_supabase,
    response_data,
)


def list_calendars(
    *,
    user_id: str,
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    try:
        supabase = get_supabase()

        owned_response = (
            supabase.table("calendars")
            .select(CALENDAR_COLUMNS)
            .eq("owner_id", user_id)
            .order("is_default", desc=True)
            .order("name")
            .execute()
        )

        shared_response = (
            supabase.table("calendar_shares")
            .select(
                "calendar_id,permission,accepted_at,revoked_at,"
                "calendars("
                "id,owner_id,name,description,color,visibility,"
                "is_default,is_archived,timezone,created_at,updated_at"
                ")"
            )
            .eq("shared_with_user_id", user_id)
            .not_.is_("accepted_at", "null")
            .is_("revoked_at", "null")
            .execute()
        )

        calendars_by_id: dict[str, dict[str, Any]] = {}

        for calendar in response_data(owned_response):
            calendars_by_id[calendar["id"]] = {
                **calendar,
                "share_permission": "owner",
                "can_create_events": not calendar[
                    "is_archived"
                ],
            }

        for share in response_data(shared_response):
            calendar = share.get("calendars")

            if not calendar:
                continue

            permission = share.get("permission")

            if permission not in ("viewer", "editor"):
                continue

            calendars_by_id[calendar["id"]] = {
                **calendar,
                "share_permission": permission,
                "can_create_events": (
                    permission == "editor"
                    and not calendar["is_archived"]
                ),
            }

        calendars = list(calendars_by_id.values())

        if not include_archived:
            calendars = [
                calendar
                for calendar in calendars
                if not calendar["is_archived"]
            ]

        calendars.sort(
            key=lambda calendar: (
                calendar["share_permission"] != "owner",
                not calendar["is_default"],
                calendar["name"].lower(),
            )
        )

        return calendars

    except Exception as error:
        raise CalendarError(
            "Could not retrieve calendars."
        ) from error


def create_calendar(
    *,
    user_id: str,
    name: str,
    description: str | None = None,
    color: str = "#6025D2",
    timezone: str = "America/Bogota",
) -> dict[str, Any]:
    try:
        response = (
            get_supabase()
            .table("calendars")
            .insert(
                {
                    "owner_id": user_id,
                    "name": name,
                    "description": description or None,
                    "color": color,
                    "timezone": timezone,
                    "visibility": "private",
                    "is_default": False,
                    "is_archived": False,
                }
            )
            .execute()
        )

        calendar = extract_single(response)

        if not calendar:
            raise CalendarCreateError(
                "Supabase did not return the created calendar."
            )

        return {
            **calendar,
            "share_permission": "owner",
            "can_create_events": True,
        }

    except CalendarCreateError:
        raise

    except Exception as error:
        raise CalendarCreateError(
            f"Could not create calendar: {error}"
        ) from error


def update_calendar(
    *,
    user_id: str,
    calendar_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        get_calendar_for_user(
            user_id=user_id,
            calendar_id=calendar_id,
        )

        response = (
            get_supabase()
            .table("calendars")
            .update(payload)
            .eq("id", calendar_id)
            .eq("owner_id", user_id)
            .execute()
        )

        calendar = extract_single(response)

        if not calendar:
            raise CalendarUpdateError(
                "Supabase did not return the updated calendar."
            )

        return {
            **calendar,
            "share_permission": "owner",
            "can_create_events": not calendar["is_archived"],
        }

    except (
        CalendarNotFoundError,
        CalendarUpdateError,
    ):
        raise

    except Exception as error:
        raise CalendarUpdateError(
            f"Could not update calendar: {error}"
        ) from error


def delete_calendar(
    *,
    user_id: str,
    calendar_id: str,
) -> None:
    try:
        calendar = get_calendar_for_user(
            user_id=user_id,
            calendar_id=calendar_id,
        )

        if calendar["is_default"]:
            raise CalendarDeleteError(
                "The default calendar cannot be deleted."
            )

        get_supabase().table("calendars").delete().eq(
            "id",
            calendar_id,
        ).eq(
            "owner_id",
            user_id,
        ).execute()

    except (
        CalendarNotFoundError,
        CalendarDeleteError,
    ):
        raise

    except Exception as error:
        raise CalendarDeleteError(
            f"Could not delete calendar: {error}"
        ) from error


def list_calendar_tags(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            get_supabase()
            .table("calendar_tags")
            .select(TAG_COLUMNS)
            .eq("owner_id", user_id)
            .order("name")
            .execute()
        )

        return response_data(response)

    except Exception as error:
        raise CalendarTagError(
            "Could not retrieve calendar tags."
        ) from error


def create_calendar_tag(
    *,
    user_id: str,
    name: str,
    color: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase()
            .table("calendar_tags")
            .insert(
                {
                    "owner_id": user_id,
                    "name": name,
                    "color": color,
                }
            )
            .execute()
        )

        tag = extract_single(response)

        if not tag:
            raise CalendarTagError(
                "Supabase did not return the created tag."
            )

        return tag

    except CalendarTagError:
        raise

    except Exception as error:
        raise CalendarTagError(
            f"Could not create calendar tag: {error}"
        ) from error


def update_calendar_tag(
    *,
    user_id: str,
    tag_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        response = (
            get_supabase()
            .table("calendar_tags")
            .update(payload)
            .eq("id", tag_id)
            .eq("owner_id", user_id)
            .execute()
        )

        tag = extract_single(response)

        if not tag:
            raise CalendarTagNotFoundError(
                "Calendar tag was not found."
            )

        return tag

    except CalendarTagNotFoundError:
        raise

    except Exception as error:
        raise CalendarTagError(
            f"Could not update calendar tag: {error}"
        ) from error


def delete_calendar_tag(
    *,
    user_id: str,
    tag_id: str,
) -> None:
    try:
        response = (
            get_supabase()
            .table("calendar_tags")
            .delete()
            .eq("id", tag_id)
            .eq("owner_id", user_id)
            .execute()
        )

        if not response_data(response):
            raise CalendarTagNotFoundError(
                "Calendar tag was not found."
            )

    except CalendarTagNotFoundError:
        raise

    except Exception as error:
        raise CalendarTagError(
            f"Could not delete calendar tag: {error}"
        ) from error
