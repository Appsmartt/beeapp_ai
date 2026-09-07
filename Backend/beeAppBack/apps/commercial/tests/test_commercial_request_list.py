from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialValidationError,
)
from apps.commercial.request_views import CommercialRequestsView
from apps.commercial.services.commercial_request_service import (
    list_commercial_requests,
)


class CommercialRequestListServiceTests(SimpleTestCase):
    request_id = "44444444-4444-4444-4444-444444444444"

    def test_rejects_missing_access_token(self):
        with self.assertRaises(CommercialAuthenticationError) as context:
            list_commercial_requests(
                access_token="",
            )

        self.assertEqual(
            context.exception.code,
            "AUTHENTICATION_REQUIRED",
        )

    @patch(
        "apps.commercial.services.commercial_request_service."
        "execute_commercial_rpc"
    )
    def test_calls_list_rpc_with_client_scope_and_pagination(
        self,
        execute_rpc,
    ):
        execute_rpc.return_value = [
            {
                "id": self.request_id,
                "status": "submitted",
            }
        ]

        result = list_commercial_requests(
            access_token="token",
            statuses=["submitted", "under_review"],
            limit=20,
            offset=40,
        )

        self.assertEqual(result[0]["id"], self.request_id)
        execute_rpc.assert_called_once_with(
            access_token="token",
            function_name="commerce_list_requests",
            parameters={
                "p_scope": "client",
                "p_statuses": ["submitted", "under_review"],
                "p_limit": 20,
                "p_offset": 40,
            },
        )

    @patch(
        "apps.commercial.services.commercial_request_service."
        "execute_commercial_rpc"
    )
    def test_sends_null_statuses_when_no_filter_is_selected(
        self,
        execute_rpc,
    ):
        execute_rpc.return_value = []

        result = list_commercial_requests(
            access_token="token",
        )

        self.assertEqual(result, [])
        execute_rpc.assert_called_once_with(
            access_token="token",
            function_name="commerce_list_requests",
            parameters={
                "p_scope": "client",
                "p_statuses": None,
                "p_limit": 25,
                "p_offset": 0,
            },
        )

    @patch(
        "apps.commercial.services.commercial_request_service."
        "execute_commercial_rpc"
    )
    def test_normalizes_empty_rpc_result_to_empty_list(
        self,
        execute_rpc,
    ):
        execute_rpc.return_value = None

        result = list_commercial_requests(
            access_token="token",
        )

        self.assertEqual(result, [])

    @patch(
        "apps.commercial.services.commercial_request_service."
        "execute_commercial_rpc"
    )
    def test_rejects_non_list_rpc_result(
        self,
        execute_rpc,
    ):
        execute_rpc.return_value = {
            "id": self.request_id,
        }

        with self.assertRaises(CommercialValidationError) as context:
            list_commercial_requests(
                access_token="token",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCE_REQUEST_LIST_FAILED",
        )

    @patch(
        "apps.commercial.services.commercial_request_service."
        "execute_commercial_rpc"
    )
    def test_rejects_rpc_result_with_non_object_rows(
        self,
        execute_rpc,
    ):
        execute_rpc.return_value = [
            {
                "id": self.request_id,
            },
            "invalid-row",
        ]

        with self.assertRaises(CommercialValidationError) as context:
            list_commercial_requests(
                access_token="token",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCE_REQUEST_LIST_FAILED",
        )


class CommercialRequestListViewTests(SimpleTestCase):
    request_id = "44444444-4444-4444-4444-444444444444"

    @patch(
        "apps.commercial.request_views.list_commercial_requests"
    )
    def test_get_returns_paginated_request_list(
        self,
        list_requests,
    ):
        list_requests.return_value = [
            {
                "id": self.request_id,
                "code": "BS-2026-00000001",
                "status": "submitted",
            }
        ]

        request = APIRequestFactory().get(
            "/api/commercial/requests/?limit=10&offset=20"
        )

        class User:
            id = "11111111-1111-1111-1111-111111111111"

        with patch.object(
            CommercialRequestsView,
            "get_authenticated_user_and_access_token",
            return_value=(User(), "authenticated-token"),
        ):
            response = CommercialRequestsView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["requests"][0]["id"],
            self.request_id,
        )
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["limit"], 10)
        self.assertEqual(response.data["offset"], 20)

        list_requests.assert_called_once_with(
            access_token="authenticated-token",
            statuses=None,
            limit=10,
            offset=20,
        )

    @patch(
        "apps.commercial.request_views.list_commercial_requests"
    )
    def test_get_forwards_repeated_status_filters(
        self,
        list_requests,
    ):
        list_requests.return_value = []

        request = APIRequestFactory().get(
            "/api/commercial/requests/"
            "?status=submitted&status=under_review"
        )

        class User:
            id = "11111111-1111-1111-1111-111111111111"

        with patch.object(
            CommercialRequestsView,
            "get_authenticated_user_and_access_token",
            return_value=(User(), "authenticated-token"),
        ):
            response = CommercialRequestsView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["requests"], [])
        self.assertEqual(response.data["count"], 0)

        list_requests.assert_called_once_with(
            access_token="authenticated-token",
            statuses=["submitted", "under_review"],
            limit=25,
            offset=0,
        )

    def test_get_rejects_invalid_limit(self):
        request = APIRequestFactory().get(
            "/api/commercial/requests/?limit=0"
        )

        class User:
            id = "11111111-1111-1111-1111-111111111111"

        with patch.object(
            CommercialRequestsView,
            "get_authenticated_user_and_access_token",
            return_value=(User(), "authenticated-token"),
        ):
            response = CommercialRequestsView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("limit", response.data)

    def test_get_rejects_invalid_offset(self):
        request = APIRequestFactory().get(
            "/api/commercial/requests/?offset=-1"
        )

        class User:
            id = "11111111-1111-1111-1111-111111111111"

        with patch.object(
            CommercialRequestsView,
            "get_authenticated_user_and_access_token",
            return_value=(User(), "authenticated-token"),
        ):
            response = CommercialRequestsView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("offset", response.data)
