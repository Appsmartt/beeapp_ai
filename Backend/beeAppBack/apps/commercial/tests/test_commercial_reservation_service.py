from __future__ import annotations

from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialValidationError
from apps.commercial.services.commercial_reservation_service import (
    create_commercial_reservation_hold,
)


class CommercialReservationHoldServiceTests(SimpleTestCase):
    @patch(
        "apps.commercial.services.commercial_reservation_service."
        "execute_commercial_rpc"
    )
    def test_calls_atomic_reservation_hold_rpc(self, execute_rpc):
        execute_rpc.return_value = "reservation-123"

        result = create_commercial_reservation_hold(
            access_token="token",
            commerce_request_id="request-123",
            starts_at="2026-09-10T15:00:00-05:00",
            timezone="America/Bogota",
        )

        execute_rpc.assert_called_once_with(
            access_token="token",
            function_name="commerce_create_reservation_hold",
            parameters={
                "p_commerce_request_id": "request-123",
                "p_starts_at": "2026-09-10T15:00:00-05:00",
                "p_timezone": "America/Bogota",
            },
        )

        self.assertEqual(
            result,
            {
                "reservation_id": "reservation-123",
                "request_id": "request-123",
                "status": "hold",
            },
        )

    def test_rejects_naive_datetime(self):
        with self.assertRaises(CommercialValidationError) as context:
            create_commercial_reservation_hold(
                access_token="token",
                commerce_request_id="request-123",
                starts_at="2026-09-10T15:00:00",
                timezone="America/Bogota",
            )

        self.assertEqual(
            context.exception.code,
            "reservation_starts_at_timezone_required",
        )

    def test_rejects_blank_timezone(self):
        with self.assertRaises(CommercialValidationError) as context:
            create_commercial_reservation_hold(
                access_token="token",
                commerce_request_id="request-123",
                starts_at="2026-09-10T15:00:00-05:00",
                timezone=" ",
            )

        self.assertEqual(
            context.exception.code,
            "reservation_timezone_required",
        )

    @patch(
        "apps.commercial.services.commercial_reservation_service."
        "execute_commercial_rpc"
    )
    def test_rejects_invalid_rpc_response(self, execute_rpc):
        execute_rpc.return_value = None

        with self.assertRaises(CommercialValidationError) as context:
            create_commercial_reservation_hold(
                access_token="token",
                commerce_request_id="request-123",
                starts_at="2026-09-10T15:00:00-05:00",
                timezone="America/Bogota",
            )

        self.assertEqual(
            context.exception.code,
            "reservation_hold_response_invalid",
        )


class CommercialReservationHoldViewTests(SimpleTestCase):
    @patch(
        "apps.commercial.reservation_views."
        "create_commercial_reservation_hold"
    )
    def test_view_uses_authenticated_access_token(self, create_hold):
        from rest_framework.test import APIRequestFactory

        from apps.commercial.reservation_views import (
            CommercialReservationHoldView,
        )

        create_hold.return_value = {
            "reservation_id": "reservation-123",
            "request_id": "request-123",
            "status": "hold",
        }

        class User:
            id = "user-123"
            email = "client@example.com"

        request = APIRequestFactory().post(
            "/api/commercial/requests/request-123/reservation-hold/",
            {
                "starts_at": "2026-09-10T15:00:00-05:00",
                "timezone": "America/Bogota",
            },
            format="json",
        )

        with patch.object(
            CommercialReservationHoldView,
            "get_authenticated_user_and_access_token",
            return_value=(User(), "authenticated-token"),
        ):
            response = CommercialReservationHoldView.as_view()(
                request,
                request_id="request-123",
            )

        self.assertEqual(response.status_code, 201)
        create_hold.assert_called_once_with(
            access_token="authenticated-token",
            commerce_request_id="request-123",
            starts_at="2026-09-10T20:00:00+00:00",
            timezone="America/Bogota",
        )
