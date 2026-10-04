from __future__ import annotations

import sys
import types
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch


BACKEND_ROOT = Path(__file__).resolve().parents[3]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


if "supabase" not in sys.modules:
    supabase_module = types.ModuleType("supabase")
    supabase_module.Client = object
    supabase_module.ClientOptions = object
    supabase_module.create_client = lambda *args, **kwargs: None
    sys.modules["supabase"] = supabase_module


from apps.integrations.exceptions import (
    IntegrationCredentialError,
)
from apps.integrations.services.connection import shared
from apps.integrations.services.connection import token_service


class ConnectionSharedContractTests(unittest.TestCase):
    def test_normalize_string_list_removes_blank_duplicates(self):
        result = shared.normalize_string_list(
            [" calendar ", "", "calendar", 7, "7", None]
        )

        self.assertEqual(result, ["calendar", "7", "None"])

    def test_merge_string_lists_preserves_first_occurrence(self):
        result = shared.merge_string_lists(
            ["mail", "calendar"],
            ["calendar", "contacts"],
        )

        self.assertEqual(
            result,
            ["mail", "calendar", "contacts"],
        )

    def test_token_granted_scopes_requires_string(self):
        self.assertEqual(
            shared.token_granted_scopes({"scope": ["mail"]}),
            [],
        )
        self.assertEqual(
            shared.token_granted_scopes(
                {"scope": "mail calendar mail"}
            ),
            ["mail", "calendar"],
        )


class TokenRefreshDecisionTests(unittest.TestCase):
    def test_missing_access_token_requires_refresh(self):
        self.assertTrue(
            token_service._is_access_token_refresh_required(
                access_token=None,
                expires_at_raw=None,
            )
        )

    def test_future_expiration_does_not_require_refresh(self):
        future_expiration = (
            datetime.now(timezone.utc) + timedelta(minutes=15)
        ).isoformat()

        self.assertFalse(
            token_service._is_access_token_refresh_required(
                access_token="access-token",
                expires_at_raw=future_expiration,
            )
        )

    def test_expired_token_requires_refresh(self):
        expired_at = (
            datetime.now(timezone.utc) - timedelta(minutes=15)
        ).isoformat()

        self.assertTrue(
            token_service._is_access_token_refresh_required(
                access_token="access-token",
                expires_at_raw=expired_at,
            )
        )

    def test_invalid_expiration_raises_value_error(self):
        with self.assertRaises(ValueError):
            token_service._is_access_token_refresh_required(
                access_token="access-token",
                expires_at_raw="invalid-date",
            )


class TokenAccessContractTests(unittest.TestCase):
    @patch(
        "apps.integrations.services.connection.token_service."
        "get_user_connection"
    )
    def test_rejects_connection_from_another_provider(
        self,
        get_user_connection_mock,
    ):
        get_user_connection_mock.return_value = {
            "provider": "microsoft",
            "status": "connected",
        }

        with self.assertRaisesRegex(
            IntegrationCredentialError,
            "belongs to another provider",
        ):
            token_service._get_valid_provider_access_token(
                user_id="user-id",
                connection_id="connection-id",
                expected_provider="google",
                refresh_token_function=lambda **kwargs: {},
                calculate_expiration_function=lambda value: None,
            )

    @patch(
        "apps.integrations.services.connection.token_service."
        "get_user_connection"
    )
    def test_rejects_inactive_connection(
        self,
        get_user_connection_mock,
    ):
        get_user_connection_mock.return_value = {
            "provider": "google",
            "status": "reauth_required",
        }

        with self.assertRaisesRegex(
            IntegrationCredentialError,
            "is not active",
        ):
            token_service._get_valid_provider_access_token(
                user_id="user-id",
                connection_id="connection-id",
                expected_provider="google",
                refresh_token_function=lambda **kwargs: {},
                calculate_expiration_function=lambda value: None,
            )

    @patch(
        "apps.integrations.services.connection.token_service."
        "mark_connection_reauth_required"
    )
    @patch(
        "apps.integrations.services.connection.token_service."
        "get_connection_credentials"
    )
    @patch(
        "apps.integrations.services.connection.token_service."
        "get_user_connection"
    )
    def test_invalid_expiration_marks_reauthorization(
        self,
        get_user_connection_mock,
        get_connection_credentials_mock,
        mark_reauth_mock,
    ):
        get_user_connection_mock.return_value = {
            "provider": "google",
            "status": "connected",
            "token_expires_at": "invalid-date",
        }
        get_connection_credentials_mock.return_value = {
            "access_token_ciphertext": "encrypted-access",
            "refresh_token_ciphertext": "encrypted-refresh",
        }

        with patch(
            "apps.integrations.services.connection.token_service."
            "decrypt_integration_secret",
            return_value="access-token",
        ):
            with self.assertRaisesRegex(
                IntegrationCredentialError,
                "Could not obtain valid Google credentials",
            ):
                token_service._get_valid_provider_access_token(
                    user_id="user-id",
                    connection_id="connection-id",
                    expected_provider="google",
                    refresh_token_function=lambda **kwargs: {},
                    calculate_expiration_function=lambda value: None,
                )

        mark_reauth_mock.assert_called_once_with(
            connection_id="connection-id",
            reason="Google token refresh failed.",
        )


if __name__ == "__main__":
    unittest.main()
