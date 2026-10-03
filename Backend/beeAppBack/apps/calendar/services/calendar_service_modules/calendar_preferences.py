from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import (
    CalendarPreferencesError,
    CalendarUserSearchError,
)
from apps.calendar.services.calendar_service_modules.shared import (
    PREFERENCE_COLUMNS,
    extract_single,
    get_supabase,
    iso_time,
    response_data,
)

def get_calendar_preferences(
    *,
    user_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase()
            .table("calendar_preferences")
            .select(PREFERENCE_COLUMNS)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        preferences = extract_single(response)

        if preferences:
            return preferences

        profile_response = (
            get_supabase()
            .table("profile")
            .select("timezone")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )

        profile = extract_single(profile_response)

        timezone = (
            profile.get("timezone")
            if profile
            else "America/Bogota"
        )

        created_response = (
            get_supabase()
            .table("calendar_preferences")
            .insert(
                {
                    "user_id": user_id,
                    "timezone": timezone or "America/Bogota",
                }
            )
            .execute()
        )

        preferences = extract_single(created_response)

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
                    "all_day_reminder_time": iso_time(
                        reminder.get("all_day_reminder_time")
                    ),
                }
                for reminder in normalized_payload[
                    "default_reminders"
                ]
            ]

        response = (
            get_supabase()
            .table("calendar_preferences")
            .update(normalized_payload)
            .eq("user_id", user_id)
            .execute()
        )

        preferences = extract_single(response)

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
            get_supabase()
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

        return response_data(response)

    except Exception as error:
        raise CalendarUserSearchError(
            f"Could not search BeeApp users: {error}"
        ) from error
