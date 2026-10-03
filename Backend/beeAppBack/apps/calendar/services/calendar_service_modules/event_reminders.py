from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import CalendarEventUpdateError
from apps.calendar.services.calendar_service_modules.calendar_preferences import (
    get_calendar_preferences,
)
from apps.calendar.services.calendar_service_modules.shared import (
    get_supabase,
    iso_time,
    response_data,
    utc_now_iso,
)
from apps.notifications.services.notification_service import (
    create_calendar_notification,
)


def get_default_reminders(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    preferences = get_calendar_preferences(user_id=user_id)
    reminders = preferences.get("default_reminders") or []
    normalized_reminders = []

    for reminder in reminders:
        channel = reminder.get("channel")
        offset_minutes = reminder.get("offset_minutes")

        if channel not in ("push", "in_app"):
            continue

        if not isinstance(offset_minutes, int):
            continue

        if offset_minutes < 0 or offset_minutes > 525600:
            continue

        normalized_reminders.append(
            {
                "channel": channel,
                "offset_minutes": offset_minutes,
                "all_day_reminder_time": reminder.get(
                    "all_day_reminder_time"
                ),
            }
        )

    return normalized_reminders


def create_user_event_reminders(
    *,
    user_id: str,
    event: dict[str, Any],
    reminders: list[dict[str, Any]],
) -> None:
    if not event["notifications_enabled"] or not reminders:
        return

    rows = [
        {
            "event_id": event["id"],
            "recipient_id": user_id,
            "channel": reminder["channel"],
            "offset_minutes": reminder["offset_minutes"],
            "all_day_reminder_time": iso_time(
                reminder.get("all_day_reminder_time")
            ),
            "status": "pending",
        }
        for reminder in reminders
    ]

    try:
        response = (
            get_supabase()
            .table("calendar_event_reminders")
            .insert(rows)
            .execute()
        )

        if len(response_data(response)) != len(rows):
            raise CalendarEventUpdateError(
                "Could not save event reminders."
            )

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not save event reminders."
        ) from error


def replace_user_event_reminders(
    *,
    user_id: str,
    event: dict[str, Any],
    reminders: list[dict[str, Any]],
) -> None:
    try:
        get_supabase().table("calendar_event_reminders").update(
            {
                "status": "cancelled",
                "cancelled_at": utc_now_iso(),
            }
        ).eq(
            "event_id",
            event["id"],
        ).eq(
            "recipient_id",
            user_id,
        ).eq(
            "status",
            "pending",
        ).execute()

        create_user_event_reminders(
            user_id=user_id,
            event=event,
            reminders=reminders,
        )

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not replace event reminders."
        ) from error


def notify_new_attendees(
    *,
    organizer_id: str,
    event: dict[str, Any],
    attendee_ids: list[str],
) -> None:
    for attendee_id in attendee_ids:
        if str(attendee_id) == str(organizer_id):
            continue

        safe_calendar_notification(
            recipient_id=attendee_id,
            notification_type="event_invitation",
            title="Nueva invitación",
            body=f"Te invitaron al evento “{event['title']}”.",
            metadata={
                "event_id": event["id"],
                "calendar_id": event["calendar_id"],
                "action": "rsvp",
            },
        )


def notify_event_update(
    *,
    organizer_id: str,
    event: dict[str, Any],
) -> None:
    attendees_response = (
        get_supabase()
        .table("calendar_event_attendees")
        .select(
            "attendee_user_id,is_organizer,response_status"
        )
        .eq("event_id", event["id"])
        .eq("attendee_kind", "beeapp_user")
        .neq("response_status", "removed")
        .execute()
    )

    for attendee in response_data(attendees_response):
        attendee_id = attendee.get("attendee_user_id")

        if (
            not attendee_id
            or str(attendee_id) == str(organizer_id)
            or attendee.get("is_organizer")
        ):
            continue

        safe_calendar_notification(
            recipient_id=attendee_id,
            notification_type="event_updated",
            title="Evento actualizado",
            body=f"El evento “{event['title']}” fue actualizado.",
            metadata={
                "event_id": event["id"],
                "calendar_id": event["calendar_id"],
            },
        )


def safe_calendar_notification(
    *,
    recipient_id: str,
    notification_type: str,
    title: str,
    body: str,
    metadata: dict[str, Any],
) -> None:
    try:
        create_calendar_notification(
            recipient_id=recipient_id,
            notification_type=notification_type,
            title=title,
            body=body,
            metadata=metadata,
        )
    except Exception:
        return
