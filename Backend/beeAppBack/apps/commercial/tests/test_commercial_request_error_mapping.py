from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialNotFoundError,
    CommercialStateError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)


class CommercialRequestErrorMappingTests(SimpleTestCase):
    def test_paused_or_price_changed_state_returns_409(self):
        response = commercial_error_response(
            CommercialStateError(
                "Commercial offer changed; review the request.",
                code="COMMERCE_OFFER_CHANGED",
            )
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.data["code"],
            "COMMERCE_OFFER_CHANGED",
        )

    def test_invalid_modality_returns_400(self):
        response = commercial_error_response(
            CommercialValidationError(
                "Requested modality is no longer enabled.",
                code="COMMERCE_MODALITY_UNAVAILABLE",
            )
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["code"],
            "COMMERCE_MODALITY_UNAVAILABLE",
        )

    def test_insufficient_stock_returns_400(self):
        response = commercial_error_response(
            CommercialValidationError(
                "Insufficient available stock.",
                code="COMMERCE_INSUFFICIENT_STOCK",
            )
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["code"],
            "COMMERCE_INSUFFICIENT_STOCK",
        )

    def test_removed_offer_returns_404(self):
        response = commercial_error_response(
            CommercialNotFoundError(
                "Offer was not found or is unavailable.",
                code="COMMERCE_RESOURCE_NOT_FOUND",
            )
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.data["code"],
            "COMMERCE_RESOURCE_NOT_FOUND",
        )
