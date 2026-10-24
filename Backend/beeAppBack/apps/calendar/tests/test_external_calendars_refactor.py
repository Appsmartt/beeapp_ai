from __future__ import annotations

from unittest import TestCase
from unittest.mock import MagicMock, patch

from apps.calendar.exceptions import CalendarError
from apps.calendar.services.calendar_provider_service import (
    CalendarProviderError,
)
from apps.calendar.services.external_calendars import service
from apps.calendar.services.external_calendars import repository


class ExternalCalendarsRefactorTests(TestCase):
    def setUp(self):
        self.integration = {
            "id": "integration-1",
            "user_id": "user-1",
            "provider": "google",
            "provider_account_id": "account-1",
            "integration_connection_id": "connection-1",
            "status": "active",
            "metadata": {},
        }
        self.provider_calendar = {
            "provider_calendar_id": "provider-calendar-1",
            "name": "Primary",
            "is_primary": True,
            "timezone": "America/Bogota",
        }
        self.external_calendar = {
            "id": "external-calendar-1",
            "integration_id": "integration-1",
            "is_selected": True,
            "is_visible": "visible",
        }

    @patch(
        "apps.calendar.services.external_calendars."
        "service._upsert_external_calendar"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "service._update_integration_account_color"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "service._get_account_color"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "service._get_calendar_provider"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "service._get_valid_access_token"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "service._require_active_calendar_integration"
    )
    def test_discovery_preserves_response_contract(
        self,
        require_active,
        get_access_token,
        get_provider,
        get_account_color,
        update_color,
        upsert_external_calendar,
    ):
        provider = MagicMock()
        provider.list_calendars.return_value = [
            self.provider_calendar,
        ]
        require_active.return_value = self.integration
        get_access_token.return_value = "safe-token"
        get_provider.return_value = provider
        get_account_color.return_value = "#2563EB"
        update_color.return_value = self.integration
        upsert_external_calendar.return_value = self.external_calendar

        result = service.discover_external_calendars(
            user_id="user-1",
            integration_id="integration-1",
        )

        self.assertEqual(
            result,
            {
                "integration_id": "integration-1",
                "provider": "google",
                "account_color": "#2563EB",
                "discovered_count": 1,
                "external_calendars": [self.external_calendar],
            },
        )
        provider.list_calendars.assert_called_once_with(
            access_token="safe-token",
        )
        upsert_external_calendar.assert_called_once_with(
            user_id="user-1",
            integration=self.integration,
            provider_calendar=self.provider_calendar,
            account_color="#2563EB",
        )

    @patch(
        "apps.calendar.services.external_calendars."
        "service._get_calendar_provider"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "service._get_valid_access_token"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "service._require_active_calendar_integration"
    )
    def test_discovery_translates_provider_error(
        self,
        require_active,
        get_access_token,
        get_provider,
    ):
        provider = MagicMock()
        provider.list_calendars.side_effect = CalendarProviderError(
            "Provider unavailable."
        )
        require_active.return_value = self.integration
        get_access_token.return_value = "safe-token"
        get_provider.return_value = provider

        with self.assertRaisesRegex(
            CalendarError,
            "^Provider unavailable\\.$",
        ):
            service.discover_external_calendars(
                user_id="user-1",
                integration_id="integration-1",
            )

    @patch(
        "apps.calendar.services.external_calendars."
        "repository._response_data"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "repository._supabase"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "repository._get_calendar_integration_for_user"
    )
    def test_list_checks_ownership_before_query(
        self,
        get_integration,
        get_supabase,
        response_data,
    ):
        query = MagicMock()
        get_supabase.return_value.table.return_value.select.return_value = (
            query
        )
        query.eq.return_value.order.return_value.order.return_value.execute.return_value = MagicMock()
        response_data.return_value = [self.external_calendar]

        result = repository.list_external_calendars(
            user_id="user-1",
            integration_id="integration-1",
        )

        self.assertEqual(result, [self.external_calendar])
        get_integration.assert_called_once_with(
            user_id="user-1",
            integration_id="integration-1",
        )

    @patch(
        "apps.calendar.services.external_calendars."
        "repository._get_calendar_integration_for_user"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "repository._supabase"
    )
    def test_update_rejects_empty_preferences(
        self,
        get_supabase,
        get_integration,
    ):
        query = MagicMock()
        get_supabase.return_value.table.return_value.select.return_value = (
            query
        )
        query.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data=self.external_calendar
        )

        with self.assertRaisesRegex(
            CalendarError,
            "^At least one external calendar preference must be provided\\.$",
        ):
            repository.update_external_calendar_preferences(
                user_id="user-1",
                external_calendar_id="external-calendar-1",
            )

    @patch(
        "apps.calendar.services.external_calendars."
        "repository._get_calendar_integration_for_user"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "repository._supabase"
    )
    def test_update_rejects_invalid_visibility(
        self,
        get_supabase,
        get_integration,
    ):
        query = MagicMock()
        get_supabase.return_value.table.return_value.select.return_value = (
            query
        )
        query.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data=self.external_calendar
        )

        with self.assertRaisesRegex(
            CalendarError,
            "^External calendar visibility is invalid\\.$",
        ):
            repository.update_external_calendar_preferences(
                user_id="user-1",
                external_calendar_id="external-calendar-1",
                is_visible="private",
            )

    @patch(
        "apps.calendar.services.external_calendars."
        "service._upsert_external_calendar"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "service._update_integration_account_color"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "service._get_account_color",
        return_value="#2563EB",
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "service._get_calendar_provider"
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "service._get_valid_access_token",
        return_value="safe-token",
    )
    @patch(
        "apps.calendar.services.external_calendars."
        "service._require_active_calendar_integration"
    )
    def test_discovery_is_stable_across_repeated_cycles(
        self,
        require_active,
        get_access_token,
        get_provider,
        get_account_color,
        update_color,
        upsert_external_calendar,
    ):
        provider = MagicMock()
        provider.list_calendars.return_value = [
            self.provider_calendar,
        ]
        require_active.return_value = self.integration
        get_provider.return_value = provider
        update_color.return_value = self.integration
        upsert_external_calendar.return_value = self.external_calendar

        for _ in range(100):
            result = service.discover_external_calendars(
                user_id="user-1",
                integration_id="integration-1",
            )

            self.assertEqual(result["discovered_count"], 1)
            self.assertEqual(result["account_color"], "#2563EB")
            self.assertEqual(
                result["external_calendars"],
                [self.external_calendar],
            )

        self.assertEqual(provider.list_calendars.call_count, 100)
        self.assertEqual(upsert_external_calendar.call_count, 100)
