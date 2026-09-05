from __future__ import annotations

from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialValidationError
from apps.commercial.services.commercial_notification_service import (
    process_commercial_notifications,
)


class CommercialNotificationServiceTests(SimpleTestCase):
    @patch(
        "apps.commercial.services.commercial_notification_service."
        "create_module_notification"
    )
    @patch(
        "apps.commercial.services.commercial_notification_service."
        "get_supabase_admin_client"
    )
    def test_pending_delivery_creates_in_app_notification(
        self,
        get_client,
        create_notification,
    ):
        client = MagicMock()
        get_client.return_value = client

        client.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
            {
                "id": "delivery-1",
                "recipient_profile_id": "recipient-1",
                "dedupe_key": "commerce:delivery-1",
                "event_type": "request_submitted",
                "payload": {
                    "request_id": "request-1",
                    "business_id": "business-1",
                },
            }
        ]

        client.table.return_value.select.return_value.eq.return_value.eq.return_value.contains.return_value.order.return_value.limit.return_value.execute.return_value.data = []

        client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"id": "delivery-1"}
        ]

        create_notification.return_value = {
            "id": "notification-1",
            "push_sent_at": None,
        }

        result = process_commercial_notifications(limit=1)

        self.assertEqual(result["loaded_count"], 1)
        self.assertEqual(result["created_count"], 1)
        self.assertEqual(result["sent_count"], 0)
        self.assertEqual(result["failed_count"], 0)

        create_notification.assert_called_once_with(
            recipient_id="recipient-1",
            module="beeservices",
            notification_type="request_submitted",
            title="Nueva solicitud comercial",
            body="Recibiste una nueva solicitud en tu negocio.",
            metadata={
                "request_id": "request-1",
                "business_id": "business-1",
                "idempotency_key": "commerce:delivery-1",
                "commerce_delivery_id": "delivery-1",
            },
            send_push=False,
        )

    @patch(
        "apps.commercial.services.commercial_notification_service."
        "get_supabase_admin_client"
    )
    def test_pending_delivery_reuses_existing_notification(
        self,
        get_client,
    ):
        client = MagicMock()
        get_client.return_value = client

        client.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
            {
                "id": "delivery-1",
                "recipient_profile_id": "recipient-1",
                "dedupe_key": "commerce:delivery-1",
                "event_type": "request_accepted",
                "payload": {},
            }
        ]

        client.table.return_value.select.return_value.eq.return_value.eq.return_value.contains.return_value.order.return_value.limit.return_value.execute.return_value.data = [
            {
                "id": "notification-existing",
                "push_sent_at": "2026-09-05T07:00:00+00:00",
                "push_error": None,
            }
        ]

        client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"id": "delivery-1"}
        ]

        result = process_commercial_notifications(limit=1)

        self.assertEqual(result["loaded_count"], 1)
        self.assertEqual(result["created_count"], 0)
        self.assertEqual(result["sent_count"], 1)
        self.assertEqual(
            result["reused_existing_notification_count"],
            1,
        )
        self.assertTrue(
            result["results"][0]["reused_existing_notification"]
        )

    @patch(
        "apps.commercial.services.commercial_notification_service."
        "get_supabase_admin_client"
    )
    def test_invalid_pending_delivery_is_marked_failed(
        self,
        get_client,
    ):
        client = MagicMock()
        get_client.return_value = client

        client.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
            {
                "id": "delivery-1",
                "recipient_profile_id": "",
                "dedupe_key": "commerce:delivery-1",
                "event_type": "request_submitted",
                "payload": {},
            }
        ]

        client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"id": "delivery-1"}
        ]

        result = process_commercial_notifications(limit=1)

        self.assertEqual(result["loaded_count"], 1)
        self.assertEqual(result["failed_count"], 1)
        self.assertEqual(result["results"][0]["status"], "failed")
        self.assertEqual(
            result["results"][0]["error_code"],
            "COMMERCIAL_NOTIFICATION_DELIVERY_INVALID",
        )

    def test_rejects_invalid_limit(self):
        with self.assertRaises(CommercialValidationError) as context:
            process_commercial_notifications(limit=0)

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_NOTIFICATION_LIMIT_INVALID",
        )
