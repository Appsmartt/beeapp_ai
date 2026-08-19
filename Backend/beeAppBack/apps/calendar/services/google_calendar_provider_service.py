from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx

from apps.calendar.services.calendar_provider_service import (
    CalendarProviderError,
    ensure_normalized_event,
    normalize_hex_color,
    normalize_provider_timezone,
)


GOOGLE_CALENDAR_LIST_ENDPOINT = (
    "https://www.googleapis.com/calendar/v3/users/me/calendarList"
)

GOOGLE_CALENDAR_EVENTS_ENDPOINT = (
    "https://www.googleapis.com/calendar/v3/calendars/"
    "{calendar_id}/events"
)

HTTP_TIMEOUT_SECONDS = 20.0


class GoogleCalendarProvider:
    provider = "google"

    def _headers(
        self,
        access_token: str,
    ) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

    def _request(
        self,
        *,
        method: str,
        url: str,
        access_token: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        try:
            response = httpx.request(
                method,
                url,
                headers=self._headers(access_token),
                params=params,
                timeout=HTTP_TIMEOUT_SECONDS,
            )
        except httpx.HTTPError as error:
            raise CalendarProviderError(
                "Google Calendar could not be reached."
            ) from error

        if response.status_code in (401, 403):
            raise CalendarProviderError(
                "Google Calendar authorization is unavailable "
                "or insufficient."
            )

        if response.status_code >= 400:
            raise CalendarProviderError(
                "Google Calendar returned an unexpected error."
            )

        try:
            data = response.json()
        except ValueError as error:
            raise CalendarProviderError(
                "Google Calendar returned invalid JSON."
            ) from error

        if not isinstance(data, dict):
            raise CalendarProviderError(
                "Google Calendar returned an invalid response."
            )

        return data

    def list_calendars(
        self,
        *,
        access_token: str,
    ) -> list[dict[str, Any]]:
        calendars: list[dict[str, Any]] = []
        page_token: str | None = None

        while True:
            params: dict[str, Any] = {
                "maxResults": 250,
                "showHidden": False,
            }

            if page_token:
                params["pageToken"] = page_token

            data = self._request(
                method="GET",
                url=GOOGLE_CALENDAR_LIST_ENDPOINT,
                access_token=access_token,
                params=params,
            )

            items = data.get("items")

            if not isinstance(items, list):
                items = []

            for item in items:
                if not isinstance(item, dict):
                    continue

                provider_calendar_id = str(
                    item.get("id") or ""
                ).strip()

                summary = str(
                    item.get("summary")
                    or item.get("summaryOverride")
                    or "Google Calendar"
                ).strip()

                if not provider_calendar_id or not summary:
                    continue

                access_role = str(
                    item.get("accessRole") or ""
                ).strip()

                calendars.append(
                    {
                        "provider_calendar_id": (
                            provider_calendar_id
                        ),
                        "name": summary,
                        "description": (
                            item.get("description") or None
                        ),
                        "timezone": normalize_provider_timezone(
                            item.get("timeZone")
                        ),
                        "provider_color": normalize_hex_color(
                            item.get("backgroundColor"),
                            fallback="#2563EB",
                        ),
                        "access_level": (
                            "read_only"
                            if access_role == "reader"
                            else "read_write"
                        ),
                        "is_primary": bool(item.get("primary")),
                        "metadata": {
                            "access_role": access_role or None,
                            "foreground_color": (
                                item.get("foregroundColor")
                                or None
                            ),
                            "selected": bool(
                                item.get("selected", True)
                            ),
                            "hidden": bool(item.get("hidden", False)),
                            "google_etag": item.get("etag"),
                        },
                    }
                )

            page_token_raw = data.get("nextPageToken")
            page_token = (
                str(page_token_raw)
                if page_token_raw
                else None
            )

            if not page_token:
                break

        return calendars

    def list_events(
        self,
        *,
        access_token: str,
        provider_calendar_id: str,
        range_start: datetime,
        range_end: datetime,
    ) -> list[dict[str, Any]]:
        events: list[dict[str, Any]] = []
        page_token: str | None = None

        endpoint = GOOGLE_CALENDAR_EVENTS_ENDPOINT.format(
            calendar_id=httpx.URL(
                provider_calendar_id
            ).raw_path.decode("utf-8")
        )

        while True:
            params: dict[str, Any] = {
                "timeMin": range_start.isoformat(),
                "timeMax": range_end.isoformat(),
                "singleEvents": "true",
                "showDeleted": True,
                "maxResults": 2500,
                "orderBy": "startTime",
            }

            if page_token:
                params["pageToken"] = page_token

            data = self._request(
                method="GET",
                url=endpoint,
                access_token=access_token,
                params=params,
            )

            items = data.get("items")

            if not isinstance(items, list):
                items = []

            for item in items:
                if not isinstance(item, dict):
                    continue

                normalized_event = self._normalize_event(
                    item=item,
                    provider_calendar_id=provider_calendar_id,
                )

                if normalized_event:
                    events.append(normalized_event)

            page_token_raw = data.get("nextPageToken")
            page_token = (
                str(page_token_raw)
                if page_token_raw
                else None
            )

            if not page_token:
                break

        return events

    def _normalize_event(
        self,
        *,
        item: dict[str, Any],
        provider_calendar_id: str,
    ) -> dict[str, Any] | None:
        provider_event_id = str(item.get("id") or "").strip()

        if not provider_event_id:
            return None

        start = item.get("start")
        end = item.get("end")

        if not isinstance(start, dict) or not isinstance(end, dict):
            return None

        status = str(item.get("status") or "confirmed")
        is_all_day = bool(start.get("date"))

        raw_event: dict[str, Any] = {
            "provider_event_id": provider_event_id,
            "provider_calendar_id": provider_calendar_id,
            "provider_etag": item.get("etag"),
            "provider_updated_at": item.get("updated"),
            "provider_web_link": item.get("htmlLink"),
            "title": (
                str(item.get("summary") or "Sin título").strip()
                or "Sin título"
            ),
            "description": item.get("description") or None,
            "location_name": item.get("location") or None,
            "location_address": item.get("location") or None,
            "location_maps_url": None,
            "is_all_day": is_all_day,
            "timezone": (
                start.get("timeZone")
                or end.get("timeZone")
                or "America/Bogota"
            ),
            "status": (
                "cancelled"
                if status == "cancelled"
                else "confirmed"
            ),
            "event_kind": "virtual" if item.get("hangoutLink") else "in_person",
            "provider_payload": item,
            "metadata": {
                "google_status": status,
                "recurring_event_id": (
                    item.get("recurringEventId") or None
                ),
                "original_start_time": (
                    item.get("originalStartTime") or None
                ),
                "creator": item.get("creator") or {},
                "organizer": item.get("organizer") or {},
                "hangout_link": item.get("hangoutLink") or None,
            },
        }

        if is_all_day:
            raw_event["starts_on"] = start.get("date")
            raw_event["ends_on"] = end.get("date")
        else:
            raw_event["starts_at"] = start.get("dateTime")
            raw_event["ends_at"] = end.get("dateTime")

        try:
            return ensure_normalized_event(
                provider=self.provider,
                raw_event=raw_event,
            )
        except CalendarProviderError:
            return None