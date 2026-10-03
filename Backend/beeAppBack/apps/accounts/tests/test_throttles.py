import os
from unittest import TestCase
from unittest.mock import patch

from rest_framework.test import APIRequestFactory

from apps.accounts.throttles import (
    PasswordResetRequestThrottle,
    TrustedClientIpThrottle,
)


class TestTrustedClientIpThrottle(TrustedClientIpThrottle):
    scope = "test_trusted_client_ip"
    rate = "1/min"


class TrustedClientIpThrottleTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def get_ident(self, remote_addr, forwarded_for=None):
        request = self.factory.post(
            "/api/accounts/password-reset/request/",
            {},
            format="json",
            REMOTE_ADDR=remote_addr,
        )
        if forwarded_for is not None:
            request.META["HTTP_X_FORWARDED_FOR"] = forwarded_for

        return TestTrustedClientIpThrottle().get_client_ident(
            request
        )

    @patch.dict(os.environ, {}, clear=True)
    def test_ignores_forwarded_for_without_trusted_proxies(self):
        ident = self.get_ident(
            "203.0.113.10",
            "198.51.100.10, 192.0.2.10",
        )
        self.assertEqual(ident, "203.0.113.10")

    @patch.dict(os.environ, {"NUM_PROXIES": "1"}, clear=True)
    def test_uses_client_ip_before_one_trusted_proxy(self):
        ident = self.get_ident(
            "192.0.2.10",
            "198.51.100.10, 192.0.2.10",
        )
        self.assertEqual(ident, "198.51.100.10")

    @patch.dict(os.environ, {"NUM_PROXIES": "2"}, clear=True)
    def test_uses_client_ip_before_two_trusted_proxies(self):
        ident = self.get_ident(
            "192.0.2.20",
            "198.51.100.10, 192.0.2.10, 192.0.2.20",
        )
        self.assertEqual(ident, "198.51.100.10")

    @patch.dict(os.environ, {"NUM_PROXIES": "1"}, clear=True)
    def test_rejects_malformed_forwarded_for(self):
        ident = self.get_ident(
            "203.0.113.10",
            "198.51.100.10, attacker-value",
        )
        self.assertEqual(ident, "203.0.113.10")

    @patch.dict(os.environ, {"NUM_PROXIES": "2"}, clear=True)
    def test_rejects_insufficient_forwarded_for_addresses(self):
        ident = self.get_ident(
            "203.0.113.10",
            "198.51.100.10, 192.0.2.10",
        )
        self.assertEqual(ident, "203.0.113.10")

    @patch.dict(os.environ, {"NUM_PROXIES": "1"}, clear=True)
    def test_rejects_empty_forwarded_for_item(self):
        ident = self.get_ident(
            "203.0.113.10",
            "198.51.100.10, , 192.0.2.10",
        )
        self.assertEqual(ident, "203.0.113.10")

    @patch.dict(os.environ, {"NUM_PROXIES": "invalid"}, clear=True)
    def test_invalid_proxy_configuration_falls_back_to_remote_addr(
        self,
    ):
        ident = self.get_ident(
            "203.0.113.10",
            "198.51.100.10, 192.0.2.10",
        )
        self.assertEqual(ident, "203.0.113.10")

    @patch.dict(os.environ, {"NUM_PROXIES": "-1"}, clear=True)
    def test_negative_proxy_configuration_falls_back_to_remote_addr(
        self,
    ):
        ident = self.get_ident(
            "203.0.113.10",
            "198.51.100.10, 192.0.2.10",
        )
        self.assertEqual(ident, "203.0.113.10")

    @patch.dict(os.environ, {}, clear=True)
    def test_invalid_remote_addr_uses_stable_fallback(self):
        ident = self.get_ident(
            "invalid-remote-address",
            "198.51.100.10, 192.0.2.10",
        )
        self.assertEqual(
            ident,
            TrustedClientIpThrottle.fallback_ident,
        )

    @patch.dict(os.environ, {}, clear=True)
    def test_preserves_existing_password_reset_request_rate(self):
        self.assertEqual(
            PasswordResetRequestThrottle().get_rate(),
            "3/min",
        )
