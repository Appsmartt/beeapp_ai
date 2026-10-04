from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.accounts.views import AuthenticatedAPIView
from apps.notifications.exceptions import PushDeviceError
from apps.notifications.services.notification_service import (
    register_push_device,
)
from apps.notifications.views import PushDeviceView


OWNER_USER_ID = "11111111-1111-4111-8111-111111111111"
ATTACKER_USER_ID = "22222222-2222-4222-8222-222222222222"
OWNER_SESSION_ID = "33333333-3333-4333-8333-333333333333"
REFRESHED_OWNER_SESSION_ID = "44444444-4444-4444-8444-444444444444"
ATTACKER_SESSION_ID = "55555555-5555-4555-8555-555555555555"
PUSH_TOKEN = "ExpoPushToken[owned-token]"
DEVICE_ID = "android-device-001"


def query_with_result(data):
    query = MagicMock()
    for method in (
        "select",
        "eq",
        "update",
        "insert",
        "maybe_single",
    ):
        getattr(query, method).return_value = query
    query.execute.return_value = SimpleNamespace(data=data)
    return query


class PushDeviceOwnershipServiceTests(SimpleTestCase):
    def test_creates_push_device_when_token_does_not_exist(self):
        lookup_query = query_with_result(None)
        insert_query = query_with_result(
            [{"id": "device-id", "user_id": OWNER_USER_ID}]
        )
        client = MagicMock()
        client.table.side_effect = [lookup_query, insert_query]

        with patch(
            "apps.notifications.services.notification_service.database.get_supabase",
            return_value=client,
        ):
            result = register_push_device(
                user_id=OWNER_USER_ID,
                device_session_id=OWNER_SESSION_ID,
                expo_push_token=PUSH_TOKEN,
                platform="android",
                device_id=DEVICE_ID,
                app_version="1.0.0",
            )

        self.assertEqual(result["user_id"], OWNER_USER_ID)
        insert_query.insert.assert_called_once()
        insert_payload = insert_query.insert.call_args.args[0]
        self.assertEqual(insert_payload["user_id"], OWNER_USER_ID)
        self.assertEqual(
            insert_payload["device_session_id"],
            OWNER_SESSION_ID,
        )
        self.assertEqual(insert_payload["expo_push_token"], PUSH_TOKEN)

    def test_owner_can_refresh_existing_push_device(self):
        existing_device = {
            "id": "device-id",
            "user_id": OWNER_USER_ID,
            "device_session_id": OWNER_SESSION_ID,
        }
        lookup_query = query_with_result(existing_device)
        update_query = query_with_result(
            [{"id": "device-id", "user_id": OWNER_USER_ID}]
        )
        client = MagicMock()
        client.table.side_effect = [lookup_query, update_query]

        with patch(
            "apps.notifications.services.notification_service.database.get_supabase",
            return_value=client,
        ):
            result = register_push_device(
                user_id=OWNER_USER_ID,
                device_session_id=REFRESHED_OWNER_SESSION_ID,
                expo_push_token=PUSH_TOKEN,
                platform="ios",
                device_id="ios-device-001",
                app_version="2.0.0",
            )

        self.assertEqual(result["user_id"], OWNER_USER_ID)
        update_query.update.assert_called_once()
        update_payload = update_query.update.call_args.args[0]
        self.assertNotIn("user_id", update_payload)
        self.assertNotIn("expo_push_token", update_payload)
        self.assertEqual(
            update_payload["device_session_id"],
            REFRESHED_OWNER_SESSION_ID,
        )
        self.assertEqual(update_query.eq.call_args_list[-1].args, (
            "user_id",
            OWNER_USER_ID,
        ))

    def test_owner_refresh_fails_when_atomic_owner_update_matches_no_row(self):
        existing_device = {
            "id": "device-id",
            "user_id": OWNER_USER_ID,
            "device_session_id": OWNER_SESSION_ID,
        }
        lookup_query = query_with_result(existing_device)
        update_query = query_with_result([])
        client = MagicMock()
        client.table.side_effect = [lookup_query, update_query]

        with patch(
            "apps.notifications.services.notification_service.database.get_supabase",
            return_value=client,
        ):
            with self.assertRaises(PushDeviceError):
                register_push_device(
                    user_id=OWNER_USER_ID,
                    device_session_id=REFRESHED_OWNER_SESSION_ID,
                    expo_push_token=PUSH_TOKEN,
                    platform="android",
                    device_id=DEVICE_ID,
                    app_version="1.0.0",
                )

        update_query.update.assert_called_once()
        self.assertEqual(update_query.eq.call_args_list[-1].args, (
            "user_id",
            OWNER_USER_ID,
        ))

    def test_rejects_existing_token_owned_by_another_user(self):
        lookup_query = query_with_result(
            {
                "id": "device-id",
                "user_id": OWNER_USER_ID,
                "device_session_id": OWNER_SESSION_ID,
            }
        )
        client = MagicMock()
        client.table.return_value = lookup_query

        with patch(
            "apps.notifications.services.notification_service.database.get_supabase",
            return_value=client,
        ):
            with self.assertRaises(PushDeviceError):
                register_push_device(
                    user_id=ATTACKER_USER_ID,
                    device_session_id=ATTACKER_SESSION_ID,
                    expo_push_token=PUSH_TOKEN,
                    platform="android",
                    device_id="attacker-device",
                    app_version="1.0.0",
                )

        lookup_query.update.assert_not_called()
        lookup_query.insert.assert_not_called()
        self.assertEqual(client.table.call_count, 1)

    def test_repeated_cross_account_attempts_never_update_token_owner(self):
        for attempt in range(20):
            with self.subTest(attempt=attempt):
                lookup_query = query_with_result(
                    {
                        "id": "device-id",
                        "user_id": OWNER_USER_ID,
                        "device_session_id": OWNER_SESSION_ID,
                    }
                )
                client = MagicMock()
                client.table.return_value = lookup_query

                with patch(
                    "apps.notifications.services.notification_service.database.get_supabase",
                    return_value=client,
                ):
                    with self.assertRaises(PushDeviceError):
                        register_push_device(
                            user_id=ATTACKER_USER_ID,
                            device_session_id=ATTACKER_SESSION_ID,
                            expo_push_token=PUSH_TOKEN,
                            platform="android",
                            device_id=f"attacker-device-{attempt}",
                            app_version="1.0.0",
                        )

                lookup_query.update.assert_not_called()
                lookup_query.insert.assert_not_called()
                self.assertEqual(client.table.call_count, 1)


class PushDeviceOwnershipViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth = patch.object(
            AuthenticatedAPIView,
            "get_authenticated_user",
            return_value=SimpleNamespace(id=OWNER_USER_ID),
        )
        self.mobile_session = patch(
            "apps.notifications.views."
            "get_active_mobile_device_session_for_auth_session",
            return_value={"id": OWNER_SESSION_ID},
        )
        self.auth.start()
        self.mobile_session.start()
        self.addCleanup(self.auth.stop)
        self.addCleanup(self.mobile_session.stop)

    def test_view_registers_push_device_for_authenticated_owner(self):
        device = {"id": "device-id", "user_id": OWNER_USER_ID}
        with patch(
            "apps.notifications.views.register_push_device",
            return_value=device,
        ) as register:
            request = self.factory.post(
                "/api/notifications/push-devices/",
                {
                    "expo_push_token": PUSH_TOKEN,
                    "platform": "android",
                    "device_id": DEVICE_ID,
                    "app_version": "1.0.0",
                },
                format="json",
                HTTP_AUTHORIZATION="Bearer owner-access-token",
            )
            response = PushDeviceView.as_view()(request)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data, {"device": device})
        register.assert_called_once_with(
            user_id=OWNER_USER_ID,
            device_session_id=OWNER_SESSION_ID,
            expo_push_token=PUSH_TOKEN,
            platform="android",
            device_id=DEVICE_ID,
            app_version="1.0.0",
        )

    def test_view_hides_cross_account_token_ownership_details(self):
        with patch(
            "apps.notifications.views.register_push_device",
            side_effect=PushDeviceError(
                "Push device ownership mismatch."
            ),
        ):
            request = self.factory.post(
                "/api/notifications/push-devices/",
                {
                    "expo_push_token": PUSH_TOKEN,
                    "platform": "android",
                },
                format="json",
                HTTP_AUTHORIZATION="Bearer attacker-access-token",
            )
            response = PushDeviceView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data,
            {"detail": "Could not register push device."},
        )
        self.assertNotIn("ownership", str(response.data).lower())
        self.assertNotIn(OWNER_USER_ID, str(response.data))
