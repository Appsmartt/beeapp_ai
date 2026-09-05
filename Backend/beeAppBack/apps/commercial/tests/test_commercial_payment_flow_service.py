from __future__ import annotations

from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialOperationError,
)
from apps.commercial.services.commercial_payment_flow_service import (
    list_commercial_request_payment_methods,
    request_commercial_payment,
)


class CommercialPaymentFlowServiceTests(SimpleTestCase):
    @patch(
        "apps.commercial.services.commercial_payment_flow_service."
        "execute_commercial_rpc"
    )
    def test_owner_can_request_payment_via_atomic_rpc(self, execute_rpc):
        execute_rpc.return_value = "request-123"

        result = request_commercial_payment(
            access_token="owner-token",
            commerce_request_id="request-123",
        )

        execute_rpc.assert_called_once_with(
            access_token="owner-token",
            function_name="commerce_request_payment",
            parameters={
                "p_commerce_request_id": "request-123",
            },
        )
        self.assertEqual(
            result,
            {
                "request_id": "request-123",
                "status": "payment_pending",
            },
        )

    @patch(
        "apps.commercial.services.commercial_payment_flow_service."
        "execute_commercial_rpc"
    )
    def test_customer_receives_only_safe_payment_fields(self, execute_rpc):
        execute_rpc.return_value = [
            {
                "id": "method-123",
                "payment_method_type": "nequi",
                "display_name": "Nequi comercial",
                "public_details": {"label": "Pago móvil"},
                "public_instructions": "Solicita el dato al comercio.",
                "sort_order": 1,
                "private_details": {"phone": "3000000000"},
                "private_instructions": "No exponer.",
            }
        ]

        result = list_commercial_request_payment_methods(
            access_token="customer-token",
            commerce_request_id="request-123",
        )

        execute_rpc.assert_called_once_with(
            access_token="customer-token",
            function_name="commerce_request_payment_methods",
            parameters={
                "p_commerce_request_id": "request-123",
            },
        )

        method = result["payment_methods"][0]
        self.assertNotIn("private_details", method)
        self.assertNotIn("private_instructions", method)
        self.assertEqual(method["id"], "method-123")
        self.assertEqual(method["public_details"], {"label": "Pago móvil"})

    def test_rejects_missing_token(self):
        with self.assertRaises(CommercialAuthenticationError):
            request_commercial_payment(
                access_token=" ",
                commerce_request_id="request-123",
            )

    @patch(
        "apps.commercial.services.commercial_payment_flow_service."
        "execute_commercial_rpc"
    )
    def test_rejects_invalid_payment_methods_response(self, execute_rpc):
        execute_rpc.return_value = {"not": "a list"}

        with self.assertRaises(CommercialOperationError) as context:
            list_commercial_request_payment_methods(
                access_token="customer-token",
                commerce_request_id="request-123",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_METHODS_RESPONSE_INVALID",
        )
