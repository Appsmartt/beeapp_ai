from __future__ import annotations

from datetime import datetime
from typing import Any
from urllib.parse import quote

import httpx

from apps.calendar.services.calendar_provider_service import (
    CalendarProviderError,
    ensure_normalized_event,
    normalize_hex_color,
    normalize_provider_timezone,
)


MICROSOFT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"

MICROSOFT_CALENDARS_ENDPOINT = (
    f"{MICROSOFT_GRAPH_BASE_URL}/me/calendars"
)

HTTP_TIMEOUT_SECONDS = 20.0


class MicrosoftCalendarProvider:
    provider = "microsoft"

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
                "Microsoft Graph could not be reached."
            ) from error

        if response.status_code in (401, 403):
            raise CalendarProviderError(
                "Microsoft Calendar authorization is unavailable "
                "or insufficient."
            )

        if response.status_code >= 400:
            raise CalendarProviderError(
                "Microsoft Graph returned an unexpected error."
            )

        try:
            data = response.json()
        except ValueError as error:
            raise CalendarProviderError(
                "Microsoft Graph returned invalid JSON."
            ) from error

        if not isinstance(data, dict):
            raise CalendarProviderError(
                "Microsoft Graph returned an invalid response."
            )

        return data

    def list_calendars(
        self,
        *,
        access_token: str,
    ) -> list[dict[str, Any]]:
        calendars: list[dict[str, Any]] = []
        next_url: str | None = MICROSOFT_CALENDARS_ENDPOINT
        params: dict[str, Any] | None = {
            "$select": (
                "id,name,color,canEdit,canShare,canViewPrivateItems,"
                "isDefaultCalendar,isRemovable,owner"
            ),
            "$top": 250,
        }

        while next_url:
            data = self._request(
                method="GET",
                url=next_url,
                access_token=access_token,
                params=params,
            )

            params = None

            items = data.get("value")

            if not isinstance(items, list):
                items = []

            for item in items:
                if not isinstance(item, dict):
                    continue

                provider_calendar_id = str(
                    item.get("id") or ""
                ).strip()
                name = str(
                    item.get("name") or "Outlook Calendar"
                ).strip()

                if not provider_calendar_id or not name:
                    continue

                can_edit = bool(item.get("canEdit"))

                calendars.append(
                    {
                        "provider_calendar_id": (
                            provider_calendar_id
                        ),
                        "name": name,
                        "description": None,
                        "timezone": "America/Bogota",
                        "provider_color": normalize_hex_color(
                            self._map_graph_color(
                                item.get("color")
                            ),
                            fallback="#2563EB",
                        ),
                        "access_level": (
                            "read_write"
                            if can_edit
                            else "read_only"
                        ),
                        "is_primary": bool(
                            item.get("isDefaultCalendar")
                        ),
                        "metadata": {
                            "can_edit": can_edit,
                            "can_share": bool(item.get("canShare")),
                            "can_view_private_items": bool(
                                item.get("canViewPrivateItems")
                            ),
                            "is_removable": bool(
                                item.get("isRemovable")
                            ),
                            "owner": item.get("owner") or {},
                            "graph_color": item.get("color") or None,
                        },
                    }
                )

            next_link = data.get("@odata.nextLink")
            next_url = str(next_link) if next_link else None

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

        encoded_calendar_id = quote(
            provider_calendar_id,
            safe="",
        )

        next_url: str | None = (
            f"{MICROSOFT_GRAPH_BASE_URL}/me/calendars/"
            f"{encoded_calendar_id}/calendarView"
        )

        params: dict[str, Any] | None = {
            "startDateTime": range_start.isoformat(),
            "endDateTime": range_end.isoformat(),
            "$top": 1000,
            "$select": (
                "id,subject,bodyPreview,body,start,end,isAllDay,"
                "isCancelled,location,webLink,lastModifiedDateTime,"
                "changeKey,showAs,onlineMeeting,onlineMeetingUrl,"
                "organizer,attendees,seriesMasterId,type"
            ),
        }

        while next_url:
            data = self._request(
                method="GET",
                url=next_url,
                access_token=access_token,
                params=params,
            )

            params = None

            items = data.get("value")

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

            next_link = data.get("@odata.nextLink")
            next_url = str(next_link) if next_link else None

        return events

    def _map_graph_color(
        self,
        value: Any,
    ) -> str:
        graph_colors = {
            "auto": "#2563EB",
            "lightBlue": "#60A5FA",
            "lightGreen": "#86EFAC",
            "lightOrange": "#FDBA74",
            "lightGray": "#94A3B8",
            "lightYellow": "#FDE68A",
            "lightTeal": "#5EEAD4",
            "lightPink": "#FDA4AF",
            "lightBrown": "#D6A47C",
            "lightRed": "#F87171",
            "maxColor": "#6025D2",
        }

        return graph_colors.get(
            str(value or ""),
            "#2563EB",
        )

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

        start_value = start.get("dateTime")
        end_value = end.get("dateTime")

        if not start_value or not end_value:
            return None

        is_all_day = bool(item.get("isAllDay"))
        is_cancelled = bool(item.get("isCancelled"))

        location = item.get("location")

        if not isinstance(location, dict):
            location = {}

        online_meeting = item.get("onlineMeeting")

        if not isinstance(online_meeting, dict):
            online_meeting = {}

        join_url = (
            online_meeting.get("joinUrl")
            or item.get("onlineMeetingUrl")
            or None
        )

        event_kind = (
            "virtual"
            if join_url
            else "in_person"
        )

        raw_event: dict[str, Any] = {
            "provider_event_id": provider_event_id,
            "provider_calendar_id": provider_calendar_id,
            "provider_etag": None,
            "provider_change_key": item.get("changeKey"),
            "provider_updated_at": (
                item.get("lastModifiedDateTime")
            ),
            "provider_web_link": item.get("webLink"),
            "title": (
                str(item.get("subject") or "Sin título").strip()
                or "Sin título"
            ),
            "description": (
                item.get("bodyPreview")
                or (
                    item.get("body", {}).get("content")
                    if isinstance(item.get("body"), dict)
                    else None
                )
                or None
            ),
            "location_name": location.get("displayName") or None,
            "location_address": (
                location.get("address", {}).get("street")
                if isinstance(location.get("address"), dict)
                else None
            ),
            "location_maps_url": None,
            "is_all_day": is_all_day,
            "timezone": normalize_provider_timezone(
                start.get("timeZone")
                or end.get("timeZone")
            ),
            "status": (
                "cancelled"
                if is_cancelled
                else "confirmed"
            ),
            "event_kind": event_kind,
            "provider_payload": item,
            "metadata": {
                "graph_show_as": item.get("showAs") or None,
                "graph_type": item.get("type") or None,
                "series_master_id": (
                    item.get("seriesMasterId") or None
                ),
                "organizer": item.get("organizer") or {},
                "attendees": item.get("attendees") or [],
                "online_meeting_url": join_url,
            },
        }

        if is_all_day:
            raw_event["starts_on"] = str(start_value)[:10]
            raw_event["ends_on"] = str(end_value)[:10]
        else:
            raw_event["starts_at"] = self._to_iso_datetime(
                value=str(start_value),
                timezone_name=start.get("timeZone"),
            )
            raw_event["ends_at"] = self._to_iso_datetime(
                value=str(end_value),
                timezone_name=end.get("timeZone"),
            )

        try:
            return ensure_normalized_event(
                provider=self.provider,
                raw_event=raw_event,
            )
        except CalendarProviderError:
            return None

    def _to_iso_datetime(
        self,
        *,
        value: str,
        timezone_name: Any,
    ) -> str:
        normalized_value = value.strip()

        if normalized_value.endswith("Z"):
            return normalized_value

        if "+" in normalized_value[10:] or "-" in normalized_value[10:]:
            return normalized_value

        timezone_label = normalize_provider_timezone(
            str(timezone_name or "")
        )

        return f"{normalized_value}+00:00"