from __future__ import annotations

from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialValidationError
from apps.commercial.services.commercial_maintenance_service import (
    expire_commercial_reservation_holds,
    expire_commercial_submitted_requests,
    run_commercial_expirations,
)


class CommercialMaintenanceServiceTests(SimpleTestCase):
    @patch(
        "apps.commercial.services.commercial_maintenance_service."
        "get_supabase_admin_client"
    )
    def test_expires_reservation_holds_with_limit(self, get_client):
        client = MagicMock()
        get_client.return_value = client
        client.rpc.return_value.execute.return_value.data = [
            {
                "commerce_reservation_id": "reservation-1",
                "commerce_request_id": "request-1",
                "commercial_profile_id": "business-1",
            }
        ]

        rows = expire_commercial_reservation_holds(limit=25)

        client.rpc.assert_called_once_with(
            "commerce_expire_reservation_holds",
            {"p_limit": 25},
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(
            rows[0]["commerce_reservation_id"],
            "reservation-1",
        )

    @patch(
        "apps.commercial.services.commercial_maintenance_service."
        "get_supabase_admin_client"
    )
    def test_expires_submitted_requests_with_limit(self, get_client):
        client = MagicMock()
        get_client.return_value = client
        client.rpc.return_value.execute.return_value.data = [
            {
                "commerce_request_id": "request-1",
                "expired_hold_count": 2,
            }
        ]

        rows = expire_commercial_submitted_requests(limit=10)

        client.rpc.assert_called_once_with(
            "commerce_expire_submitted_requests",
            {"p_limit": 10},
        )
        self.assertEqual(rows[0]["expired_hold_count"], 2)

    def test_rejects_limit_outside_platform_range(self):
        with self.assertRaises(CommercialValidationError) as context:
            expire_commercial_reservation_holds(limit=0)

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_EXPIRATION_LIMIT_INVALID",
        )

    @patch(
        "apps.commercial.services.commercial_maintenance_service."
        "expire_commercial_submitted_requests"
    )
    @patch(
        "apps.commercial.services.commercial_maintenance_service."
        "expire_commercial_reservation_holds"
    )
    def test_run_returns_idempotent_summary(
        self,
        expire_holds,
        expire_requests,
    ):
        expire_holds.return_value = []
        expire_requests.return_value = []

        result = run_commercial_expirations(limit=10)

        self.assertEqual(
            result["expired_reservation_hold_count"],
            0,
        )
        self.assertEqual(result["expired_request_count"], 0)
        expire_holds.assert_called_once_with(limit=10)
        expire_requests.assert_called_once_with(limit=10)
