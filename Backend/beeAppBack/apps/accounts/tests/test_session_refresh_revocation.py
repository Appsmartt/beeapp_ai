from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from apps.accounts.exceptions import AccountAuthenticationError, DeviceSessionError
from apps.accounts.services.session_refresh_service import refresh_supabase_session


class SessionRefreshRevocationTests(TestCase):
    def setUp(self):
        self.session = SimpleNamespace(
            access_token="access-token", refresh_token="next-refresh-token",
            expires_at=1234567890, expires_in=3600, token_type="bearer",
        )
        self.response = SimpleNamespace(
            session=self.session,
            user=SimpleNamespace(id="11111111-1111-1111-1111-111111111111"),
        )

    @patch("apps.accounts.services.session_refresh_service.get_active_mobile_device_session_for_auth_session")
    @patch("apps.accounts.services.session_refresh_service.get_supabase_publishable_client")
    def test_active_mobile_session_can_refresh(self, client, validate):
        client.return_value.auth.refresh_session.return_value = self.response
        for _ in range(20):
            result = refresh_supabase_session(refresh_token="existing-refresh-token")
            self.assertEqual(result["access_token"], "access-token")
        self.assertEqual(validate.call_count, 20)
        validate.assert_called_with(
            user_id="11111111-1111-1111-1111-111111111111",
            access_token="access-token",
        )

    @patch("apps.accounts.services.session_refresh_service.get_active_mobile_device_session_for_auth_session")
    @patch("apps.accounts.services.session_refresh_service.get_supabase_publishable_client")
    def test_revoked_mobile_session_never_returns_tokens(self, client, validate):
        client.return_value.auth.refresh_session.return_value = self.response
        validate.side_effect = DeviceSessionError("Revoked")
        for _ in range(20):
            with self.assertRaises(AccountAuthenticationError):
                refresh_supabase_session(refresh_token="existing-refresh-token")

    @patch("apps.accounts.services.session_refresh_service.get_active_mobile_device_session_for_auth_session")
    @patch("apps.accounts.services.session_refresh_service.get_supabase_publishable_client")
    def test_missing_user_never_returns_tokens(self, client, validate):
        self.response.user = None
        client.return_value.auth.refresh_session.return_value = self.response
        with self.assertRaises(AccountAuthenticationError):
            refresh_supabase_session(refresh_token="existing-refresh-token")
        validate.assert_not_called()
