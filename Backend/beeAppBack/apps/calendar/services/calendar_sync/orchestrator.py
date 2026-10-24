from __future__ import annotations

from datetime import datetime
from typing import Any

from apps.calendar.exceptions import CalendarError
from apps.calendar.services.external_calendars import (
    _get_calendar_provider,
    _get_valid_access_token,
    _require_active_calendar_integration,
)
from apps.calendar.services.calendar_provider_service import (
    CalendarProviderError,
)
from apps.integrations.services.calendar_integration_link_service import (
    sync_calendar_integration_from_connection,
)

from .constants import sync_range, utc_now_iso
from .normalization import (
    is_incomplete_cancelled_event,
    normalize_provider_event_id,
)
from .payloads import build_external_event_payload
from .repository import (
    find_existing_external_event,
    get_due_calendar_integrations,
    get_external_calendars_to_sync,
    mark_existing_event_cancelled,
    persist_external_event,
)
from .status_tracking import (
    mark_external_calendar_sync_failure,
    mark_external_calendar_sync_success,
    mark_integration_sync_failure,
    mark_integration_sync_success,
)


def upsert_external_event(
    *,
    integration: dict[str, Any],
    external_calendar: dict[str, Any],
    provider_event: dict[str, Any],
) -> tuple[str | None, bool, bool]:
    provider_event_id = normalize_provider_event_id(
        provider_event
    )
    existing_event = find_existing_external_event(
        external_calendar_id=external_calendar["id"],
        provider_event_id=provider_event_id,
    )

    if is_incomplete_cancelled_event(provider_event):
        if not existing_event:
            return None, False, True

        event_id = mark_existing_event_cancelled(
            existing_event=existing_event,
            integration=integration,
            external_calendar=external_calendar,
            provider_event=provider_event,
        )
        return event_id, False, False

    payload = build_external_event_payload(
        integration=integration,
        external_calendar=external_calendar,
        provider_event=provider_event,
    )
    event_id, created = persist_external_event(
        existing_event=existing_event,
        payload=payload,
    )
    return event_id, created, False


def sync_selected_external_calendar(
    *,
    integration: dict[str, Any],
    external_calendar: dict[str, Any],
    access_token: str,
    range_start: datetime,
    range_end: datetime,
) -> dict[str, int]:
    attempted_at = utc_now_iso()

    try:
        provider = _get_calendar_provider(
            integration["provider"]
        )
        provider_events = provider.list_events(
            access_token=access_token,
            provider_calendar_id=external_calendar[
                "provider_calendar_id"
            ],
            range_start=range_start,
            range_end=range_end,
        )

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for provider_event in provider_events:
            _, created, skipped = upsert_external_event(
                integration=integration,
                external_calendar=external_calendar,
                provider_event=provider_event,
            )

            if skipped:
                skipped_count += 1
            elif created:
                created_count += 1
            else:
                updated_count += 1

        mark_external_calendar_sync_success(
            external_calendar_id=external_calendar["id"],
            synced_at=attempted_at,
        )

        return {
            "fetched": len(provider_events),
            "created": created_count,
            "updated": updated_count,
            "skipped": skipped_count,
        }
    except (CalendarError, CalendarProviderError):
        mark_external_calendar_sync_failure(
            external_calendar_id=external_calendar["id"],
            attempted_at=attempted_at,
        )
        raise
    except Exception as error:
        mark_external_calendar_sync_failure(
            external_calendar_id=external_calendar["id"],
            attempted_at=attempted_at,
        )
        raise CalendarError(
            "Could not synchronize an external calendar."
        ) from error


def sync_calendar_integration(
    *,
    user_id: str,
    integration_id: str,
    force_full_sync: bool = False,
) -> dict[str, Any]:
    del force_full_sync
    attempted_at = utc_now_iso()

    try:
        integration = _require_active_calendar_integration(
            user_id=user_id,
            integration_id=integration_id,
        )
        access_token = _get_valid_access_token(
            user_id=user_id,
            integration=integration,
        )
        selected_external_calendars = (
            get_external_calendars_to_sync(
                integration_id=integration_id,
            )
        )
        range_start, range_end = sync_range()

        fetched_count = 0
        created_count = 0
        updated_count = 0
        skipped_count = 0

        for external_calendar in selected_external_calendars:
            result = sync_selected_external_calendar(
                integration=integration,
                external_calendar=external_calendar,
                access_token=access_token,
                range_start=range_start,
                range_end=range_end,
            )
            fetched_count += result["fetched"]
            created_count += result["created"]
            updated_count += result["updated"]
            skipped_count += result["skipped"]

        refreshed_integration = (
            sync_calendar_integration_from_connection(
                connection_id=integration[
                    "integration_connection_id"
                ],
            )
        )
        mark_integration_sync_success(
            integration_id=integration_id,
            synced_at=attempted_at,
        )

        return {
            "integration_id": integration_id,
            "provider": integration["provider"],
            "synced_external_calendar_count": len(
                selected_external_calendars
            ),
            "fetched_event_count": fetched_count,
            "created_event_count": created_count,
            "updated_event_count": updated_count,
            "skipped_event_count": skipped_count,
            "synced_events_count": (
                created_count + updated_count
            ),
            "integration": refreshed_integration
            or integration,
        }
    except CalendarError as error:
        mark_integration_sync_failure(
            integration_id=integration_id,
            attempted_at=attempted_at,
            error=str(error),
        )
        raise
    except Exception as error:
        mark_integration_sync_failure(
            integration_id=integration_id,
            attempted_at=attempted_at,
            error=str(error),
        )
        raise CalendarError(
            "Could not synchronize calendar integration."
        ) from error


def sync_due_calendar_integrations() -> dict[str, int]:
    integrations = get_due_calendar_integrations()
    synced_integration_count = 0
    failed_integration_count = 0
    synced_event_count = 0

    for integration in integrations:
        try:
            result = sync_calendar_integration(
                user_id=str(integration["user_id"]),
                integration_id=str(integration["id"]),
            )
            synced_integration_count += 1
            synced_event_count += result["synced_events_count"]
        except CalendarError:
            failed_integration_count += 1

    return {
        "processed_integration_count": len(integrations),
        "synced_integration_count": synced_integration_count,
        "failed_integration_count": failed_integration_count,
        "synced_event_count": synced_event_count,
    }
