from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import jwt
from django.test import SimpleTestCase
from django.utils import timezone

from apps.accounts.exceptions import DeviceSessionError
from apps.accounts.services import device_sessions


USER_ID = "11111111-1111-4111-8111-111111111111"
DEVICE_SESSION_ID = "22222222-2222-4222-8222-222222222222"
AUTH_SESSION_ID = "33333333-3333-4333-8333-333333333333"
ACCESS_TOKEN = "header.payload.signature"
SESSION_TOKEN = "mobile-session-token"


def query_with_result(data):
    query = MagicMock()
    for method_name in (
        "select",
        "eq",
        "is_",
        "single",
        "order",
        "update",
        "insert",
    ):
        getattr(query, method_name).return_value = query
    query.execute.return_value = SimpleNamespace(data=data)
    return query


class DeviceSessionTokenUtilityTests(SimpleTestCase):
    def test_hash_token_is_deterministic_and_does_not_return_plaintext(self):
        first_hash = device_sessions.hash_token(SESSION_TOKEN)
        second_hash = device_sessions.hash_token(SESSION_TOKEN)

        self.assertEqual(first_hash, second_hash)
        self.assertNotEqual(first_hash, SESSION_TOKEN)
        self.assertEqual(len(first_hash), 64)

    def test_request_metadata_uses_server_values_and_optional_headers(self):
        request = SimpleNamespace(
            META={
                "REMOTE_ADDR": "203.0.113.20",
                "HTTP_X_FORWARDED_FOR": "198.51.100.20, 203.0.113.20",
            },
            headers={
                "User-Agent": "BeeAppMobile/1.0",
                "X-Platform": "android",
                "X-Browser": "BeeApp",
            },
        )

        metadata = device_sessions.get_request_session_metadata(request)

        self.assertEqual(metadata["ip_address"], "198.51.100.20")
        self.assertEqual(metadata["platform"], "android")
        self.assertEqual(metadata["browser"], "BeeApp")
        self.assertEqual(metadata["user_agent"], "BeeAppMobile/1.0")

    @patch("apps.accounts.services.device_sessions.token_utils.jwt.decode")
    def test_auth_session_id_reads_validated_claim(self, decode):
        decode.return_value = {"session_id": AUTH_SESSION_ID}

        result = device_sessions.get_supabase_auth_session_id(
            access_token=ACCESS_TOKEN,
        )

        self.assertEqual(result, AUTH_SESSION_ID)
        decode.assert_called_once_with(
            ACCESS_TOKEN,
            options={
                "verify_signature": False,
                "verify_exp": False,
                "verify_aud": False,
            },
        )

    @patch("apps.accounts.services.device_sessions.token_utils.jwt.decode")
    def test_auth_session_id_rejects_missing_claim(self, decode):
        decode.return_value = {}

        with self.assertRaises(DeviceSessionError):
            device_sessions.get_supabase_auth_session_id(
                access_token=ACCESS_TOKEN,
            )


class DeviceSessionAccessTests(SimpleTestCase):
    @patch(
        "apps.accounts.services.device_sessions.session_access."
        "get_supabase_admin_client"
    )
    def test_active_mobile_session_is_returned_for_matching_auth_session(
        self,
        get_client,
    ):
        expires_at = (timezone.now() + timedelta(days=1)).isoformat()
        session = {
            "id": DEVICE_SESSION_ID,
            "user_id": USER_ID,
            "device_type": "MOBILE",
            "is_active": True,
            "revoked_at": None,
            "expires_at": expires_at,
            "auth_session_id": AUTH_SESSION_ID,
        }
        query = query_with_result(session)
        client = MagicMock()
        client.table.return_value = query
        get_client.return_value = client

        with patch(
            "apps.accounts.services.device_sessions.session_access."
            "get_supabase_auth_session_id",
            return_value=AUTH_SESSION_ID,
        ):
            result = (
                device_sessions
                .get_active_mobile_device_session_for_auth_session(
                    user_id=USER_ID,
                    access_token=ACCESS_TOKEN,
                )
            )

        self.assertEqual(result, session)
        query.eq.assert_any_call("user_id", USER_ID)
        query.eq.assert_any_call("device_type", "MOBILE")
        query.eq.assert_any_call("auth_session_id", AUTH_SESSION_ID)
        query.eq.assert_any_call("is_active", True)
        query.is_.assert_called_once_with("revoked_at", "null")

    @patch(
        "apps.accounts.services.device_sessions.session_access."
        "revoke_device_session_by_id"
    )
    @patch(
        "apps.accounts.services.device_sessions.session_access."
        "get_supabase_admin_client"
    )
    def test_expired_mobile_session_is_revoked_and_rejected(
        self,
        get_client,
        revoke,
    ):
        session = {
            "id": DEVICE_SESSION_ID,
            "user_id": USER_ID,
            "device_type": "MOBILE",
            "is_active": True,
            "revoked_at": None,
            "expires_at": (timezone.now() - timedelta(seconds=1)).isoformat(),
            "auth_session_id": AUTH_SESSION_ID,
        }
        query = query_with_result(session)
        client = MagicMock()
        client.table.return_value = query
        get_client.return_value = client

        with patch(
            "apps.accounts.services.device_sessions.session_access."
            "get_supabase_auth_session_id",
            return_value=AUTH_SESSION_ID,
        ):
            with self.assertRaises(DeviceSessionError):
                (
                    device_sessions
                    .get_active_mobile_device_session_for_auth_session(
                        user_id=USER_ID,
                        access_token=ACCESS_TOKEN,
                    )
                )

        revoke.assert_called_once_with(device_id=DEVICE_SESSION_ID)


