from __future__ import annotations

from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, call, patch

from apps.mail.services.mail_integration_link import (
    get_mail_integration,
    list_mail_integrations,
    sync_mail_integration_for_user_connection,
    sync_mail_integration_from_connection,
    sync_user_mail_integrations_from_connections,
)
from apps.mail.services.mail_integration_link.status_service import (
    derive_mail_status,
)


class MailIntegrationLinkContractTests(TestCase):
    def setUp(self) -> None:
        self.connection = {
            "id": "connection-1",
            "user_id": "user-1",
            "provider": "google",
            "provider_account_id": "account-1",
            "provider_email": "user@example.com",
            "provider_display_name": "User",
            "status": "connected",
            "capabilities": ["mail"],
            "granted_scopes": [
                "https://www.googleapis.com/auth/gmail.modify"
            ],
            "created_at": "2026-01-01T00:00:00+00:00",
        }

    def test_public_api_is_callable(self) -> None:
        public_functions = (
            get_mail_integration,
            list_mail_integrations,
            sync_mail_integration_for_user_connection,
            sync_mail_integration_from_connection,
            sync_user_mail_integrations_from_connections,
        )

        self.assertTrue(all(callable(item) for item in public_functions))

    def test_connected_google_mail_status_is_active(self) -> None:
        self.assertEqual(
            derive_mail_status(connection=self.connection),
            ("active", None, None),
        )

    def test_missing_scope_requires_reauthorization(self) -> None:
        connection = {**self.connection, "granted_scopes": []}

        status, code, message = derive_mail_status(
            connection=connection
        )

        self.assertEqual(status, "reauth_required")
        self.assertEqual(code, "missing_mail_scope")
        self.assertIn("reconexión", message or "")

    def test_disconnected_connection_preserves_safe_state(self) -> None:
        status, code, message = derive_mail_status(
            connection={**self.connection, "status": "disconnected"}
        )

        self.assertEqual(status, "disconnected")
        self.assertIsNone(code)
        self.assertIsNone(message)

    @patch(
        "apps.mail.services.mail_integration_link."
        "synchronization_service.utc_now_iso",
        return_value="2026-10-04T16:53:00+00:00",
    )
    @patch(
        "apps.mail.services.mail_integration_link."
        "synchronization_service.get_supabase"
    )
    def test_sync_inserts_active_integration_for_one_hundred_cycles(
        self,
        mocked_get_supabase,
        mocked_now,
    ) -> None:
        table = Mock()
        connection_response = SimpleNamespace(data=self.connection)
        existing_response = SimpleNamespace(data=None)
        insert_response = SimpleNamespace(data={"id": "integration-1"})

        (
            table.select.return_value.eq.return_value
            .maybe_single.return_value.execute
        ).side_effect = [
            connection_response,
            existing_response,
        ] * 100
        table.insert.return_value.execute.return_value = insert_response
        mocked_get_supabase.return_value.table.return_value = table

        for _ in range(100):
            result = sync_mail_integration_from_connection(
                connection_id="connection-1"
            )
            self.assertEqual(result, {"id": "integration-1"})

        self.assertEqual(table.insert.call_count, 100)
        self.assertEqual(table.update.call_count, 0)
        payload = table.insert.call_args.args[0]
        self.assertEqual(payload["user_id"], "user-1")
        self.assertEqual(payload["status"], "active")
        self.assertNotIn("access_token", str(payload))
        self.assertNotIn("refresh_token", str(payload))
        mocked_now.assert_called()

    @patch(
        "apps.mail.services.mail_integration_link."
        "synchronization_service.utc_now_iso",
        return_value="2026-10-04T16:53:00+00:00",
    )
    @patch(
        "apps.mail.services.mail_integration_link."
        "synchronization_service.get_supabase"
    )
    def test_sync_updates_and_preserves_existing_metadata(
        self,
        mocked_get_supabase,
        mocked_now,
    ) -> None:
        table = Mock()
        connection_response = SimpleNamespace(data=self.connection)
        existing_response = SimpleNamespace(
            data={
                "id": "integration-1",
                "metadata": {"preserved_key": "preserved_value"},
            }
        )
        update_response = SimpleNamespace(data={"id": "integration-1"})

        (
            table.select.return_value.eq.return_value
            .maybe_single.return_value.execute
        ).side_effect = [connection_response, existing_response]
        table.update.return_value.eq.return_value.execute.return_value = (
            update_response
        )
        mocked_get_supabase.return_value.table.return_value = table

        result = sync_mail_integration_from_connection(
            connection_id="connection-1"
        )

        self.assertEqual(result, {"id": "integration-1"})
        table.insert.assert_not_called()
        table.update.assert_called_once()
        updated_payload = table.update.call_args.args[0]
        self.assertEqual(
            updated_payload["metadata"]["preserved_key"],
            "preserved_value",
        )
        self.assertEqual(updated_payload["status"], "active")
        mocked_now.assert_called_once()

    @patch(
        "apps.mail.services.mail_integration_link."
        "synchronization_service.get_supabase"
    )
    def test_user_sync_rejects_connection_owned_by_another_user(
        self,
        mocked_get_supabase,
    ) -> None:
        table = Mock()
        (
            table.select.return_value.eq.return_value.eq.return_value
            .maybe_single.return_value.execute.return_value
        ) = SimpleNamespace(data=None)
        mocked_get_supabase.return_value.table.return_value = table

        result = sync_mail_integration_for_user_connection(
            user_id="user-1",
            connection_id="connection-2",
        )

        self.assertIsNone(result)

    @patch(
        "apps.mail.services.mail_integration_link."
        "query_service.get_supabase"
    )
    def test_get_integration_keeps_owner_filter(
        self,
        mocked_get_supabase,
    ) -> None:
        integration = {
            "id": "integration-1",
            "user_id": "user-1",
            "integration_connection_id": "connection-1",
            "provider": "google",
            "status": "active",
            "metadata": {},
        }
        table = Mock()
        (
            table.select.return_value.eq.return_value.eq.return_value
            .maybe_single.return_value.execute.return_value
        ) = SimpleNamespace(data=integration)
        mocked_get_supabase.return_value.table.return_value = table

        with patch(
            "apps.mail.services.mail_integration_link."
            "query_service.get_connection_map",
            return_value={},
        ):
            result = get_mail_integration(
                user_id="user-1",
                integration_id="integration-1",
            )

        self.assertEqual(result["id"], "integration-1")
        self.assertTrue(result["can_sync"])
        self.assertIn(
            call.select().eq("id", "integration-1"),
            table.mock_calls,
        )
        self.assertIn(
            call.select().eq().eq("user_id", "user-1"),
            table.mock_calls,
        )

    @patch(
        "apps.mail.services.mail_integration_link."
        "query_service.get_supabase"
    )
    def test_list_filters_inactive_integrations_when_requested(
        self,
        mocked_get_supabase,
    ) -> None:
        table = Mock()
        (
            table.select.return_value.eq.return_value.order.return_value
            .eq.return_value.execute.return_value
        ) = SimpleNamespace(data=[])
        mocked_get_supabase.return_value.table.return_value = table

        result = list_mail_integrations(
            user_id="user-1",
            provider="google",
            include_inactive=False,
        )

        self.assertEqual(result, [])
        self.assertIn(
            call.select().eq("user_id", "user-1"),
            table.mock_calls,
        )
        self.assertIn(
            call.select().eq().order().eq("provider", "google"),
            table.mock_calls,
        )
        self.assertIn(
            call.select().eq().order().eq().eq("status", "active"),
            table.mock_calls,
        )
