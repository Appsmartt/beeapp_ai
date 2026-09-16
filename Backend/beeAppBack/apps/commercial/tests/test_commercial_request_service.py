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


    @patch(
        "apps.commercial.services.commercial_request_service.execute_commercial_rpc"
    )
    def test_mixed_request_creates_then_submits_with_filtered_items(
        self,
        execute_rpc,
    ):
        execute_rpc.side_effect = [
            {
                "request_id": "44444444-4444-4444-4444-444444444444",
                "code": "BS-2026-00000002",
                "status": "draft",
                "idempotent": False,
            },
            {
                "request_id": "44444444-4444-4444-4444-444444444444",
                "code": "BS-2026-00000002",
                "status": "submitted",
                "idempotent": False,
            },
        ]

        result = create_commercial_request(
            access_token="token",
            idempotency_key="mixed-key-1",
            payload={
                "request_type": "mixed_request",
                "commercial_profile_id": UUID(
                    "11111111-1111-1111-1111-111111111111"
                ),
                "requested_modality": "at_establishment",
                "customer_note": "Nota general",
                "items": [
                    {
                        "commercial_offer_id": UUID(
                            "22222222-2222-2222-2222-222222222222"
                        ),
                        "quantity": 2,
                        "line_comment": "Nota del producto",
                    },
                    {
                        "commercial_offer_id": UUID(
                            "33333333-3333-3333-3333-333333333333"
                        ),
                        "quantity": 1,
                        "line_comment": "Nota del servicio",
                        "requested_modality": "at_establishment",
                        "requested_starts_at": (
                            "2026-10-01T15:00:00+00:00"
                        ),
                        "requested_ends_at": (
                            "2026-10-01T16:00:00+00:00"
                        ),
                        "timezone": "America/Bogota",
                    },
                ],
            },
        )

        self.assertEqual(result["status"], "submitted")
        self.assertEqual(execute_rpc.call_count, 2)

        create_call = execute_rpc.call_args_list[0]
        submit_call = execute_rpc.call_args_list[1]

        self.assertEqual(
            create_call.kwargs["function_name"],
            "commerce_create_mixed_request",
        )
        self.assertEqual(
            create_call.kwargs["parameters"],
            {
                "p_commercial_profile_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "p_customer_note": "Nota general",
                "p_delivery_address": None,
                "p_delivery_reference": None,
                "p_idempotency_key": "mixed-key-1",
                "p_items": [
                    {
                        "commercial_offer_id": (
                            "22222222-2222-2222-2222-222222222222"
                        ),
                        "quantity": 2,
                        "customer_note": "Nota del producto",
                    },
                    {
                        "commercial_offer_id": (
                            "33333333-3333-3333-3333-333333333333"
                        ),
                        "quantity": 1,
                        "customer_note": "Nota del servicio",
                    },
                ],
                "p_requested_modality": "at_establishment",
            },
        )

        self.assertEqual(
            submit_call.kwargs["function_name"],
            "commerce_submit_mixed_request",
        )
        self.assertEqual(
            submit_call.kwargs["parameters"],
            {
                "p_commerce_request_id": (
                    "44444444-4444-4444-4444-444444444444"
                ),
                "p_idempotency_key": "mixed-key-1",
            },
        )

    @patch(
        "apps.commercial.services.commercial_request_service.execute_commercial_rpc"
    )
    def test_mixed_request_rejects_missing_create_request_id(
        self,
        execute_rpc,
    ):
        execute_rpc.return_value = {
            "status": "draft",
            "idempotent": False,
        }

        with self.assertRaises(CommercialValidationError) as context:
            create_commercial_request(
                access_token="token",
                idempotency_key="mixed-key-2",
                payload={
                    "request_type": "mixed_request",
                    "commercial_profile_id": (
                        "11111111-1111-1111-1111-111111111111"
                    ),
                    "requested_modality": "at_establishment",
                    "items": [
                        {
                            "commercial_offer_id": (
                                "22222222-2222-2222-2222-222222222222"
                            ),
                            "quantity": 1,
                        }
                    ],
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCE_REQUEST_CREATE_FAILED",
        )
        self.assertEqual(execute_rpc.call_count, 1)
