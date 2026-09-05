from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialAuthenticationError,
    CommercialConflictError,
    CommercialNotFoundError,
    CommercialStateError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)


class CommercialHttpServiceTests(SimpleTestCase):
    def test_authentication_error_returns_401(self):
        response = commercial_error_response(
            CommercialAuthenticationError("Authentication required.")
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.data["code"],
            "AUTHENTICATION_REQUIRED",
        )

    def test_access_error_returns_403(self):
        response = commercial_error_response(
            CommercialAccessError("Access denied.")
        )

        self.assertEqual(response.status_code, 403)

    def test_not_found_error_returns_404(self):
        response = commercial_error_response(
            CommercialNotFoundError("Not found.")
        )

        self.assertEqual(response.status_code, 404)

    def test_state_error_returns_409(self):
        response = commercial_error_response(
            CommercialStateError("State invalid.")
        )

        self.assertEqual(response.status_code, 409)

    def test_conflict_error_returns_409(self):
        response = commercial_error_response(
            CommercialConflictError("Conflict.")
        )

        self.assertEqual(response.status_code, 409)

    def test_validation_error_returns_400(self):
        response = commercial_error_response(
            CommercialValidationError("Invalid payload.")
        )

        self.assertEqual(response.status_code, 400)
