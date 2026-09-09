from unittest.mock import patch

from django.test import SimpleTestCase


class CommercialRequestFormalDetailViewTests(SimpleTestCase):
    request_id = "11111111-1111-1111-1111-111111111111"

    @patch(
        "apps.commercial.request_operations_views."
        "get_commercial_request_formal_detail"
    )
    def test_returns_formal_detail_with_authenticated_token(
        self,
        get_formal_detail,
    ):
        from rest_framework.test import APIRequestFactory

        from apps.commercial.request_operations_views import (
            CommercialRequestFormalDetailView,
        )

        get_formal_detail.return_value = {
            "request": {
                "id": self.request_id,
            },
            "context": {
                "business": {
                    "timezone": "America/Bogota",
                },
                "permissions": {},
                "timeline": {
                    "request_id": self.request_id,
                    "proposals": [],
                    "events": [],
                },
                "payment_proofs": [],
                "reservation": None,
                "dispute": None,
            },
        }

        class User:
            id = "user-123"
            email = "client@example.com"

        request = APIRequestFactory().get(
            f"/api/commercial/requests/{self.request_id}/formal-detail/"
        )

        with patch.object(
            CommercialRequestFormalDetailView,
            "get_authenticated_user_and_access_token",
            return_value=(User(), "authenticated-token"),
        ):
            response = CommercialRequestFormalDetailView.as_view()(
                request,
                request_id=self.request_id,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["request"]["id"],
            self.request_id,
        )
        get_formal_detail.assert_called_once_with(
            access_token="authenticated-token",
            request_id=self.request_id,
        )


    @patch(
        "apps.commercial.request_operations_views."
        "get_commercial_request_formal_detail"
    )
    def test_returns_401_when_authentication_fails(
        self,
        get_formal_detail,
    ):
        from rest_framework.test import APIRequestFactory

        from apps.accounts.exceptions import (
            AccountAuthenticationError,
        )
        from apps.commercial.request_operations_views import (
            CommercialRequestFormalDetailView,
        )

        get_formal_detail.assert_not_called()

        request = APIRequestFactory().get(
            f"/api/commercial/requests/{self.request_id}/formal-detail/"
        )

        with patch.object(
            CommercialRequestFormalDetailView,
            "get_authenticated_user_and_access_token",
            side_effect=AccountAuthenticationError(
                "Invalid or expired access token."
            ),
        ):
            response = CommercialRequestFormalDetailView.as_view()(
                request,
                request_id=self.request_id,
            )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.data["detail"],
            "Invalid or expired access token.",
        )
