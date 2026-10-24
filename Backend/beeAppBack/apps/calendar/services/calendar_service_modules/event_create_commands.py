from __future__ import annotations

from typing import Any
from uuid import UUID

from apps.calendar.exceptions import (
    CalendarEventCreateError,
    CalendarEventNotFoundError,
    CalendarEventUpdateError,
    CalendarNotFoundError,
    CalendarTagError,
    CalendarTagNotFoundError,
)
from apps.calendar.services.calendar_service_modules.access import (
    get_calendar_access,
    require_event_editor,
)
from apps.calendar.services.calendar_service_modules.event_attendee_relations import (
    add_event_attendees,
)
from apps.calendar.services.calendar_service_modules.event_command_helpers import (
    delete_event_safely,
    validate_duplicate_payload,
)
from apps.calendar.services.calendar_service_modules.event_conference_recurrence import (
    create_event_conferences,
    create_event_recurrence,
)
from apps.calendar.services.calendar_service_modules.event_details import (
    get_event_details,
)
from apps.calendar.services.calendar_service_modules.event_payloads import (
    build_event_payload,
    validate_beeapp_users_exist,
)
from apps.calendar.services.calendar_service_modules.event_reminders import (
    create_user_event_reminders,
    get_default_reminders,
    notify_new_attendees,
)
from apps.calendar.services.calendar_service_modules.event_tag_relations import (
    assign_event_tags,
)
from apps.calendar.services.calendar_service_modules.shared import (
    extract_single,
    get_supabase,
    to_string_list,
)


