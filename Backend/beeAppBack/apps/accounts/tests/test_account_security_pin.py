from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from rest_framework.test import APIRequestFactory

from apps.accounts.serializers import AccountSecurityPinSerializer
from apps.accounts.services.account_security_pin_service import (
    _pin_digest,
)
from apps.accounts.views import (
    AccountSecurityPinConfigureView,
    AccountSecurityPinStatusView,
    AccountSecurityPinVerifyView,
)


class AccountSecurityPinTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = SimpleNamespace(
            id="11111111-1111-1111-1111-111111111111"
        )

    def test_pin_requires_exactly_four_ascii_digits(self):
        for invalid in ("123", "12345", "12a4", " 1234", "1234 "):
            with self.subTest(invalid=invalid):
                self.assertFalse(
                    AccountSecurityPinSerializer(
                        data={"pin": invalid}
                    ).is_valid()
                )
        self.assertTrue(
            AccountSecurityPinSerializer(
                data={"pin": "0123"}
            ).is_valid()
        )

    @patch(
        "apps.accounts.services.account_security_pin_service."
        "settings.SECRET_KEY",
        "test-secret-key",
    )
    def test_digest_is_stable_and_not_the_plaintext_pin(self):
        digest = _pin_digest("0123")
        self.assertEqual(len(digest), 64)
        self.assertEqual(digest, _pin_digest("0123"))
        self.assertNotEqual(digest, _pin_digest("0124"))
        self.assertNotIn("0123", digest)

    @patch.object(
        AccountSecurityPinStatusView,
        "get_authenticated_user_and_access_token",
    )
    @patch(
        "apps.accounts.views."
        "account_security_pin_is_configured"
    )
    def test_status_reports_only_configuration(
        self, configured, authenticated
    ):
        authenticated.return_value = (self.user, "token")
        configured.return_value = False
        request = self.factory.get("/accounts/me/security-pin/")
        response = AccountSecurityPinStatusView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"configured": False})
        configured.assert_called_once_with(user_id=self.user.id)

    @patch.object(
        AccountSecurityPinConfigureView,
        "get_authenticated_user_and_access_token",
    )
    @patch("apps.accounts.views.configure_account_security_pin")
    def test_configuration_cannot_replace_existing_pin(
        self, configure, authenticated
    ):
        authenticated.return_value = (self.user, "token")
        configure.return_value = False
        request = self.factory.post(
            "/accounts/me/security-pin/configure/",
            {"pin": "0123"},
            format="json",
        )
        response = AccountSecurityPinConfigureView.as_view()(request)
        self.assertEqual(response.status_code, 409)
        configure.assert_called_once_with(
            user_id=self.user.id, pin="0123"
        )

    @patch.object(
        AccountSecurityPinVerifyView,
        "get_authenticated_user_and_access_token",
    )
    @patch("apps.accounts.views.verify_account_security_pin")
    def test_verification_responses(
        self, verify, authenticated
    ):
        authenticated.return_value = (self.user, "token")
        expected = {
            "verified": 200,
            "invalid": 403,
            "locked": 429,
            "not_configured": 409,
        }
        for result, status_code in expected.items():
            with self.subTest(result=result):
                verify.return_value = result
                request = self.factory.post(
                    "/accounts/me/security-pin/verify/",
                    {"pin": "0123"},
                    format="json",
                )
                response = AccountSecurityPinVerifyView.as_view()(request)
                self.assertEqual(response.status_code, status_code)
                self.assertNotIn("pin", response.data)
                self.assertNotIn("pin_hash", response.data)
