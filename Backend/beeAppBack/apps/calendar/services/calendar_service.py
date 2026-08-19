from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any
from uuid import UUID

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.calendar.exceptions import (
    CalendarCreateError,
    CalendarDeleteError,
    CalendarError,
    CalendarEventCreateError,
    CalendarEventDeleteError,
    CalendarEventNotFoundError,
    CalendarEventUpdateError,
    CalendarNotFoundError,
    CalendarPreferencesError,
    CalendarTagError,
    CalendarTagNotFoundError,
    CalendarUpdateError,
    CalendarUserSearchError,
)
from apps.notifications.services.notification_service import (
    create_calendar_notification,
)


CALENDAR_COLUMNS = (
    "id,owner_id,name,description,color,visibility,is_default,"
    "is_archived,timezone,created_at,updated_at"
)

TAG_COLUMNS = "id,owner_id,name,color,created_at,updated_at"

PREFERENCE_COLUMNS = (
    "user_id,timezone,week_starts_on,show_weekends,default_view,"
    "default_event_color,default_event_kind,default_reminders,"
    "show_declined_events,notify_invitations,notify_rsvp_updates,"
    "notify_event_changes,notify_reminders,notify_sync_errors,"
    "notify_conflicts,created_at,updated_at"
)

EVENT_COLUMNS = (
    "id,calendar_id,organizer_id,source,status,event_kind,"
    "custom_type_name,title,description,color,is_all_day,"
    "starts_at,ends_at,starts_on,ends_on,timezone,location_name,"
    "location_address,location_maps_url,is_private,"
    "notifications_enabled,metadata,created_at,updated_at"
)

ATTENDEE_COLUMNS = (
    "id,event_id,attendee_kind,attendee_user_id,external_email,"
    "external_display_name,is_organizer,response_status,"
    "responded_at,invitation_sent_at,invitation_read_at,hidden_at,"
    "external_attendee_id,metadata,created_at,updated_at"
)

REMINDER_COLUMNS = (
    "id,event_id,recipient_id,channel,offset_minutes,"
    "all_day_reminder_time,status,scheduled_for,sent_at,"
    "cancelled_at,failure_reason,created_at,updated_at"
)

CONFERENCE_COLUMNS = (
    "id,event_id,provider,label,join_url,external_conference_id,"
    "status,is_primary,metadata,created_at,updated_at"
)

RECURRENCE_COLUMNS = (
    "id,event_id,rrule,frequency,interval_count,week_days,"
    "month_day,nth_weekday,until_at,occurrence_count,timezone,"
    "created_at,updated_at"
)


def _supabase():
    return get_supabase_admin_client()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _iso_datetime(value: datetime | str | None) -> str | None:
    if value is None:
        return None

    if isinstance(value, str):
        return value

    return value.isoformat()


def _iso_date(value: date | str | None) -> str | None:
    if value is None:
        return None

    if isinstance(value, str):
        return value

    return value.isoformat()


def _iso_time(value: time | str | None) -> str | None:
    if value is None:
        return None

    if isinstance(value, str):
        return value

    return value.isoformat()


def _to_string_list(values: list[UUID | str] | None) -> list[str]:
    return [str(value) for value in values or []]


