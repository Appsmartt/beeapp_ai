from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from rest_framework.test import APIRequestFactory

from apps.accounts.exceptions import (
    AccountLoginError,
    AccountLoginUnavailableError,
)
from apps.accounts.views import (
    AccountSecurityPinPasswordVerifyView,
    AccountSecurityPinReplaceView,
)


class AccountSecurityPinPasswordRecoveryTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = SimpleNamespace(
            id="11111111-1111-1111-1111-111111111111",
            email="owner@example.com",
        )

    @patch.object(
        AccountSecurityPinPasswordVerifyView,
        "get_authenticated_user_and_access_token",
    )
    @patch("apps.accounts.views.login_with_email_password")
    def test_correct_password_opens_pin_entry(self, login, authenticated):
        authenticated.return_value = (self.user, "existing-token")
        login.return_value = {
            "user": {"id": self.user.id},
        }
        request = self.factory.post(
            "/accounts/me/security-pin/verify-password/",
            {"password": "correct-password"},
            format="json",
        )
        response = AccountSecurityPinPasswordVerifyView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"verified": True})
        login.assert_called_once_with(
            email=self.user.email,
            password="correct-password",
        )

    @patch.object(
        AccountSecurityPinReplaceView,
        "get_authenticated_user_and_access_token",
    )
    @patch("apps.accounts.views.replace_account_security_pin")
    @patch("apps.accounts.views.login_with_email_password")
    def test_replacement_requires_matching_account(
        self, login, replace, authenticated
    ):
        authenticated.return_value = (self.user, "existing-token")
        login.return_value = {
            "user": {"id": "22222222-2222-2222-2222-222222222222"},
        }
        request = self.factory.post(
            "/accounts/me/security-pin/replace/",
            {"password": "another-password", "pin": "4321"},
            format="json",
        )
        response = AccountSecurityPinReplaceView.as_view()(request)
        self.assertEqual(response.status_code, 403)
        replace.assert_not_called()

    @patch.object(
        AccountSecurityPinReplaceView,
        "get_authenticated_user_and_access_token",
    )
    @patch("apps.accounts.views.replace_account_security_pin")
    @patch("apps.accounts.views.login_with_email_password")
    def test_replacement_rechecks_password_and_writes_only_own_pin(
        self, login, replace, authenticated
    ):
        authenticated.return_value = (self.user, "existing-token")
        login.return_value = {"user": {"id": self.user.id}}
        replace.return_value = True
        request = self.factory.post(
            "/accounts/me/security-pin/replace/",
            {"password": "correct-password", "pin": "4321"},
            format="json",
        )
        response = AccountSecurityPinReplaceView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"configured": True})
        self.assertNotIn("pin", response.data)
        replace.assert_called_once_with(user_id=self.user.id, pin="4321")

    @patch.object(
        AccountSecurityPinReplaceView,
        "get_authenticated_user_and_access_token",
    )
    @patch("apps.accounts.views.replace_account_security_pin")
    @patch("apps.accounts.views.login_with_email_password")
    def test_incorrect_password_never_replaces_pin(
        self, login, replace, authenticated
    ):
        authenticated.return_value = (self.user, "existing-token")
        login.side_effect = AccountLoginError("Wrong password")
        request = self.factory.post(
            "/accounts/me/security-pin/replace/",
            {"password": "wrong-password", "pin": "4321"},
            format="json",
        )
        response = AccountSecurityPinReplaceView.as_view()(request)
        self.assertEqual(response.status_code, 403)
        replace.assert_not_called()

    @patch.object(
        AccountSecurityPinPasswordVerifyView,
        "get_authenticated_user_and_access_token",
    )
    @patch("apps.accounts.views.login_with_email_password")
    def test_auth_outage_is_not_reported_as_wrong_password(
        self, login, authenticated
    ):
        authenticated.return_value = (self.user, "existing-token")
        login.side_effect = AccountLoginUnavailableError("Unavailable")
        request = self.factory.post(
            "/accounts/me/security-pin/verify-password/",
            {"password": "correct-password"},
            format="json",
        )
        response = AccountSecurityPinPasswordVerifyView.as_view()(request)
        self.assertEqual(response.status_code, 503)

    @patch.object(
        AccountSecurityPinReplaceView,
        "get_authenticated_user_and_access_token",
    )
    @patch("apps.accounts.views.replace_account_security_pin")
    @patch("apps.accounts.views.login_with_email_password")
    def test_replacement_rejects_invalid_pin(
        self, login, replace, authenticated
    ):
        authenticated.return_value = (self.user, "existing-token")
        request = self.factory.post(
            "/accounts/me/security-pin/replace/",
            {"password": "correct-password", "pin": "12a4"},
            format="json",
        )
        response = AccountSecurityPinReplaceView.as_view()(request)
        self.assertEqual(response.status_code, 400)
        login.assert_not_called()
        replace.assert_not_called()
