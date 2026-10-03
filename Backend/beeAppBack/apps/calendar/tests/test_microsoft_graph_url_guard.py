from unittest import TestCase
from unittest.mock import patch

from apps.calendar.services.calendar_provider_service import (
    CalendarProviderError,
)
from apps.calendar.services.microsoft_calendar_provider_service import (
    MicrosoftCalendarProvider,
)


class MicrosoftCalendarGraphUrlGuardTests(TestCase):
    blocked_urls = (
        "http://graph.microsoft.com/v1.0/me/calendars",
        "https://graph.microsoft.com.evil.test/v1.0/me/calendars",
        "https://evil.graph.microsoft.com/v1.0/me/calendars",
        "https://graph.microsoft.com@evil.test/v1.0/me/calendars",
        "https://graph.microsoft.com:8443/v1.0/me/calendars",
        "/v1.0/me/calendars",
    )

    @patch(
        "apps.calendar.services.microsoft_calendar_provider_service.httpx.request"
    )
    def test_allows_exact_https_graph_host(self, request_mock):
        request_mock.return_value.status_code = 200
        request_mock.return_value.json.return_value = {"value": []}

        result = MicrosoftCalendarProvider()._request(
            method="GET",
            url="https://GRAPH.MICROSOFT.COM/v1.0/me/calendars",
            access_token="test-access-token",
        )

        self.assertEqual(result, {"value": []})
        request_mock.assert_called_once()

    @patch(
        "apps.calendar.services.microsoft_calendar_provider_service.httpx.request"
    )
    def test_rejects_disallowed_urls_before_request(self, request_mock):
        provider = MicrosoftCalendarProvider()

        for url in self.blocked_urls:
            with self.subTest(url=url):
                with self.assertRaises(CalendarProviderError):
                    provider._request(
                        method="GET",
                        url=url,
                        access_token="test-access-token",
                    )

        request_mock.assert_not_called()

    @patch(
        "apps.calendar.services.microsoft_calendar_provider_service.httpx.request"
    )
    def test_blocks_malicious_calendar_next_link_before_second_request(
        self,
        request_mock,
    ):
        first_response = request_mock.return_value
        first_response.status_code = 200
        first_response.json.return_value = {
            "value": [],
            "@odata.nextLink": (
                "https://evil.example.test/v1.0/me/calendars"
            ),
        }

        with self.assertRaises(CalendarProviderError):
            MicrosoftCalendarProvider().list_calendars(
                access_token="test-access-token",
            )

        self.assertEqual(request_mock.call_count, 1)
        self.assertEqual(
            request_mock.call_args.args[1],
            "https://graph.microsoft.com/v1.0/me/calendars",
        )