def _extract_single(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _response_data(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def _get_calendar_row(
    *,
    calendar_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("calendars")
            .select(CALENDAR_COLUMNS)
            .eq("id", calendar_id)
            .maybe_single()
            .execute()
        )

        calendar = _extract_single(response)

        if not calendar:
            raise CalendarNotFoundError(
                "Calendar was not found."
            )

        return calendar

    except CalendarNotFoundError:
        raise

    except Exception as error:
        raise CalendarNotFoundError(
            "Could not retrieve calendar."
        ) from error


def _get_calendar_share_permission(
    *,
    calendar_id: str,
    user_id: str,
) -> str | None:
    try:
        response = (
            _supabase()
            .table("calendar_shares")
            .select("permission,accepted_at,revoked_at")
            .eq("calendar_id", calendar_id)
            .eq("shared_with_user_id", user_id)
            .not_.is_("accepted_at", "null")
            .is_("revoked_at", "null")
            .maybe_single()
            .execute()
        )

        share = _extract_single(response)

        if not share:
            return None

        permission = share.get("permission")

        if permission in ("viewer", "editor"):
            return permission

        return None

    except Exception:
        return None


def _get_calendar_access(
    *,
    user_id: str,
    calendar_id: str,
    require_owner: bool = False,
    require_editor: bool = False,
) -> dict[str, Any]:
    calendar = _get_calendar_row(calendar_id=calendar_id)

    if str(calendar["owner_id"]) == str(user_id):
        return {
            "calendar": calendar,
            "permission": "owner",
            "is_owner": True,
            "is_editor": True,
            "can_view": True,
            "can_create_events": True,
        }

    if require_owner:
        raise CalendarNotFoundError(
            "Calendar was not found or is not owned by you."
        )

    if calendar["is_archived"]:
        raise CalendarNotFoundError(
            "Calendar is archived or unavailable."
        )

    share_permission = _get_calendar_share_permission(
        calendar_id=calendar_id,
        user_id=user_id,
    )

    if share_permission is None:
        raise CalendarNotFoundError(
            "Calendar was not found or is not accessible."
        )

    if require_editor and share_permission != "editor":
        raise CalendarNotFoundError(
            "Calendar was not found or cannot be edited."
        )

    return {
        "calendar": calendar,
        "permission": share_permission,
        "is_owner": False,
        "is_editor": share_permission == "editor",
        "can_view": True,
        "can_create_events": share_permission == "editor",
    }


def _get_calendar_for_user(
    *,
    user_id: str,
    calendar_id: str,
) -> dict[str, Any]:
    return _get_calendar_access(
        user_id=user_id,
        calendar_id=calendar_id,
        require_owner=True,
    )["calendar"]


def _get_event_row(
    *,
    event_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("calendar_events")
            .select(EVENT_COLUMNS)
            .eq("id", event_id)
            .maybe_single()
            .execute()
        )

        event = _extract_single(response)

        if not event:
            raise CalendarEventNotFoundError(
                "Event was not found."
            )

        return event

    except CalendarEventNotFoundError:
        raise

    except Exception as error:
        raise CalendarEventNotFoundError(
            "Could not retrieve event."
        ) from error


def _get_user_attendee_row(
    *,
    event_id: str,
    user_id: str,
) -> dict[str, Any] | None:
    try:
        response = (
            _supabase()
            .table("calendar_event_attendees")
            .select(ATTENDEE_COLUMNS)
            .eq("event_id", event_id)
            .eq("attendee_user_id", user_id)
            .eq("attendee_kind", "beeapp_user")
            .neq("response_status", "removed")
            .maybe_single()
            .execute()
        )

        return _extract_single(response)

    except Exception:
        return None


def _get_event_access(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    event = _get_event_row(event_id=event_id)
    calendar = _get_calendar_row(
        calendar_id=event["calendar_id"],
    )

    is_organizer = (
        str(event["organizer_id"]) == str(user_id)
    )
    is_owner = (
        str(calendar["owner_id"]) == str(user_id)
    )

    attendee = None

    if not is_owner and not is_organizer:
        attendee = _get_user_attendee_row(
            event_id=event_id,
            user_id=user_id,
        )

    share_permission = None

    if not is_owner and not is_organizer and not attendee:
        share_permission = _get_calendar_share_permission(
            calendar_id=event["calendar_id"],
            user_id=user_id,
        )

    is_attendee = attendee is not None
    is_editor = (
        share_permission == "editor"
        and not event["is_private"]
    )
    is_viewer = (
        share_permission == "viewer"
        and not event["is_private"]
    )

    can_view = (
        is_owner
        or is_organizer
        or is_attendee
        or is_editor
        or is_viewer
    )

    if not can_view:
        raise CalendarEventNotFoundError(
            "Event was not found or is not accessible."
        )

    can_edit = is_owner or is_organizer or is_editor
    can_delete = is_owner or is_organizer
    can_manage_attendees = is_owner or is_organizer

    return {
        "event": event,
        "calendar": calendar,
        "attendee": attendee,
        "share_permission": (
            "owner"
            if is_owner
            else (
                "organizer"
                if is_organizer
                else share_permission
            )
        ),
        "is_owner": is_owner,
        "is_organizer": is_organizer,
        "is_attendee": is_attendee,
        "is_editor": is_editor,
        "can_view": can_view,
        "can_edit": can_edit,
        "can_delete": can_delete,
        "can_manage_attendees": can_manage_attendees,
    }


def _get_event_for_user(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    return _get_event_access(
        user_id=user_id,
        event_id=event_id,
    )["event"]


def _require_event_editor(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    access = _get_event_access(
        user_id=user_id,
        event_id=event_id,
    )

    if not access["can_edit"]:
        raise CalendarEventNotFoundError(
            "Event was not found or cannot be modified."
        )

    return access


def _require_event_manager(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    access = _get_event_access(
        user_id=user_id,
        event_id=event_id,
    )

    if not access["can_manage_attendees"]:
        raise CalendarEventNotFoundError(
            "Event was not found or cannot be managed."
        )

    return access["event"]


def _require_event_deleter(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    access = _get_event_access(
        user_id=user_id,
        event_id=event_id,
    )

    if not access["can_delete"]:
        raise CalendarEventNotFoundError(
            "Event was not found or cannot be deleted."
        )

    return access["event"]


def _require_editor_can_manage_related_data(
    *,
    access: dict[str, Any],
    payload: dict[str, Any],
) -> None:
    if not access["is_editor"]:
        return

    restricted_fields = {
        "tag_ids",
        "conferences",
        "recurrence",
        "attendee_ids",
    }

    attempted_restricted_fields = sorted(
        restricted_fields.intersection(payload)
    )

    if attempted_restricted_fields:
        fields_label = ", ".join(
            attempted_restricted_fields
        )

        raise CalendarEventUpdateError(
            "Shared-calendar editors cannot modify "
            f"{fields_label}."
        )

    if "reminders" in payload:
        raise CalendarEventUpdateError(
            "Shared-calendar editors cannot modify "
            "another organizer's reminders."
        )


def get_calendar_event_details(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    return _get_event_details(
        user_id=user_id,
        event_id=event_id,
    )


def _get_event_details(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    access = _get_event_access(
        user_id=user_id,
        event_id=event_id,
    )

    event = access["event"]
    supabase = _supabase()

    attendees_response = (
        supabase.table("calendar_event_attendees")
        .select(ATTENDEE_COLUMNS)
        .eq("event_id", event_id)
        .neq("response_status", "removed")
        .order("is_organizer", desc=True)
        .order("created_at")
        .execute()
    )

    conferences_response = (
        supabase.table("calendar_event_conferences")
        .select(CONFERENCE_COLUMNS)
        .eq("event_id", event_id)
        .eq("status", "active")
        .order("is_primary", desc=True)
        .order("created_at")
        .execute()
    )

    reminders_response = (
        supabase.table("calendar_event_reminders")
        .select(REMINDER_COLUMNS)
        .eq("event_id", event_id)
        .eq("recipient_id", user_id)
        .neq("status", "cancelled")
        .order("offset_minutes")
        .execute()
    )

    tags_response = (
        supabase.table("calendar_event_tag_assignments")
        .select(
            "tag_id,calendar_tags("
            "id,owner_id,name,color,created_at,updated_at"
            ")"
        )
        .eq("event_id", event_id)
        .execute()
    )

    recurrence_response = (
        supabase.table("calendar_event_recurrences")
        .select(RECURRENCE_COLUMNS)
        .eq("event_id", event_id)
        .maybe_single()
        .execute()
    )

    tags: list[dict[str, Any]] = []

    for assignment in _response_data(tags_response):
        tag = assignment.get("calendar_tags")

        if tag:
            tags.append(tag)

    current_user_attendee = access["attendee"]

    return {
        **event,
        "attendees": _response_data(attendees_response),
        "conferences": _response_data(conferences_response),
        "reminders": _response_data(reminders_response),
        "tags": tags,
        "recurrence": _extract_single(recurrence_response),
        "viewer_permission": access["share_permission"],
        "can_edit": access["can_edit"],
        "can_delete": access["can_delete"],
        "can_manage_attendees": (
            access["can_manage_attendees"]
        ),
        "current_user_attendee": current_user_attendee,
        "current_user_response": (
            current_user_attendee.get("response_status")
            if current_user_attendee
            else None
        ),
    }


def list_calendars(
    *,
    user_id: str,
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    try:
        supabase = _supabase()

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

        for calendar in _response_data(owned_response):
            calendars_by_id[calendar["id"]] = {
                **calendar,
                "share_permission": "owner",
                "can_create_events": not calendar[
                    "is_archived"
                ],
            }

        for share in _response_data(shared_response):
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
            _supabase()
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

        calendar = _extract_single(response)

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
        _get_calendar_for_user(
            user_id=user_id,
            calendar_id=calendar_id,
        )

        response = (
            _supabase()
            .table("calendars")
            .update(payload)
            .eq("id", calendar_id)
            .eq("owner_id", user_id)
            .execute()
        )

        calendar = _extract_single(response)

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
        calendar = _get_calendar_for_user(
            user_id=user_id,
            calendar_id=calendar_id,
        )

        if calendar["is_default"]:
            raise CalendarDeleteError(
                "The default calendar cannot be deleted."
            )

        _supabase().table("calendars").delete().eq(
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
            _supabase()
            .table("calendar_tags")
            .select(TAG_COLUMNS)
            .eq("owner_id", user_id)
            .order("name")
            .execute()
        )

        return _response_data(response)

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
            _supabase()
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

        tag = _extract_single(response)

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
            _supabase()
            .table("calendar_tags")
            .update(payload)
            .eq("id", tag_id)
            .eq("owner_id", user_id)
            .execute()
        )

        tag = _extract_single(response)

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
            _supabase()
            .table("calendar_tags")
            .delete()
            .eq("id", tag_id)
            .eq("owner_id", user_id)
            .execute()
        )

        if not _response_data(response):
            raise CalendarTagNotFoundError(
                "Calendar tag was not found."
            )

    except CalendarTagNotFoundError:
        raise

    except Exception as error:
        raise CalendarTagError(
            f"Could not delete calendar tag: {error}"
        ) from error


def get_calendar_preferences(
    *,
    user_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("calendar_preferences")
            .select(PREFERENCE_COLUMNS)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        preferences = _extract_single(response)

        if preferences:
            return preferences

        profile_response = (
            _supabase()
            .table("profile")
            .select("timezone")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )

        profile = _extract_single(profile_response)

        timezone = (
            profile.get("timezone")
            if profile
            else "America/Bogota"
        )

        created_response = (
            _supabase()
            .table("calendar_preferences")
            .insert(
                {
                    "user_id": user_id,
                    "timezone": timezone or "America/Bogota",
                }
            )
            .execute()
        )

        preferences = _extract_single(created_response)

        if not preferences:
            raise CalendarPreferencesError(
                "Could not create calendar preferences."
            )

        return preferences

    except CalendarPreferencesError:
        raise

    except Exception as error:
        raise CalendarPreferencesError(
            "Could not retrieve calendar preferences."
        ) from error


def update_calendar_preferences(
    *,
    user_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        get_calendar_preferences(user_id=user_id)

        normalized_payload = dict(payload)

        if "default_reminders" in normalized_payload:
            normalized_payload["default_reminders"] = [
                {
                    "channel": reminder["channel"],
                    "offset_minutes": reminder[
                        "offset_minutes"
                    ],
                    "all_day_reminder_time": _iso_time(
                        reminder.get("all_day_reminder_time")
                    ),
                }
                for reminder in normalized_payload[
                    "default_reminders"
                ]
            ]

        response = (
            _supabase()
            .table("calendar_preferences")
            .update(normalized_payload)
            .eq("user_id", user_id)
            .execute()
        )

        preferences = _extract_single(response)

        if not preferences:
            raise CalendarPreferencesError(
                "Supabase did not return preferences."
            )

        return preferences

    except CalendarPreferencesError:
        raise

    except Exception as error:
        raise CalendarPreferencesError(
            "Could not update calendar preferences."
        ) from error


def search_beeapp_users(
    *,
    user_id: str,
    query: str,
    limit: int,
) -> list[dict[str, Any]]:
    try:
        response = (
            _supabase()
            .rpc(
                "search_beeapp_users_for_backend",
                {
                    "p_requester_id": user_id,
                    "p_query": query,
                    "p_limit": limit,
                },
            )
            .execute()
        )

        return _response_data(response)

    except Exception as error:
        raise CalendarUserSearchError(
            f"Could not search BeeApp users: {error}"
        ) from error


def list_calendar_events(
    *,
    user_id: str,
    range_start: datetime,
    range_end: datetime,
    calendar_ids: list[UUID] | None = None,
    source: str | None = None,
    event_kind: str | None = None,
    tag_ids: list[UUID] | None = None,
    include_cancelled: bool = False,
    include_declined: bool = True,
    search: str | None = None,
    limit: int = 500,
) -> dict[str, Any]:
    try:
        if range_start >= range_end:
            raise CalendarError(
                "range_end must be after range_start."
            )

        supabase = _supabase()
        calendars = list_calendars(
            user_id=user_id,
            include_archived=False,
        )

        calendars_by_id = {
            calendar["id"]: calendar
            for calendar in calendars
        }

        available_calendar_ids = set(calendars_by_id)

        if calendar_ids:
            requested_calendar_ids = set(
                _to_string_list(calendar_ids)
            )
            selected_calendar_ids = list(
                available_calendar_ids.intersection(
                    requested_calendar_ids
                )
            )
        else:
            selected_calendar_ids = list(
                available_calendar_ids
            )

        events_by_id: dict[str, dict[str, Any]] = {}
        attendee_rows_by_event_id: dict[
            str,
            dict[str, Any],
        ] = {}

        if selected_calendar_ids:
            timed_query = (
                supabase.table("calendar_events")
                .select(EVENT_COLUMNS)
                .in_("calendar_id", selected_calendar_ids)
                .eq("is_all_day", False)
                .lt("starts_at", _iso_datetime(range_end))
                .gt("ends_at", _iso_datetime(range_start))
            )

            all_day_query = (
                supabase.table("calendar_events")
                .select(EVENT_COLUMNS)
                .in_("calendar_id", selected_calendar_ids)
                .eq("is_all_day", True)
                .lt("starts_on", range_end.date().isoformat())
                .gt("ends_on", range_start.date().isoformat())
            )

            if not include_cancelled:
                timed_query = timed_query.eq(
                    "status",
                    "confirmed",
                )
                all_day_query = all_day_query.eq(
                    "status",
                    "confirmed",
                )

            if source:
                timed_query = timed_query.eq("source", source)
                all_day_query = all_day_query.eq(
                    "source",
                    source,
                )

            if event_kind:
                timed_query = timed_query.eq(
                    "event_kind",
                    event_kind,
                )
                all_day_query = all_day_query.eq(
                    "event_kind",
                    event_kind,
                )

            timed_response = (
                timed_query.order("starts_at")
                .limit(limit)
                .execute()
            )

            all_day_response = (
                all_day_query.order("starts_on")
                .limit(limit)
                .execute()
            )

            for event in (
                _response_data(timed_response)
                + _response_data(all_day_response)
            ):
                calendar = calendars_by_id.get(
                    event["calendar_id"]
                )

                if not calendar:
                    continue

                permission = calendar["share_permission"]

                if (
                    event["is_private"]
                    and permission != "owner"
                    and str(event["organizer_id"]) != str(user_id)
                ):
                    attendee = _get_user_attendee_row(
                        event_id=event["id"],
                        user_id=user_id,
                    )

                    if not attendee:
                        continue

                    attendee_rows_by_event_id[event["id"]] = (
                        attendee
                    )

                events_by_id[event["id"]] = event

        attendee_rows_response = (
            supabase.table("calendar_event_attendees")
            .select(
                "event_id,response_status,hidden_at,"
                "attendee_kind,attendee_user_id"
            )
            .eq("attendee_user_id", user_id)
            .eq("attendee_kind", "beeapp_user")
            .neq("response_status", "removed")
            .execute()
        )

        for row in _response_data(attendee_rows_response):
            event_id = row.get("event_id")

            if event_id:
                attendee_rows_by_event_id[event_id] = row

        attendee_event_ids = list(attendee_rows_by_event_id)

        if attendee_event_ids:
            attendee_events_response = (
                supabase.table("calendar_events")
                .select(EVENT_COLUMNS)
                .in_("id", attendee_event_ids)
                .execute()
            )

            for event in _response_data(attendee_events_response):
                if not _event_overlaps_range(
                    event=event,
                    range_start=range_start,
                    range_end=range_end,
                ):
                    continue

                if (
                    not include_cancelled
                    and event["status"] != "confirmed"
                ):
                    continue

                if source and event["source"] != source:
                    continue

                if event_kind and event["event_kind"] != event_kind:
                    continue

                events_by_id[event["id"]] = event

        events = list(events_by_id.values())

        visible_events: list[dict[str, Any]] = []

        for event in events:
            attendee = attendee_rows_by_event_id.get(
                event["id"]
            )

            if (
                attendee
                and attendee.get("response_status") == "declined"
            ):
                if attendee.get("hidden_at") is not None:
                    continue

                if not include_declined:
                    continue

            visible_events.append(event)

        events = visible_events

        if tag_ids and events:
            requested_tag_ids = set(_to_string_list(tag_ids))

            assignments_response = (
                supabase.table("calendar_event_tag_assignments")
                .select("event_id,tag_id")
                .in_(
                    "event_id",
                    [event["id"] for event in events],
                )
                .in_("tag_id", list(requested_tag_ids))
                .execute()
            )

            matching_event_ids = {
                assignment["event_id"]
                for assignment in _response_data(
                    assignments_response
                )
            }

            events = [
                event
                for event in events
                if event["id"] in matching_event_ids
            ]

        if search:
            normalized_search = search.lower().strip()

            events = [
                event
                for event in events
                if _event_matches_search(
                    event=event,
                    search=normalized_search,
                )
            ]

        events.sort(
            key=lambda event: (
                event["starts_at"] or event["starts_on"],
                event["created_at"],
            )
        )

        return {
            "events": events[:limit],
            "count": min(len(events), limit),
            "range_start": _iso_datetime(range_start),
            "range_end": _iso_datetime(range_end),
        }

    except CalendarError:
        raise

    except Exception as error:
        raise CalendarError(
            f"Could not retrieve calendar events: {error}"
        ) from error


def create_calendar_event(
    *,
    user_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    created_event_id: str | None = None

    try:
        calendar_id = str(payload["calendar_id"])

        calendar_access = _get_calendar_access(
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

        event_payload = _build_event_payload(
            user_id=user_id,
            payload=payload,
        )

        response = (
            _supabase()
            .table("calendar_events")
            .insert(event_payload)
            .execute()
        )

        event = _extract_single(response)

        if not event:
            raise CalendarEventCreateError(
                "Supabase did not return the created event."
            )

        created_event_id = event["id"]

        tag_ids = payload.get("tag_ids") or []

        if tag_ids:
            _assign_event_tags(
                user_id=user_id,
                event_id=created_event_id,
                tag_ids=tag_ids,
            )

        conferences = payload.get("conferences") or []

        if conferences:
            _create_event_conferences(
                event_id=created_event_id,
                conferences=conferences,
            )

        recurrence = payload.get("recurrence")

        if recurrence is not None:
            _create_event_recurrence(
                event_id=created_event_id,
                recurrence=recurrence,
                fallback_timezone=event["timezone"],
            )

        attendee_ids = _to_string_list(
            payload.get("attendee_ids")
        )

        if attendee_ids:
            _validate_beeapp_users_exist(
                attendee_ids=attendee_ids,
            )

            _add_event_attendees(
                organizer_id=user_id,
                event_id=created_event_id,
                attendee_ids=attendee_ids,
            )

        reminders = (
            payload["reminders"]
            if "reminders" in payload
            else _get_default_reminders(user_id=user_id)
        )

        if reminders and event["notifications_enabled"]:
            _create_user_event_reminders(
                user_id=user_id,
                event=event,
                reminders=reminders,
            )

        if attendee_ids:
            _notify_new_attendees(
                organizer_id=user_id,
                event=event,
                attendee_ids=attendee_ids,
            )

        return _get_event_details(
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
            _delete_event_safely(event_id=created_event_id)
        raise

    except Exception as error:
        if created_event_id:
            _delete_event_safely(event_id=created_event_id)

        raise CalendarEventCreateError(
            f"Could not create event: {error}"
        ) from error


def update_calendar_event(
    *,
    user_id: str,
    event_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        access = _require_event_editor(
            user_id=user_id,
            event_id=event_id,
        )

        existing_event = access["event"]

        _require_editor_can_manage_related_data(
            access=access,
            payload=payload,
        )

        event_payload = _build_event_update_payload(
            payload=payload,
        )

        if "calendar_id" in event_payload:
            target_calendar_access = _get_calendar_access(
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
                forbidden_event_fields.intersection(
                    event_payload
                )
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
                _supabase()
                .table("calendar_events")
                .update(event_payload)
                .eq("id", event_id)
                .execute()
            )

            if not _extract_single(response):
                raise CalendarEventUpdateError(
                    "Supabase did not return the updated event."
                )

        if "tag_ids" in payload:
            _replace_event_tags(
                user_id=user_id,
                event_id=event_id,
                tag_ids=payload["tag_ids"],
            )

        if "conferences" in payload:
            _replace_event_conferences(
                event_id=event_id,
                conferences=payload["conferences"],
            )

        if "recurrence" in payload:
            _replace_event_recurrence(
                event_id=event_id,
                recurrence=payload["recurrence"],
                fallback_timezone=event_payload.get(
                    "timezone",
                    existing_event["timezone"],
                ),
            )

        if "attendee_ids" in payload:
            attendee_ids = _to_string_list(
                payload["attendee_ids"]
            )

            _validate_beeapp_users_exist(
                attendee_ids=attendee_ids,
            )

            _replace_event_attendees(
                organizer_id=existing_event["organizer_id"],
                event_id=event_id,
                attendee_ids=attendee_ids,
            )

        if "reminders" in payload:
            current_event = _get_event_for_user(
                user_id=user_id,
                event_id=event_id,
            )

            _replace_user_event_reminders(
                user_id=user_id,
                event=current_event,
                reminders=payload["reminders"],
            )

        updated_event = _get_event_details(
            user_id=user_id,
            event_id=event_id,
        )

        if access["can_manage_attendees"]:
            _notify_event_update(
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
        event = _require_event_deleter(
            user_id=user_id,
            event_id=event_id,
        )

        attendee_response = (
            _supabase()
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
            for attendee in _response_data(attendee_response)
            if attendee.get("attendee_user_id")
            and not attendee.get("is_organizer")
        ]

        _supabase().table("calendar_events").delete().eq(
            "id",
            event_id,
        ).execute()

        for attendee_id in attendee_ids:
            _safe_calendar_notification(
                recipient_id=attendee_id,
                notification_type="event_deleted",
                title="Evento eliminado",
                body=(
                    f"El evento “{event['title']}” fue eliminado."
                ),
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


def duplicate_calendar_event(
    *,
    user_id: str,
    event_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        source_access = _require_event_editor(
            user_id=user_id,
            event_id=event_id,
        )

        source_event = source_access["event"]

        target_calendar_id = str(
            payload.get("calendar_id")
            or source_event["calendar_id"]
        )

        target_calendar_access = _get_calendar_access(
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

        source_details = _get_event_details(
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

        _validate_duplicate_payload(duplicate_payload)

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


def get_calendar_bootstrap(
    *,
    user_id: str,
    range_start: datetime,
    range_end: datetime,
) -> dict[str, Any]:
    preferences = get_calendar_preferences(user_id=user_id)
    calendars = list_calendars(user_id=user_id)
    tags = list_calendar_tags(user_id=user_id)

    events = list_calendar_events(
        user_id=user_id,
        range_start=range_start,
        range_end=range_end,
        include_declined=preferences[
            "show_declined_events"
        ],
    )

    return {
        "preferences": preferences,
        "calendars": calendars,
        "tags": tags,
        **events,
    }


def _build_event_payload(
    *,
    user_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    return {
        "calendar_id": str(payload["calendar_id"]),
        "organizer_id": user_id,
        "source": "beeapp",
        "status": "confirmed",
        "event_kind": payload["event_kind"],
        "custom_type_name": payload.get("custom_type_name"),
        "title": payload["title"],
        "description": payload.get("description") or None,
        "color": payload["color"],
        "is_all_day": payload["is_all_day"],
        "starts_at": _iso_datetime(payload.get("starts_at")),
        "ends_at": _iso_datetime(payload.get("ends_at")),
        "starts_on": _iso_date(payload.get("starts_on")),
        "ends_on": _iso_date(payload.get("ends_on")),
        "timezone": payload["timezone"],
        "location_name": payload.get("location_name") or None,
        "location_address": (
            payload.get("location_address") or None
        ),
        "location_maps_url": (
            payload.get("location_maps_url") or None
        ),
        "is_private": payload["is_private"],
        "notifications_enabled": payload[
            "notifications_enabled"
        ],
    }


def _build_event_update_payload(
    *,
    payload: dict[str, Any],
) -> dict[str, Any]:
    field_names = (
        "calendar_id",
        "title",
        "description",
        "event_kind",
        "custom_type_name",
        "color",
        "is_all_day",
        "timezone",
        "location_name",
        "location_address",
        "location_maps_url",
        "is_private",
        "notifications_enabled",
    )

    event_payload = {
        field_name: (
            str(payload[field_name])
            if field_name == "calendar_id"
            else payload[field_name]
        )
        for field_name in field_names
        if field_name in payload
    }

    if "starts_at" in payload:
        event_payload["starts_at"] = _iso_datetime(
            payload["starts_at"]
        )

    if "ends_at" in payload:
        event_payload["ends_at"] = _iso_datetime(
            payload["ends_at"]
        )

    if "starts_on" in payload:
        event_payload["starts_on"] = _iso_date(
            payload["starts_on"]
        )

    if "ends_on" in payload:
        event_payload["ends_on"] = _iso_date(
            payload["ends_on"]
        )

    for field_name in (
        "description",
        "custom_type_name",
        "location_name",
        "location_address",
        "location_maps_url",
    ):
        if field_name in event_payload:
            event_payload[field_name] = (
                event_payload[field_name] or None
            )

    return event_payload


def _validate_beeapp_users_exist(
    *,
    attendee_ids: list[str],
) -> None:
    normalized_ids = list(dict.fromkeys(attendee_ids))

    if not normalized_ids:
        return

    try:
        response = (
            _supabase()
            .table("profile")
            .select("id")
            .in_("id", normalized_ids)
            .execute()
        )

        found_ids = {
            str(profile["id"])
            for profile in _response_data(response)
        }

        missing_ids = set(normalized_ids).difference(
            found_ids
        )

        if missing_ids:
            raise CalendarEventCreateError(
                "One or more attendees were not found."
            )

    except CalendarEventCreateError:
        raise

    except Exception as error:
        raise CalendarEventCreateError(
            "Could not validate event attendees."
        ) from error


def _assign_event_tags(
    *,
    user_id: str,
    event_id: str,
    tag_ids: list[UUID | str],
) -> None:
    normalized_tag_ids = list(
        dict.fromkeys(_to_string_list(tag_ids))
    )

    if not normalized_tag_ids:
        return

    try:
        supabase = _supabase()

        tags_response = (
            supabase.table("calendar_tags")
            .select("id")
            .eq("owner_id", user_id)
            .in_("id", normalized_tag_ids)
            .execute()
        )

        found_tag_ids = {
            tag["id"]
            for tag in _response_data(tags_response)
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

        if len(_response_data(response)) != len(
            normalized_tag_ids
        ):
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


def _replace_event_tags(
    *,
    user_id: str,
    event_id: str,
    tag_ids: list[UUID | str],
) -> None:
    try:
        _supabase().table(
            "calendar_event_tag_assignments"
        ).delete().eq(
            "event_id",
            event_id,
        ).execute()

        _assign_event_tags(
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


def _create_event_conferences(
    *,
    event_id: str,
    conferences: list[dict[str, Any]],
) -> None:
    if not conferences:
        return

    primary_exists = any(
        conference.get("is_primary")
        for conference in conferences
    )

    rows = []

    for index, conference in enumerate(conferences):
        rows.append(
            {
                "event_id": event_id,
                "provider": conference.get(
                    "provider",
                    "external",
                ),
                "label": conference.get("label") or None,
                "join_url": conference["join_url"],
                "is_primary": (
                    conference.get("is_primary", False)
                    or (index == 0 and not primary_exists)
                ),
                "status": "active",
            }
        )

    try:
        response = (
            _supabase()
            .table("calendar_event_conferences")
            .insert(rows)
            .execute()
        )

        if len(_response_data(response)) != len(rows):
            raise CalendarEventUpdateError(
                "Could not save all conference links."
            )

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not save conference links."
        ) from error


def _replace_event_conferences(
    *,
    event_id: str,
    conferences: list[dict[str, Any]],
) -> None:
    try:
        _supabase().table(
            "calendar_event_conferences"
        ).update(
            {
                "status": "revoked",
                "is_primary": False,
            }
        ).eq(
            "event_id",
            event_id,
        ).eq(
            "status",
            "active",
        ).execute()

        _create_event_conferences(
            event_id=event_id,
            conferences=conferences,
        )

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not replace conference links."
        ) from error


def _create_event_recurrence(
    *,
    event_id: str,
    recurrence: dict[str, Any],
    fallback_timezone: str,
) -> None:
    payload = {
        "event_id": event_id,
        "rrule": recurrence["rrule"],
        "frequency": recurrence["frequency"],
        "interval_count": recurrence["interval_count"],
        "week_days": recurrence.get("week_days"),
        "month_day": recurrence.get("month_day"),
        "nth_weekday": recurrence.get("nth_weekday"),
        "until_at": _iso_datetime(
            recurrence.get("until_at")
        ),
        "occurrence_count": recurrence.get(
            "occurrence_count"
        ),
        "timezone": recurrence.get("timezone")
        or fallback_timezone,
    }

    try:
        response = (
            _supabase()
            .table("calendar_event_recurrences")
            .insert(payload)
            .execute()
        )

        if not _extract_single(response):
            raise CalendarEventUpdateError(
                "Could not save recurrence."
            )

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not save recurrence."
        ) from error


def _replace_event_recurrence(
    *,
    event_id: str,
    recurrence: dict[str, Any] | None,
    fallback_timezone: str,
) -> None:
    try:
        _supabase().table(
            "calendar_event_recurrences"
        ).delete().eq(
            "event_id",
            event_id,
        ).execute()

        if recurrence is None:
            return

        _create_event_recurrence(
            event_id=event_id,
            recurrence=recurrence,
            fallback_timezone=fallback_timezone,
        )

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not replace recurrence."
        ) from error


def _add_event_attendees(
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
        supabase = _supabase()

        existing_response = (
            supabase.table("calendar_event_attendees")
            .select(
                "id,attendee_user_id,response_status,"
                "is_organizer"
            )
            .eq("event_id", event_id)
            .eq("attendee_kind", "beeapp_user")
            .in_("attendee_user_id", normalized_attendee_ids)
            .execute()
        )

        existing_by_user_id = {
            str(row["attendee_user_id"]): row
            for row in _response_data(existing_response)
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
            supabase.table(
                "calendar_event_attendees"
            ).update(
                {
                    "response_status": "pending",
                    "responded_at": None,
                    "hidden_at": None,
                    "invitation_sent_at": _utc_now_iso(),
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
                            "invitation_sent_at": _utc_now_iso(),
                        }
                        for attendee_id in new_user_ids
                    ]
                )
                .execute()
            )

            if len(_response_data(response)) != len(
                new_user_ids
            ):
                raise CalendarEventCreateError(
                    "Could not add all event attendees."
                )

    except CalendarEventCreateError:
        raise

    except Exception as error:
        raise CalendarEventCreateError(
            "Could not add event attendees."
        ) from error


def _replace_event_attendees(
    *,
    organizer_id: str,
    event_id: str,
    attendee_ids: list[str],
) -> None:
    try:
        supabase = _supabase()

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
            for row in _response_data(existing_response)
            if row.get("attendee_user_id")
            and not row.get("is_organizer")
        }

        desired_ids = set(normalized_attendee_ids)

        active_existing_ids = {
            attendee_id
            for attendee_id, attendee in existing_attendees.items()
            if attendee.get("response_status") != "removed"
        }

        removed_ids = active_existing_ids.difference(
            desired_ids
        )

        if removed_ids:
            supabase.table(
                "calendar_event_attendees"
            ).update(
                {
                    "response_status": "removed",
                    "hidden_at": _utc_now_iso(),
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

        _add_event_attendees(
            organizer_id=organizer_id,
            event_id=event_id,
            attendee_ids=normalized_attendee_ids,
        )

    except CalendarEventCreateError as error:
        raise CalendarEventUpdateError(
            str(error)
        ) from error

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not update event attendees."
        ) from error


def _get_default_reminders(
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


def _create_user_event_reminders(
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
            "all_day_reminder_time": _iso_time(
                reminder.get("all_day_reminder_time")
            ),
            "status": "pending",
        }
        for reminder in reminders
    ]

    try:
        response = (
            _supabase()
            .table("calendar_event_reminders")
            .insert(rows)
            .execute()
        )

        if len(_response_data(response)) != len(rows):
            raise CalendarEventUpdateError(
                "Could not save event reminders."
            )

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not save event reminders."
        ) from error


def _replace_user_event_reminders(
    *,
    user_id: str,
    event: dict[str, Any],
    reminders: list[dict[str, Any]],
) -> None:
    try:
        _supabase().table(
            "calendar_event_reminders"
        ).update(
            {
                "status": "cancelled",
                "cancelled_at": _utc_now_iso(),
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

        _create_user_event_reminders(
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


def _notify_new_attendees(
    *,
    organizer_id: str,
    event: dict[str, Any],
    attendee_ids: list[str],
) -> None:
    for attendee_id in attendee_ids:
        if str(attendee_id) == str(organizer_id):
            continue

        _safe_calendar_notification(
            recipient_id=attendee_id,
            notification_type="event_invitation",
            title="Nueva invitación",
            body=(
                f"Te invitaron al evento “{event['title']}”."
            ),
            metadata={
                "event_id": event["id"],
                "calendar_id": event["calendar_id"],
                "action": "rsvp",
            },
        )


def _notify_event_update(
    *,
    organizer_id: str,
    event: dict[str, Any],
) -> None:
    attendees_response = (
        _supabase()
        .table("calendar_event_attendees")
        .select(
            "attendee_user_id,is_organizer,response_status"
        )
        .eq("event_id", event["id"])
        .eq("attendee_kind", "beeapp_user")
        .neq("response_status", "removed")
        .execute()
    )

    for attendee in _response_data(attendees_response):
        attendee_id = attendee.get("attendee_user_id")

        if (
            not attendee_id
            or str(attendee_id) == str(organizer_id)
            or attendee.get("is_organizer")
        ):
            continue

        _safe_calendar_notification(
            recipient_id=attendee_id,
            notification_type="event_updated",
            title="Evento actualizado",
            body=(
                f"El evento “{event['title']}” fue actualizado."
            ),
            metadata={
                "event_id": event["id"],
                "calendar_id": event["calendar_id"],
            },
        )


def _safe_calendar_notification(
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


def _delete_event_safely(
    *,
    event_id: str,
) -> None:
    try:
        _supabase().table("calendar_events").delete().eq(
            "id",
            event_id,
        ).execute()
    except Exception:
        return


def _validate_duplicate_payload(
    payload: dict[str, Any],
) -> None:
    is_all_day = payload["is_all_day"]

    if is_all_day:
        starts_on = _iso_date(payload.get("starts_on"))
        ends_on = _iso_date(payload.get("ends_on"))

        if (
            starts_on is None
            or ends_on is None
            or payload.get("starts_at") is not None
            or payload.get("ends_at") is not None
        ):
            raise CalendarEventCreateError(
                "All-day duplicate requires starts_on and ends_on."
            )

        if starts_on >= ends_on:
            raise CalendarEventCreateError(
                "Duplicate ends_on must be after starts_on."
            )

        return

    starts_at = _as_datetime(payload.get("starts_at"))
    ends_at = _as_datetime(payload.get("ends_at"))

    if (
        starts_at is None
        or ends_at is None
        or payload.get("starts_on") is not None
        or payload.get("ends_on") is not None
    ):
        raise CalendarEventCreateError(
            "Timed duplicate requires starts_at and ends_at."
        )

    if starts_at >= ends_at:
        raise CalendarEventCreateError(
            "Duplicate ends_at must be after starts_at."
        )


def _event_overlaps_range(
    *,
    event: dict[str, Any],
    range_start: datetime,
    range_end: datetime,
) -> bool:
    if event["is_all_day"]:
        starts_on = _as_date(event.get("starts_on"))
        ends_on = _as_date(event.get("ends_on"))

        if starts_on is None or ends_on is None:
            return False

        return (
            starts_on < range_end.date()
            and ends_on > range_start.date()
        )

    starts_at = _as_datetime(event.get("starts_at"))
    ends_at = _as_datetime(event.get("ends_at"))

    if starts_at is None or ends_at is None:
        return False

    return starts_at < range_end and ends_at > range_start


def _event_matches_search(
    *,
    event: dict[str, Any],
    search: str,
) -> bool:
    values = (
        event.get("title"),
        event.get("description"),
        event.get("custom_type_name"),
        event.get("location_name"),
        event.get("location_address"),
    )

    return any(
        search in str(value).lower()
        for value in values
        if value
    )


def _as_datetime(
    value: datetime | str | None,
) -> datetime | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value

    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )


def _as_date(
    value: date | datetime | str | None,
) -> date | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    return date.fromisoformat(value)