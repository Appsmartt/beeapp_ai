from decimal import Decimal
from unittest.mock import patch
from uuid import UUID

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_request_service import (
    create_commercial_request,
    normalize_json_payload,
)


class CommercialRequestServiceTests(SimpleTestCase):
    payload = {
        "request_type": "product_order",
        "commercial_profile_id": UUID(
            "11111111-1111-1111-1111-111111111111"
        ),
        "items": [
            {
                "commercial_offer_id": UUID(
                    "22222222-2222-2222-2222-222222222222"
                ),
                "quantity": 2,
            }
        ],
    }

    def test_normalizes_uuid_and_decimal_values(self):
        value = normalize_json_payload(
            {
                "id": UUID("11111111-1111-1111-1111-111111111111"),
                "amount": Decimal("50000"),
                "nested": (
                    UUID("22222222-2222-2222-2222-222222222222"),
                ),
            }
        )

        self.assertEqual(
            value["id"],
            "11111111-1111-1111-1111-111111111111",
        )
        self.assertEqual(value["amount"], "50000")
        self.assertEqual(
            value["nested"],
            ["22222222-2222-2222-2222-222222222222"],
        )

    def test_rejects_missing_access_token_before_rpc(self):
        with self.assertRaises(CommercialAuthenticationError) as context:
            create_commercial_request(
                access_token="",
                idempotency_key="key-1",
                payload=self.payload,
            )

        self.assertEqual(context.exception.code, "AUTHENTICATION_REQUIRED")

    def test_rejects_missing_idempotency_key_before_rpc(self):
        with self.assertRaises(CommercialValidationError) as context:
            create_commercial_request(
                access_token="token",
                idempotency_key="",
                payload=self.payload,
            )

        self.assertEqual(context.exception.code, "IDEMPOTENCY_KEY_REQUIRED")

    @patch(
        "apps.commercial.services.commercial_request_service.execute_commercial_rpc"
    )
    def test_calls_atomic_rpc_with_json_safe_payload(self, execute_rpc):
        execute_rpc.return_value = {
            "request_id": "44444444-4444-4444-4444-444444444444",
            "code": "BS-2026-00000001",
            "status": "submitted",
            "idempotent": False,
        }

        result = create_commercial_request(
            access_token="token",
            idempotency_key="key-1",
            payload=self.payload,
        )

        self.assertEqual(result["status"], "submitted")
        self.assertFalse(result["idempotent"])
        execute_rpc.assert_called_once_with(
            access_token="token",
            function_name="commerce_create_request",
            parameters={
                "p_idempotency_key": "key-1",
                "p_request_payload": {
                    "request_type": "product_order",
                    "commercial_profile_id": (
                        "11111111-1111-1111-1111-111111111111"
                    ),
                    "items": [
                        {
                            "commercial_offer_id": (
                                "22222222-2222-2222-2222-222222222222"
                            ),
                            "quantity": 2,
                        }
                    ],
                },
            },
        )

    @patch(
        "apps.commercial.services.commercial_request_service.execute_commercial_rpc"
    )
    def test_rejects_invalid_rpc_response(self, execute_rpc):
        execute_rpc.return_value = []

        with self.assertRaises(CommercialValidationError) as context:
            create_commercial_request(
                access_token="token",
                idempotency_key="key-1",
                payload=self.payload,
            )

        self.assertEqual(context.exception.code, "COMMERCE_REQUEST_CREATE_FAILED")
