from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialValidationError,
)
from apps.commercial.request_views import CommercialRequestsView
from apps.commercial.services.commercial_request_service import (
    get_commercial_request_detail,
)


class CommercialRequestDetailServiceTests(SimpleTestCase):
    request_id = "44444444-4444-4444-4444-444444444444"

    def test_rejects_missing_access_token(self):
        with self.assertRaises(CommercialAuthenticationError) as context:
            get_commercial_request_detail(
                access_token="",
                request_id=self.request_id,
            )

        self.assertEqual(
            context.exception.code,
            "AUTHENTICATION_REQUIRED",
        )

    def test_rejects_missing_request_id(self):
        with self.assertRaises(CommercialValidationError) as context:
            get_commercial_request_detail(
                access_token="token",
                request_id="",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCE_REQUEST_ID_REQUIRED",
        )

    @patch(
        "apps.commercial.services.commercial_request_service."
        "execute_commercial_rpc"
    )
    def test_calls_detail_rpc(self, execute_rpc):
        execute_rpc.return_value = {
            "id": self.request_id,
            "code": "BS-2026-00000001",
            "status": "submitted",
            "items": [],
        }

        result = get_commercial_request_detail(
            access_token="token",
            request_id=self.request_id,
        )

        self.assertEqual(result["id"], self.request_id)
        execute_rpc.assert_called_once_with(
            access_token="token",
            function_name="commerce_get_request_detail",
            parameters={
                "p_commerce_request_id": self.request_id,
            },
        )

    @patch(
        "apps.commercial.services.commercial_request_service."
        "execute_commercial_rpc"
    )
    def test_rejects_invalid_rpc_response(self, execute_rpc):
        execute_rpc.return_value = []

        with self.assertRaises(CommercialValidationError) as context:
            get_commercial_request_detail(
                access_token="token",
                request_id=self.request_id,
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCE_REQUEST_DETAIL_FAILED",
        )


class CommercialRequestDetailViewTests(SimpleTestCase):
    request_id = "44444444-4444-4444-4444-444444444444"

    @patch(
        "apps.commercial.request_views."
        "get_commercial_request_detail"
    )
    def test_get_returns_detail(self, get_detail):
        get_detail.return_value = {
            "id": self.request_id,
            "code": "BS-2026-00000001",
            "status": "submitted",
            "items": [],
        }

        request = APIRequestFactory().get(
            f"/api/commercial/requests/{self.request_id}/"
        )

        class User:
            id = "11111111-1111-1111-1111-111111111111"

        with patch.object(
            CommercialRequestsView,
            "get_authenticated_user_and_access_token",
            return_value=(User(), "authenticated-token"),
        ):
            response = CommercialRequestsView.as_view()(
                request,
                request_id=self.request_id,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["request"]["id"],
            self.request_id,
        )
        get_detail.assert_called_once_with(
            access_token="authenticated-token",
            request_id=self.request_id,
        )
