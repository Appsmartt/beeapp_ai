from unittest import TestCase
from unittest.mock import patch

from django.core.cache import cache
from rest_framework.test import APIRequestFactory

from apps.accounts.throttles import (
    LoginUserThrottle,
    QrLoginChallengeStatusThrottle,
    QrLoginChallengeThrottle,
    QrLoginScanThrottle,
    RegisterUserThrottle,
    SessionRefreshThrottle,
)
from apps.accounts.views import (
    LoginUserView,
    QrLoginChallengeDetailView,
    QrLoginChallengeView,
    QrLoginScanView,
    RegisterUserView,
    SessionRefreshView,
)


class AuthThrottleConfigurationTests(TestCase):
    def test_all_auth_throttles_have_expected_scope_and_rate(self):
        expected = {
            RegisterUserThrottle: ("register_user", "5/hour"),
            LoginUserThrottle: ("login_user", "10/min"),
            SessionRefreshThrottle: ("session_refresh", "60/min"),
            QrLoginChallengeThrottle: ("qr_login_challenge", "10/min"),
            QrLoginChallengeStatusThrottle: (
                "qr_login_challenge_status",
                "60/min",
            ),
            QrLoginScanThrottle: ("qr_login_scan", "20/min"),
        }

        for throttle_class, (scope, rate) in expected.items():
            with self.subTest(throttle=throttle_class.__name__):
                self.assertEqual(throttle_class.scope, scope)
                self.assertEqual(throttle_class.rate, rate)

    def test_auth_views_use_only_their_expected_throttle(self):
        expected = {
            RegisterUserView: RegisterUserThrottle,
            LoginUserView: LoginUserThrottle,
            SessionRefreshView: SessionRefreshThrottle,
            QrLoginChallengeView: QrLoginChallengeThrottle,
            QrLoginChallengeDetailView: (
                QrLoginChallengeStatusThrottle
            ),
            QrLoginScanView: QrLoginScanThrottle,
        }

        for view_class, throttle_class in expected.items():
            with self.subTest(view=view_class.__name__):
                self.assertEqual(
                    view_class.throttle_classes,
                    [throttle_class],
                )


