from unittest import TestCase
from unittest.mock import patch

from rest_framework.test import APIRequestFactory

from apps.accounts.exceptions import QrLoginError
from apps.accounts.services.qr_login_service import (
    consume_approved_qr_login_challenge,
)
from apps.accounts.views import (
    QrLoginChallengeView,
    WebSessionActivateView,
)


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table):
        self.table = table
        self.payload = None
        self.filters = []

    def insert(self, payload):
        self.payload = payload
        self.table.inserted.append(payload)
        return self

    def update(self, payload):
        self.payload = payload
        return self

    def select(self, *_fields):
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def is_(self, field, value):
        self.filters.append((field, value))
        return self

    def gt(self, field, value):
        self.filters.append((field, value))
        return self

    def single(self):
        return self

    def execute(self):
        if (
            self.payload
            and self.payload.get("status") == "CONSUMED"
        ):
            self.table.consume_attempts += 1

            if self.table.consume_attempts == 1:
                return FakeResponse([self.payload])

            return FakeResponse([])

        return FakeResponse([self.payload])


class FakeTable:
    def __init__(self):
        self.inserted = []
        self.consume_attempts = 0

    def insert(self, payload):
        return FakeQuery(self).insert(payload)

    def update(self, payload):
        return FakeQuery(self).update(payload)


class FakeSupabase:
    def __init__(self):
        self.challenge_table = FakeTable()

    def table(self, name):
        if name != "qr_login_challenges":
            raise AssertionError(f"Unexpected table: {name}")

        return self.challenge_table


class QrLoginCsrfTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.supabase = FakeSupabase()

    @patch("apps.accounts.views.create_qr_login_challenge")
    def test_challenge_requires_browser_nonce(
        self,
        create_challenge,
    ):
        request = self.factory.post(
            "/accounts/qr-login/challenges/",
            {},
            format="json",
        )

        response = QrLoginChallengeView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        create_challenge.assert_not_called()

    @patch(
        "apps.accounts.services.qr_login_service."
        "get_supabase_admin_client"
    )
    def test_challenge_stores_nonce_hash_only(
        self,
        get_supabase_admin_client,
    ):
        get_supabase_admin_client.return_value = self.supabase

        request = self.factory.post(
            "/accounts/qr-login/challenges/",
            {"browser_nonce": "browser-nonce-value"},
            format="json",
        )

        response = QrLoginChallengeView.as_view()(request)

        self.assertEqual(response.status_code, 201)

        payload = self.supabase.challenge_table.inserted[0]

        self.assertIn("browser_nonce_hash", payload)
        self.assertNotEqual(
            payload["browser_nonce_hash"],
            "browser-nonce-value",
        )
        self.assertNotIn(
            "browser_nonce",
            payload,
        )

    @patch("apps.accounts.views.consume_approved_qr_login_challenge")
    @patch("apps.accounts.views.get_active_session_by_token")
    def test_cross_site_request_without_nonce_cannot_set_cookie(
        self,
        get_active_session_by_token,
        consume_challenge,
    ):
        request = self.factory.post(
            "/accounts/web-session/activate/",
            {"challenge_token": "attacker-token"},
            format="json",
            HTTP_ORIGIN="https://attacker.example",
        )

        response = WebSessionActivateView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertNotIn("beeapp_web_session", response.cookies)
        get_active_session_by_token.assert_not_called()
        consume_challenge.assert_not_called()

    @patch("apps.accounts.views.set_web_session_cookie")
    @patch("apps.accounts.views.update_device_metadata")
    @patch("apps.accounts.views.consume_approved_qr_login_challenge")
    @patch("apps.accounts.views.get_active_session_by_token")
    def test_matching_nonce_consumes_before_setting_cookie(
        self,
        get_active_session_by_token,
        consume_challenge,
        update_device_metadata,
        set_web_session_cookie,
    ):
        get_active_session_by_token.return_value = {
            "id": "device-id",
        }
        consume_challenge.return_value = {
            "id": "challenge-id",
        }

        request = self.factory.post(
            "/accounts/web-session/activate/",
            {
                "challenge_token": "valid-token",
                "browser_nonce": "valid-browser-nonce",
            },
            format="json",
        )

        response = WebSessionActivateView.as_view()(request)

        self.assertEqual(response.status_code, 204)
        consume_challenge.assert_called_once_with(
            challenge_token="valid-token",
            browser_nonce="valid-browser-nonce",
        )
        update_device_metadata.assert_called_once()
        set_web_session_cookie.assert_called_once()

    @patch("apps.accounts.views.set_web_session_cookie")
    @patch("apps.accounts.views.update_device_metadata")
    @patch("apps.accounts.views.consume_approved_qr_login_challenge")
    @patch("apps.accounts.views.get_active_session_by_token")
    def test_wrong_nonce_cannot_set_cookie(
        self,
        get_active_session_by_token,
        consume_challenge,
        update_device_metadata,
        set_web_session_cookie,
    ):
        get_active_session_by_token.return_value = {
            "id": "device-id",
        }
        consume_challenge.side_effect = QrLoginError(
            "Invalid browser nonce."
        )

        request = self.factory.post(
            "/accounts/web-session/activate/",
            {
                "challenge_token": "attacker-token",
                "browser_nonce": "victim-browser-nonce",
            },
            format="json",
        )

        response = WebSessionActivateView.as_view()(request)

        self.assertEqual(response.status_code, 401)
        self.assertNotIn("beeapp_web_session", response.cookies)
        update_device_metadata.assert_not_called()
        set_web_session_cookie.assert_not_called()

    @patch(
        "apps.accounts.services.qr_login_service."
        "get_supabase_admin_client"
    )
    def test_replay_is_rejected_after_one_consumption(
        self,
        get_supabase_admin_client,
    ):
        get_supabase_admin_client.return_value = self.supabase

        for attempt in range(20):
            if attempt == 0:
                result = consume_approved_qr_login_challenge(
                    challenge_token="valid-token",
                    browser_nonce="valid-browser-nonce",
                )
                self.assertEqual(result["status"], "CONSUMED")
                continue

            with self.assertRaises(QrLoginError):
                consume_approved_qr_login_challenge(
                    challenge_token="valid-token",
                    browser_nonce="valid-browser-nonce",
                )

    @patch(
        "apps.accounts.services.qr_login_service."
        "get_supabase_admin_client"
    )
    def test_nonce_validation_rejects_empty_and_oversized_values(
        self,
        get_supabase_admin_client,
    ):
        get_supabase_admin_client.return_value = self.supabase

        from apps.accounts.services.qr_login_service import (
            create_qr_login_challenge,
        )

        for browser_nonce in ("", " " * 4, "x" * 257):
            with self.subTest(browser_nonce_length=len(browser_nonce)):
                with self.assertRaises(QrLoginError):
                    create_qr_login_challenge(
                        browser_nonce=browser_nonce,
                    )

        self.assertEqual(
            self.supabase.challenge_table.inserted,
            [],
        )

    @patch("apps.accounts.views.set_web_session_cookie")
    @patch("apps.accounts.views.update_device_metadata")
    @patch("apps.accounts.views.consume_approved_qr_login_challenge")
    @patch("apps.accounts.views.get_active_session_by_token")
    def test_repeated_cross_site_attempts_never_set_cookie(
        self,
        get_active_session_by_token,
        consume_challenge,
        update_device_metadata,
        set_web_session_cookie,
    ):
        for _ in range(20):
            request = self.factory.post(
                "/accounts/web-session/activate/",
                {"challenge_token": "attacker-token"},
                format="json",
                HTTP_ORIGIN="https://attacker.example",
            )

            response = WebSessionActivateView.as_view()(request)

            self.assertEqual(response.status_code, 400)

        get_active_session_by_token.assert_not_called()
        consume_challenge.assert_not_called()
        update_device_metadata.assert_not_called()
        set_web_session_cookie.assert_not_called()

    @patch("apps.accounts.views.set_web_session_cookie")
    @patch("apps.accounts.views.update_device_metadata")
    @patch("apps.accounts.views.consume_approved_qr_login_challenge")
    @patch("apps.accounts.views.get_active_session_by_token")
    def test_nonce_mismatch_never_sets_cookie_in_repeated_cycles(
        self,
        get_active_session_by_token,
        consume_challenge,
        update_device_metadata,
        set_web_session_cookie,
    ):
        get_active_session_by_token.return_value = {
            "id": "device-id",
        }
        consume_challenge.side_effect = QrLoginError(
            "QR login activation is not available."
        )

        for _ in range(20):
            request = self.factory.post(
                "/accounts/web-session/activate/",
                {
                    "challenge_token": "attacker-token",
                    "browser_nonce": "victim-browser-nonce",
                },
                format="json",
                HTTP_ORIGIN="https://attacker.example",
            )

            response = WebSessionActivateView.as_view()(request)

            self.assertEqual(response.status_code, 401)

        self.assertEqual(
            get_active_session_by_token.call_count,
            20,
        )
        self.assertEqual(consume_challenge.call_count, 20)
        update_device_metadata.assert_not_called()
        set_web_session_cookie.assert_not_called()
