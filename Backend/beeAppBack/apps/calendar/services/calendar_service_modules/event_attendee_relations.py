from __future__ import annotations

from apps.calendar.exceptions import (
    CalendarEventCreateError,
    CalendarEventUpdateError,
)
from apps.calendar.services.calendar_service_modules.shared import (
    get_supabase,
    response_data,
    utc_now_iso,
)
def add_event_attendees(
    *,
    organizer_id: str,
    event_id: str,
    attendee_ids: list[str],
) -> None:
    normalized_attendee_ids = list(
        dict.fromkeys(
            attendee_id
            for attendee_id in attendee_ids
            if str(attendee_id) != str(organizer_id)
        )
    )

    if not normalized_attendee_ids:
        return

    try:
        supabase = get_supabase()
        existing_response = (
            supabase.table("calendar_event_attendees")
            .select(
                "id,attendee_user_id,response_status,is_organizer"
            )
            .eq("event_id", event_id)
            .eq("attendee_kind", "beeapp_user")
            .in_("attendee_user_id", normalized_attendee_ids)
            .execute()
        )
        existing_by_user_id = {
            str(row["attendee_user_id"]): row
            for row in response_data(existing_response)
            if row.get("attendee_user_id")
        }
        removed_user_ids = [
            attendee_id
            for attendee_id in normalized_attendee_ids
            if (
                existing_by_user_id.get(attendee_id)
                and existing_by_user_id[attendee_id].get(
                    "response_status"
                )
                == "removed"
            )
        ]
        new_user_ids = [
            attendee_id
            for attendee_id in normalized_attendee_ids
            if attendee_id not in existing_by_user_id
        ]

        if removed_user_ids:
            supabase.table("calendar_event_attendees").update(
                {
                    "response_status": "pending",
                    "responded_at": None,
                    "hidden_at": None,
                    "invitation_sent_at": utc_now_iso(),
                    "invitation_read_at": None,
                }
            ).eq(
                "event_id",
                event_id,
            ).eq(
                "attendee_kind",
                "beeapp_user",
            ).in_(
                "attendee_user_id",
                removed_user_ids,
            ).execute()

        if new_user_ids:
            response = (
                supabase.table("calendar_event_attendees")
                .insert(
                    [
                        {
                            "event_id": event_id,
                            "attendee_kind": "beeapp_user",
                            "attendee_user_id": attendee_id,
                            "is_organizer": False,
                            "response_status": "pending",
                            "invitation_sent_at": utc_now_iso(),
                        }
                        for attendee_id in new_user_ids
                    ]
                )
                .execute()
            )

            if len(response_data(response)) != len(new_user_ids):
                raise CalendarEventCreateError(
                    "Could not add all event attendees."
                )

    except CalendarEventCreateError:
        raise

    except Exception as error:
        raise CalendarEventCreateError(
            "Could not add event attendees."
        ) from error


def replace_event_attendees(
    *,
    organizer_id: str,
    event_id: str,
    attendee_ids: list[str],
) -> None:
    try:
        supabase = get_supabase()
        normalized_attendee_ids = list(
            dict.fromkeys(
                attendee_id
                for attendee_id in attendee_ids
                if str(attendee_id) != str(organizer_id)
            )
        )
        existing_response = (
            supabase.table("calendar_event_attendees")
            .select(
                "id,attendee_user_id,is_organizer,response_status"
            )
            .eq("event_id", event_id)
            .eq("attendee_kind", "beeapp_user")
            .execute()
        )
        existing_attendees = {
            str(row["attendee_user_id"]): row
            for row in response_data(existing_response)
            if row.get("attendee_user_id")
            and not row.get("is_organizer")
        }
        desired_ids = set(normalized_attendee_ids)
        active_existing_ids = {
            attendee_id
            for attendee_id, attendee in existing_attendees.items()
            if attendee.get("response_status") != "removed"
        }
        removed_ids = active_existing_ids.difference(desired_ids)

        if removed_ids:
            supabase.table("calendar_event_attendees").update(
                {
                    "response_status": "removed",
                    "hidden_at": utc_now_iso(),
                }
            ).eq(
                "event_id",
                event_id,
            ).eq(
                "attendee_kind",
                "beeapp_user",
            ).in_(
                "attendee_user_id",
                list(removed_ids),
            ).execute()

        add_event_attendees(
            organizer_id=organizer_id,
            event_id=event_id,
            attendee_ids=normalized_attendee_ids,
        )

    except CalendarEventCreateError as error:
        raise CalendarEventUpdateError(str(error)) from error

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not update event attendees."
        ) from error
