from datetime import datetime, timezone
from unittest import TestCase
from unittest.mock import patch

from apps.mail.services.mail_provider_service import MailProviderError
from apps.mail.services.microsoft_mail_provider_service import (
    MicrosoftMailProvider,
)


class MicrosoftMailGraphUrlGuardTests(TestCase):
    blocked_urls = (
        "http://graph.microsoft.com/v1.0/me/messages",
        "https://graph.microsoft.com.evil.test/v1.0/me/messages",
        "https://evil.graph.microsoft.com/v1.0/me/messages",
        "https://graph.microsoft.com@evil.test/v1.0/me/messages",
        "https://graph.microsoft.com:8443/v1.0/me/messages",
        "/v1.0/me/messages",
    )

    @patch(
        "apps.mail.services.microsoft_mail_provider_service.httpx.request"
    )
    def test_allows_exact_https_graph_host(self, request_mock):
        request_mock.return_value.status_code = 204
        request_mock.return_value.content = b""

        result = MicrosoftMailProvider()._request(
            method="DELETE",
            url="https://GRAPH.MICROSOFT.COM/v1.0/me/messages/message-id",
            access_token="test-access-token",
            allow_empty_response=True,
        )

        self.assertEqual(result, {})
        request_mock.assert_called_once()

    @patch(
        "apps.mail.services.microsoft_mail_provider_service.httpx.request"
    )
    def test_rejects_disallowed_urls_before_request(self, request_mock):
        provider = MicrosoftMailProvider()

        for url in self.blocked_urls:
            with self.subTest(url=url):
                with self.assertRaises(MailProviderError):
                    provider._request(
                        method="GET",
                        url=url,
                        access_token="test-access-token",
                    )

        request_mock.assert_not_called()

    @patch(
        "apps.mail.services.microsoft_mail_provider_service.httpx.request"
    )
    def test_blocks_malicious_message_next_link_before_second_request(
        self,
        request_mock,
    ):
        first_response = request_mock.return_value
        first_response.status_code = 200
        first_response.json.return_value = {
            "value": [{"id": "message-id"}],
            "@odata.nextLink": (
                "https://evil.example.test/v1.0/me/messages"
            ),
        }

        with self.assertRaises(MailProviderError):
            MicrosoftMailProvider()._list_message_ids(
                access_token="test-access-token",
                after=datetime(
                    2026,
                    1,
                    1,
                    tzinfo=timezone.utc,
                ),
                max_results=2,
                folder_id=None,
            )

        self.assertEqual(request_mock.call_count, 1)
        self.assertEqual(
            request_mock.call_args.args[1],
            "https://graph.microsoft.com/v1.0/me/messages",
        )