class AuthThrottleBehaviorTests(TestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()

    def tearDown(self):
        cache.clear()

    def make_request(self, path="/api/accounts/login", **headers):
        return self.factory.post(
            path,
            {},
            format="json",
            REMOTE_ADDR="203.0.113.10",
            **headers,
        )

    def assert_limit(self, throttle_class, allowed_requests):
        throttle = throttle_class()

        for _ in range(allowed_requests):
            self.assertTrue(
                throttle.allow_request(
                    self.make_request(),
                    view=None,
                )
            )

        self.assertFalse(
            throttle.allow_request(
                self.make_request(),
                view=None,
            )
        )

    def test_register_limit(self):
        self.assert_limit(RegisterUserThrottle, 5)

    def test_login_limit(self):
        self.assert_limit(LoginUserThrottle, 10)

    def test_refresh_limit(self):
        self.assert_limit(SessionRefreshThrottle, 60)

    def test_qr_challenge_limit(self):
        self.assert_limit(QrLoginChallengeThrottle, 10)

    def test_qr_challenge_status_limit(self):
        self.assert_limit(QrLoginChallengeStatusThrottle, 60)

    def test_qr_scan_limit(self):
        self.assert_limit(QrLoginScanThrottle, 20)

    def test_scopes_are_isolated_for_the_same_client(self):
        request = self.make_request()

        for _ in range(10):
            self.assertTrue(
                LoginUserThrottle().allow_request(
                    request,
                    view=None,
                )
            )

        self.assertFalse(
            LoginUserThrottle().allow_request(
                request,
                view=None,
            )
        )
        self.assertTrue(
            RegisterUserThrottle().allow_request(
                request,
                view=None,
            )
        )

    @patch.dict("os.environ", {"NUM_PROXIES": "1"}, clear=True)
    def test_trusted_proxy_client_ip_is_throttled_independently(self):
        first_client = self.make_request(
            HTTP_X_FORWARDED_FOR="198.51.100.10, 192.0.2.10",
        )
        second_client = self.make_request(
            HTTP_X_FORWARDED_FOR="198.51.100.11, 192.0.2.10",
        )

        for _ in range(10):
            self.assertTrue(
                LoginUserThrottle().allow_request(
                    first_client,
                    view=None,
                )
            )

        self.assertFalse(
            LoginUserThrottle().allow_request(
                first_client,
                view=None,
            )
        )
        self.assertTrue(
            LoginUserThrottle().allow_request(
                second_client,
                view=None,
            )
        )

    @patch.dict("os.environ", {"NUM_PROXIES": "0"}, clear=True)
    def test_untrusted_forwarded_header_does_not_bypass_limit(self):
        first_request = self.make_request(
            HTTP_X_FORWARDED_FOR="198.51.100.10",
        )
        spoofed_request = self.make_request(
            HTTP_X_FORWARDED_FOR="198.51.100.11",
        )

        for _ in range(10):
            self.assertTrue(
                LoginUserThrottle().allow_request(
                    first_request,
                    view=None,
                )
            )

        self.assertFalse(
            LoginUserThrottle().allow_request(
                spoofed_request,
                view=None,
            )
        )


class AuthThrottleHttpResponseTests(TestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()

    def tearDown(self):
        cache.clear()

    def assert_throttled(self, view, path, payload, patch_target, result):
        with patch(patch_target, return_value=result):
            first_response = view(
                self.factory.post(
                    path,
                    payload,
                    format="json",
                    REMOTE_ADDR="203.0.113.10",
                )
            )
            second_response = view(
                self.factory.post(
                    path,
                    payload,
                    format="json",
                    REMOTE_ADDR="203.0.113.10",
                )
            )

        self.assertNotEqual(first_response.status_code, 429)
        self.assertEqual(second_response.status_code, 429)

    @patch.object(RegisterUserThrottle, "rate", "1/min")
    def test_register_returns_429_after_limit(self):
        self.assert_throttled(
            RegisterUserView.as_view(),
            "/api/accounts/register/",
            {
                "first_name": "Test",
                "last_name": "User",
                "email": "throttle-register@example.com",
                "password": "SecurePass123",
                "phone_dial_code": "57",
                "phone_number": "3001234567",
            },
            "apps.accounts.views.create_complete_user",
            {
                "auth_user_id": "00000000-0000-0000-0000-000000000001",
                "email": "throttle-register@example.com",
                "phone": "+573001234567",
                "profile": {
                    "first_name": "Test",
                    "last_name": "User",
                    "phone_dial_code": "57",
                    "phone_number": "3001234567",
                    "role": "USER",
                },
            },
        )

    @patch.object(LoginUserThrottle, "rate", "1/min")
    def test_login_returns_429_after_limit(self):
        authenticated_user = {
            "user": {
                "id": "00000000-0000-0000-0000-000000000002",
                "email": "throttle-login@example.com",
            },
            "session": {"access_token": "access-token"},
        }

        with patch(
            "apps.accounts.views.login_with_email_password",
            return_value=authenticated_user,
        ), patch(
            "apps.accounts.views.create_or_replace_mobile_device_session",
            return_value={
                "id": "00000000-0000-0000-0000-000000000003",
                "revoked_push_tokens": [],
                "revoked_device_session_ids": [],
            },
        ), patch(
            "apps.accounts.views.send_mobile_session_revoked_push",
        ):
            view = LoginUserView.as_view()
            payload = {
                "email": "throttle-login@example.com",
                "password": "SecurePass123",
            }
            first_response = view(
                self.factory.post(
                    "/api/accounts/login/",
                    payload,
                    format="json",
                    REMOTE_ADDR="203.0.113.10",
                )
            )
            second_response = view(
                self.factory.post(
                    "/api/accounts/login/",
                    payload,
                    format="json",
                    REMOTE_ADDR="203.0.113.10",
                )
            )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 429)

    @patch.object(SessionRefreshThrottle, "rate", "1/min")
    def test_refresh_returns_429_after_limit(self):
        self.assert_throttled(
            SessionRefreshView.as_view(),
            "/api/accounts/session/refresh/",
            {"refresh_token": "refresh-token"},
            "apps.accounts.views.refresh_supabase_session",
            {
                "access_token": "next-access-token",
                "refresh_token": "next-refresh-token",
            },
        )

    @patch.object(QrLoginChallengeThrottle, "rate", "1/min")
    def test_qr_challenge_returns_429_after_limit(self):
        self.assert_throttled(
            QrLoginChallengeView.as_view(),
            "/api/accounts/qr-login/challenges/",
            {"browser_nonce": "browser-nonce-value"},
            "apps.accounts.views.create_qr_login_challenge",
            {
                "challenge_token": "challenge-token",
                "expires_at": "2026-10-03T00:00:00Z",
            },
        )

    @patch.object(QrLoginChallengeStatusThrottle, "rate", "1/min")
    def test_qr_challenge_status_returns_429_after_limit(self):
        with patch(
            "apps.accounts.views.get_qr_login_challenge",
            return_value={
                "status": "PENDING",
                "expires_at": "2026-10-03T00:00:00Z",
            },
        ):
            view = QrLoginChallengeDetailView.as_view()
            first_response = view(
                self.factory.get(
                    "/api/accounts/qr-login/challenges/challenge-token/",
                    REMOTE_ADDR="203.0.113.10",
                ),
                challenge_token="challenge-token",
            )
            second_response = view(
                self.factory.get(
                    "/api/accounts/qr-login/challenges/challenge-token/",
                    REMOTE_ADDR="203.0.113.10",
                ),
                challenge_token="challenge-token",
            )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 429)

    @patch.object(QrLoginScanThrottle, "rate", "1/min")
    def test_qr_scan_returns_429_after_limit(self):
        authenticated_user = type(
            "AuthenticatedUser",
            (),
            {"id": "00000000-0000-0000-0000-000000000004"},
        )()

        with patch(
            "apps.accounts.views.get_authenticated_user",
            return_value=authenticated_user,
        ), patch(
            "apps.accounts.views.get_active_mobile_device_session_for_auth_session"
        ), patch(
            "apps.accounts.views.approve_qr_login_challenge",
            return_value={"id": "device-session-id"},
        ):
            view = QrLoginScanView.as_view()
            payload = {"challenge_token": "challenge-token"}
            headers = {
                "HTTP_AUTHORIZATION": "Bearer access-token",
                "REMOTE_ADDR": "203.0.113.10",
            }
            first_response = view(
                self.factory.post(
                    "/api/accounts/qr-login/scan/",
                    payload,
                    format="json",
                    **headers,
                )
            )
            second_response = view(
                self.factory.post(
                    "/api/accounts/qr-login/scan/",
                    payload,
                    format="json",
                    **headers,
                )
            )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 429)
