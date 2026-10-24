from __future__ import annotations

from datetime import timedelta

from apps.calendar.exceptions import CalendarError

from .constants import SYNC_INTERVAL_MINUTES, utc_now
from .repository import supabase


def mark_external_calendar_sync_success(
    *,
    external_calendar_id: str,
    synced_at: str,
) -> None:
    try:
        (
            supabase()
            .table("calendar_external_calendars")
            .update(
                {
                    "last_attempted_sync_at": synced_at,
                    "last_successful_sync_at": synced_at,
                }
            )
            .eq("id", external_calendar_id)
            .execute()
        )
    except Exception as error:
        raise CalendarError(
            "Could not update external calendar sync status."
        ) from error


def mark_external_calendar_sync_failure(
    *,
    external_calendar_id: str,
    attempted_at: str,
) -> None:
    try:
        (
            supabase()
            .table("calendar_external_calendars")
            .update(
                {
                    "last_attempted_sync_at": attempted_at,
                }
            )
            .eq("id", external_calendar_id)
            .execute()
        )
    except Exception:
        return


def mark_integration_sync_success(
    *,
    integration_id: str,
    synced_at: str,
) -> None:
    try:
        (
            supabase()
            .table("calendar_integrations")
            .update(
                {
                    "status": "active",
                    "last_attempted_sync_at": synced_at,
                    "last_successful_sync_at": synced_at,
                    "next_sync_at": (
                        utc_now()
                        + timedelta(
                            minutes=SYNC_INTERVAL_MINUTES
                        )
                    ).isoformat(),
                    "last_error_code": None,
                    "last_error_message": None,
                }
            )
            .eq("id", integration_id)
            .execute()
        )
    except Exception as error:
        raise CalendarError(
            "Could not update calendar integration sync status."
        ) from error


def mark_integration_sync_failure(
    *,
    integration_id: str,
    attempted_at: str,
    error: str,
) -> None:
    try:
        (
            supabase()
            .table("calendar_integrations")
            .update(
                {
                    "last_attempted_sync_at": attempted_at,
                    "next_sync_at": (
                        utc_now()
                        + timedelta(
                            minutes=SYNC_INTERVAL_MINUTES
                        )
                    ).isoformat(),
                    "last_error_code": "calendar_sync_failed",
                    "last_error_message": error[:500],
                }
            )
            .eq("id", integration_id)
            .execute()
        )
    except Exception:
        return