class DeviceSessionCreationTests(SimpleTestCase):
    @patch(
        "apps.accounts.services.device_sessions.session_creation."
        "get_supabase_admin_client"
    )
    def test_replaces_mobile_session_and_normalizes_revoked_values(
        self,
        get_client,
    ):
        response_data = {
            "id": DEVICE_SESSION_ID,
            "revoked_push_tokens": [
                "ExpoPushToken[first]",
                "",
                "ExpoPushToken[first]",
                " ExpoPushToken[second] ",
            ],
            "revoked_device_session_ids": [
                "old-session",
                "",
                "old-session",
                " old-session-two ",
            ],
        }
        client = MagicMock()
        client.rpc.return_value.execute.return_value = SimpleNamespace(
            data=response_data,
        )
        get_client.return_value = client
        request = SimpleNamespace(
            META={"REMOTE_ADDR": "203.0.113.20"},
            headers={"User-Agent": "BeeAppMobile/1.0"},
        )

        with patch(
            "apps.accounts.services.device_sessions.session_creation."
            "get_supabase_auth_session_id",
            return_value=AUTH_SESSION_ID,
        ), patch(
            "apps.accounts.services.device_sessions.session_creation."
            "get_request_session_metadata",
            return_value={
                "platform": "android",
                "browser": "BeeApp",
                "ip_address": "203.0.113.20",
                "user_agent": "BeeAppMobile/1.0",
            },
        ):
            result = (
                device_sessions.create_or_replace_mobile_device_session(
                    user_id=USER_ID,
                    access_token=ACCESS_TOKEN,
                    request=request,
                )
            )

        self.assertEqual(
            result["revoked_push_tokens"],
            ["ExpoPushToken[first]", "ExpoPushToken[second]"],
        )
        self.assertEqual(
            result["revoked_device_session_ids"],
            ["old-session", "old-session-two"],
        )
        client.rpc.assert_called_once()
        rpc_name, rpc_payload = client.rpc.call_args.args
        self.assertEqual(
            rpc_name,
            "replace_mobile_device_session_with_revocation",
        )
        self.assertEqual(rpc_payload["p_user_id"], USER_ID)
        self.assertEqual(rpc_payload["p_auth_session_id"], AUTH_SESSION_ID)
        self.assertEqual(
            rpc_payload["p_device_name"],
            "BeeApp Mobile",
        )

    @patch(
        "apps.accounts.services.device_sessions.session_creation."
        "get_supabase_admin_client"
    )
    def test_mobile_replacement_requires_rpc_response(self, get_client):
        client = MagicMock()
        client.rpc.return_value.execute.return_value = SimpleNamespace(
            data=[],
        )
        get_client.return_value = client
        request = SimpleNamespace(META={}, headers={})

        with patch(
            "apps.accounts.services.device_sessions.session_creation."
            "get_supabase_auth_session_id",
            return_value=AUTH_SESSION_ID,
        ), patch(
            "apps.accounts.services.device_sessions.session_creation."
            "get_request_session_metadata",
            return_value={
                "platform": None,
                "browser": None,
                "ip_address": None,
                "user_agent": None,
            },
        ):
            with self.assertRaises(DeviceSessionError):
                device_sessions.create_or_replace_mobile_device_session(
                    user_id=USER_ID,
                    access_token=ACCESS_TOKEN,
                    request=request,
                )


class DeviceSessionRefreshTests(SimpleTestCase):
    @patch(
        "apps.accounts.services.device_sessions.session_refresh."
        "get_supabase_admin_client"
    )
    @patch(
        "apps.accounts.services.device_sessions.session_refresh."
        "get_active_session_by_token"
    )
    def test_refresh_rotates_mobile_token_in_repeated_cycles(
        self,
        get_active_session,
        get_client,
    ):
        get_active_session.return_value = {
            "id": DEVICE_SESSION_ID,
            "device_type": "MOBILE",
        }
        query = query_with_result([{"id": DEVICE_SESSION_ID}])
        client = MagicMock()
        client.table.return_value = query
        get_client.return_value = client

        generated_tokens = set()

        for _ in range(20):
            result = device_sessions.refresh_mobile_device_session(
                session_token=SESSION_TOKEN,
            )
            generated_tokens.add(result["token"])
            self.assertNotEqual(result["token"], SESSION_TOKEN)
            self.assertIn("expires_at", result)

        self.assertEqual(len(generated_tokens), 20)
        self.assertEqual(get_active_session.call_count, 20)
        self.assertEqual(query.update.call_count, 20)

    @patch(
        "apps.accounts.services.device_sessions.session_refresh."
        "get_active_session_by_token"
    )
    def test_refresh_rejects_non_mobile_session(self, get_active_session):
        get_active_session.return_value = {
            "id": DEVICE_SESSION_ID,
            "device_type": "WEB",
        }

        with self.assertRaises(DeviceSessionError):
            device_sessions.refresh_mobile_device_session(
                session_token=SESSION_TOKEN,
            )


class DeviceSessionPublicContractTests(SimpleTestCase):
    def test_public_contract_exports_all_legacy_symbols(self):
        expected_names = {
            "create_device_session",
            "create_mobile_device_session",
            "create_or_replace_mobile_device_session",
            "create_web_device_session",
            "get_active_mobile_device_session_for_auth_session",
            "get_active_session_by_token",
            "get_browser_name",
            "get_device_name",
            "get_platform_name",
            "get_request_ip",
            "get_request_session_metadata",
            "get_supabase_auth_session_id",
            "get_user_device_sessions",
            "hash_token",
            "parse_timestamp",
            "refresh_mobile_device_session",
            "revoke_all_user_device_sessions",
            "revoke_device_session_by_id",
            "update_device_metadata",
            "update_web_device_metadata",
        }

        self.assertEqual(set(device_sessions.__all__), expected_names)
