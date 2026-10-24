from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import (
    CalendarEventDeleteError,
    CalendarEventNotFoundError,
    CalendarEventUpdateError,
    CalendarNotFoundError,
    CalendarTagError,
    CalendarTagNotFoundError,
)
from apps.calendar.services.calendar_service_modules.access import (
    get_calendar_access,
    get_event_for_user,
    require_editor_can_manage_related_data,
    require_event_deleter,
    require_event_editor,
)
from apps.calendar.services.calendar_service_modules.event_attendee_relations import (
    replace_event_attendees,
)
from apps.calendar.services.calendar_service_modules.event_conference_recurrence import (
    replace_event_conferences,
    replace_event_recurrence,
)
from apps.calendar.services.calendar_service_modules.event_details import (
    get_event_details,
)
from apps.calendar.services.calendar_service_modules.event_payloads import (
    build_event_update_payload,
    validate_beeapp_users_exist,
)
from apps.calendar.services.calendar_service_modules.event_reminders import (
    notify_event_update,
    replace_user_event_reminders,
    safe_calendar_notification,
)
from apps.calendar.services.calendar_service_modules.event_tag_relations import (
    replace_event_tags,
)
from apps.calendar.services.calendar_service_modules.shared import (
    extract_single,
    get_supabase,
    response_data,
    to_string_list,
)


def update_calendar_event(
    *,
    user_id: str,
    event_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        access = require_event_editor(
            user_id=user_id,
            event_id=event_id,
        )
        existing_event = access["event"]

        require_editor_can_manage_related_data(
            access=access,
            payload=payload,
        )

        event_payload = build_event_update_payload(payload=payload)

        if "calendar_id" in event_payload:
            target_calendar_access = get_calendar_access(
                user_id=user_id,
                calendar_id=event_payload["calendar_id"],
            )

            if not target_calendar_access["can_create_events"]:
                raise CalendarNotFoundError(
                    "Target calendar was not found or cannot "
                    "receive events."
                )

            if (
                target_calendar_access["is_editor"]
                and existing_event["is_private"]
            ):
                raise CalendarEventUpdateError(
                    "A shared-calendar editor cannot move a "
                    "private event."
                )

        if access["is_editor"]:
            forbidden_event_fields = {
                "calendar_id",
                "is_private",
            }
            attempted_forbidden_fields = sorted(
                forbidden_event_fields.intersection(event_payload)
            )

            if attempted_forbidden_fields:
                fields_label = ", ".join(
                    attempted_forbidden_fields
                )
                raise CalendarEventUpdateError(
                    "Shared-calendar editors cannot modify "
                    f"{fields_label}."
                )

        if event_payload:
            response = (
                get_supabase()
                .table("calendar_events")
                .update(event_payload)
                .eq("id", event_id)
                .execute()
            )

            if not extract_single(response):
                raise CalendarEventUpdateError(
                    "Supabase did not return the updated event."
                )

        if "tag_ids" in payload:
            replace_event_tags(
                user_id=user_id,
                event_id=event_id,
                tag_ids=payload["tag_ids"],
            )

        if "conferences" in payload:
            replace_event_conferences(
                event_id=event_id,
                conferences=payload["conferences"],
            )

        if "recurrence" in payload:
            replace_event_recurrence(
                event_id=event_id,
                recurrence=payload["recurrence"],
                fallback_timezone=event_payload.get(
                    "timezone",
                    existing_event["timezone"],
                ),
            )

        if "attendee_ids" in payload:
            attendee_ids = to_string_list(payload["attendee_ids"])
            validate_beeapp_users_exist(attendee_ids=attendee_ids)
            replace_event_attendees(
                organizer_id=existing_event["organizer_id"],
                event_id=event_id,
                attendee_ids=attendee_ids,
            )

        if "reminders" in payload:
            current_event = get_event_for_user(
                user_id=user_id,
                event_id=event_id,
            )
            replace_user_event_reminders(
                user_id=user_id,
                event=current_event,
                reminders=payload["reminders"],
            )

        updated_event = get_event_details(
            user_id=user_id,
            event_id=event_id,
        )

        if access["can_manage_attendees"]:
            notify_event_update(
                organizer_id=existing_event["organizer_id"],
                event=updated_event,
            )

        return updated_event

    except (
        CalendarEventNotFoundError,
        CalendarEventUpdateError,
        CalendarNotFoundError,
        CalendarTagNotFoundError,
        CalendarTagError,
    ):
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            f"Could not update event: {error}"
        ) from error


def delete_calendar_event(
    *,
    user_id: str,
    event_id: str,
) -> None:
    try:
        event = require_event_deleter(
            user_id=user_id,
            event_id=event_id,
        )

        attendee_response = (
            get_supabase()
            .table("calendar_event_attendees")
            .select(
                "attendee_user_id,is_organizer,response_status"
            )
            .eq("event_id", event_id)
            .eq("attendee_kind", "beeapp_user")
            .neq("response_status", "removed")
            .execute()
        )
        attendee_ids = [
            attendee["attendee_user_id"]
            for attendee in response_data(attendee_response)
            if attendee.get("attendee_user_id")
            and not attendee.get("is_organizer")
        ]

        get_supabase().table("calendar_events").delete().eq(
            "id",
            event_id,
        ).execute()

        for attendee_id in attendee_ids:
            safe_calendar_notification(
                recipient_id=attendee_id,
                notification_type="event_deleted",
                title="Evento eliminado",
                body=f"El evento “{event['title']}” fue eliminado.",
                metadata={
                    "event_id": event_id,
                    "calendar_id": event["calendar_id"],
                },
            )

    except (
        CalendarEventNotFoundError,
        CalendarEventDeleteError,
    ):
        raise

    except Exception as error:
        raise CalendarEventDeleteError(
            f"Could not delete event: {error}"
        ) from error
