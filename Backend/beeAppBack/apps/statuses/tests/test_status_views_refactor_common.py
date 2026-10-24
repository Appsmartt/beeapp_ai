from unittest import TestCase

from rest_framework.test import APIRequestFactory

from apps.accounts.exceptions import AccountAuthenticationError
from apps.statuses.exceptions import StatusAccessError, StatusFollowNotFoundError, StatusNotFoundError, StatusValidationError
from apps.statuses.views_refactor.common import follow_error_response, get_required_bearer_token, status_error_response, unauthorized_response


class StatusViewsRefactorCommonTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_get_required_bearer_token_returns_trimmed_token(self):
        request = self.factory.get("/", HTTP_AUTHORIZATION="Bearer token-value ")
        self.assertEqual(get_required_bearer_token(request), "token-value")

    def test_get_required_bearer_token_rejects_invalid_headers(self):
        for header in ("", "Basic token-value", "Bearer", "Bearer   "):
            with self.subTest(header=header):
                request = self.factory.get("/", HTTP_AUTHORIZATION=header)
                with self.assertRaises(AccountAuthenticationError):
                    get_required_bearer_token(request)

    def test_unauthorized_response_keeps_contract(self):
        response = unauthorized_response()
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data, {"detail": "Invalid or expired access token."})

    def test_status_error_response_maps_status_errors(self):
        cases = ((StatusNotFoundError("missing"), 404), (StatusAccessError("forbidden"), 403), (StatusValidationError("invalid"), 400))
        for error, expected_status in cases:
            with self.subTest(error=type(error).__name__):
                self.assertEqual(status_error_response(error).status_code, expected_status)

    def test_follow_error_response_maps_not_found(self):
        response = follow_error_response(StatusFollowNotFoundError("missing"))
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data, {"detail": "Follow relationship was not found."})