def create_calendar_event(
    *,
    user_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    created_event_id: str | None = None

    try:
        calendar_id = str(payload["calendar_id"])
        calendar_access = get_calendar_access(
            user_id=user_id,
            calendar_id=calendar_id,
        )

        if not calendar_access["can_create_events"]:
            raise CalendarNotFoundError(
                "Calendar was not found or cannot receive events."
            )

        if calendar_access["calendar"]["is_archived"]:
            raise CalendarEventCreateError(
                "Cannot create events in an archived calendar."
            )

        if (
            calendar_access["is_editor"]
            and payload.get("is_private", False)
        ):
            raise CalendarEventCreateError(
                "Shared-calendar editors cannot create "
                "private events."
            )

        event_payload = build_event_payload(
            user_id=user_id,
            payload=payload,
        )
        response = (
            get_supabase()
            .table("calendar_events")
            .insert(event_payload)
            .execute()
        )
        event = extract_single(response)

        if not event:
            raise CalendarEventCreateError(
                "Supabase did not return the created event."
            )

        created_event_id = event["id"]
        tag_ids = payload.get("tag_ids") or []

        if tag_ids:
            assign_event_tags(
                user_id=user_id,
                event_id=created_event_id,
                tag_ids=tag_ids,
            )

        conferences = payload.get("conferences") or []

        if conferences:
            create_event_conferences(
                event_id=created_event_id,
                conferences=conferences,
            )

        recurrence = payload.get("recurrence")

        if recurrence is not None:
            create_event_recurrence(
                event_id=created_event_id,
                recurrence=recurrence,
                fallback_timezone=event["timezone"],
            )

        attendee_ids = to_string_list(payload.get("attendee_ids"))

        if attendee_ids:
            validate_beeapp_users_exist(attendee_ids=attendee_ids)
            add_event_attendees(
                organizer_id=user_id,
                event_id=created_event_id,
                attendee_ids=attendee_ids,
            )

        reminders = (
            payload["reminders"]
            if "reminders" in payload
            else get_default_reminders(user_id=user_id)
        )

        if reminders and event["notifications_enabled"]:
            create_user_event_reminders(
                user_id=user_id,
                event=event,
                reminders=reminders,
            )

        if attendee_ids:
            notify_new_attendees(
                organizer_id=user_id,
                event=event,
                attendee_ids=attendee_ids,
            )

        return get_event_details(
            user_id=user_id,
            event_id=created_event_id,
        )

    except (
        CalendarNotFoundError,
        CalendarEventCreateError,
        CalendarTagNotFoundError,
        CalendarTagError,
        CalendarEventUpdateError,
    ):
        if created_event_id:
            delete_event_safely(event_id=created_event_id)
        raise

    except Exception as error:
        if created_event_id:
            delete_event_safely(event_id=created_event_id)

        raise CalendarEventCreateError(
            f"Could not create event: {error}"
        ) from error


def duplicate_calendar_event(
    *,
    user_id: str,
    event_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        source_access = require_event_editor(
            user_id=user_id,
            event_id=event_id,
        )
        source_event = source_access["event"]
        target_calendar_id = str(
            payload.get("calendar_id")
            or source_event["calendar_id"]
        )
        target_calendar_access = get_calendar_access(
            user_id=user_id,
            calendar_id=target_calendar_id,
        )

        if not target_calendar_access["can_create_events"]:
            raise CalendarNotFoundError(
                "Target calendar was not found or cannot "
                "receive events."
            )

        if (
            target_calendar_access["is_editor"]
            and source_event["is_private"]
        ):
            raise CalendarEventCreateError(
                "Shared-calendar editors cannot duplicate "
                "private events."
            )

        source_details = get_event_details(
            user_id=user_id,
            event_id=event_id,
        )
        duplicate_payload: dict[str, Any] = {
            "calendar_id": target_calendar_id,
            "title": f"{source_event['title']} (Copia)",
            "description": source_event.get("description"),
            "event_kind": source_event["event_kind"],
            "custom_type_name": source_event.get(
                "custom_type_name"
            ),
            "color": source_event["color"],
            "is_all_day": source_event["is_all_day"],
            "starts_at": source_event.get("starts_at"),
            "ends_at": source_event.get("ends_at"),
            "starts_on": source_event.get("starts_on"),
            "ends_on": source_event.get("ends_on"),
            "timezone": source_event["timezone"],
            "location_name": source_event.get("location_name"),
            "location_address": source_event.get(
                "location_address"
            ),
            "location_maps_url": source_event.get(
                "location_maps_url"
            ),
            "is_private": (
                False
                if target_calendar_access["is_editor"]
                else source_event["is_private"]
            ),
            "notifications_enabled": source_event[
                "notifications_enabled"
            ],
            "tag_ids": [
                UUID(tag["id"])
                for tag in source_details["tags"]
            ],
            "conferences": [
                {
                    "provider": conference["provider"],
                    "label": conference.get("label"),
                    "join_url": conference["join_url"],
                    "is_primary": conference["is_primary"],
                }
                for conference in source_details["conferences"]
            ],
            "attendee_ids": [],
            "reminders": [],
            "recurrence": None,
        }

        for key in (
            "starts_at",
            "ends_at",
            "starts_on",
            "ends_on",
        ):
            if key in payload:
                duplicate_payload[key] = payload[key]

        if payload.get("include_attendees"):
            duplicate_payload["attendee_ids"] = [
                UUID(attendee["attendee_user_id"])
                for attendee in source_details["attendees"]
                if attendee.get("attendee_user_id")
                and not attendee["is_organizer"]
                and attendee["response_status"] != "removed"
            ]

        if payload.get("include_reminders"):
            duplicate_payload["reminders"] = [
                {
                    "channel": reminder["channel"],
                    "offset_minutes": reminder[
                        "offset_minutes"
                    ],
                    "all_day_reminder_time": reminder.get(
                        "all_day_reminder_time"
                    ),
                }
                for reminder in source_details["reminders"]
                if reminder["status"] == "pending"
            ]

        if payload.get("include_recurrence"):
            duplicate_payload["recurrence"] = source_details.get(
                "recurrence"
            )

        validate_duplicate_payload(duplicate_payload)

        return create_calendar_event(
            user_id=user_id,
            payload=duplicate_payload,
        )

    except (
        CalendarEventNotFoundError,
        CalendarEventCreateError,
        CalendarNotFoundError,
    ):
        raise

    except Exception as error:
        raise CalendarEventCreateError(
            f"Could not duplicate event: {error}"
        ) from error
