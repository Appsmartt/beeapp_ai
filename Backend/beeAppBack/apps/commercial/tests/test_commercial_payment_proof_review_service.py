from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_payment_proof_review_service import (
    review_commercial_payment_proof,
)


class CommercialPaymentProofReviewServiceTests(SimpleTestCase):
    proof_id = "11111111-1111-1111-1111-111111111111"
    request_id = "22222222-2222-2222-2222-222222222222"

    def test_rejects_missing_access_token(self):
        with self.assertRaises(CommercialAuthenticationError) as context:
            review_commercial_payment_proof(
                access_token="",
                payment_proof_id=self.proof_id,
                decision="confirmed",
            )

        self.assertEqual(context.exception.code, "AUTHENTICATION_REQUIRED")

    def test_rejects_unknown_decision(self):
        with self.assertRaises(CommercialValidationError) as context:
            review_commercial_payment_proof(
                access_token="owner-token",
                payment_proof_id=self.proof_id,
                decision="approved",
            )

        self.assertEqual(
            context.exception.code,
            "PAYMENT_PROOF_DECISION_INVALID",
        )

    def test_rejected_decision_requires_reason(self):
        with self.assertRaises(CommercialValidationError) as context:
            review_commercial_payment_proof(
                access_token="owner-token",
                payment_proof_id=self.proof_id,
                decision="rejected",
            )

        self.assertEqual(
            context.exception.code,
            "PAYMENT_PROOF_REJECTION_REASON_REQUIRED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_proof_review_service."
        "execute_commercial_rpc"
    )
    def test_calls_legacy_review_rpc(self, execute_rpc):
        execute_rpc.side_effect = [
            {
                "commerce_payment_proof_id": self.proof_id,
                "commerce_request_id": self.request_id,
                "request_type": "product_order",
                "file_id": (
                    "33333333-3333-3333-3333-333333333333"
                ),
                "proof_status": "submitted",
            },
            self.proof_id,
        ]

        result = review_commercial_payment_proof(
            access_token="owner-token",
            payment_proof_id=self.proof_id,
            decision="confirmed",
        )

        self.assertEqual(
            result,
            {
                "payment_proof_id": self.proof_id,
                "status": "confirmed",
            },
        )
        self.assertEqual(
            execute_rpc.call_args_list[0].kwargs["function_name"],
            "commerce_get_payment_proof_context",
        )
        self.assertEqual(
            execute_rpc.call_args_list[1].kwargs["function_name"],
            "commerce_review_payment_proof",
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_proof_review_service."
        "execute_commercial_rpc"
    )
    def test_calls_mixed_review_rpc(self, execute_rpc):
        execute_rpc.side_effect = [
            {
                "commerce_payment_proof_id": self.proof_id,
                "commerce_request_id": self.request_id,
                "request_type": "mixed_request",
                "file_id": (
                    "33333333-3333-3333-3333-333333333333"
                ),
                "proof_status": "submitted",
            },
            {
                "commerce_payment_proof_id": self.proof_id,
                "commerce_request_id": self.request_id,
                "request_status": "confirmed",
                "attempts_used": 1,
                "attempts_remaining": 2,
                "confirmed_item_count": 2,
                "confirmed_reservation_count": 1,
            },
        ]

        result = review_commercial_payment_proof(
            access_token="owner-token",
            payment_proof_id=self.proof_id,
            decision="confirmed",
        )

        self.assertEqual(result["payment_proof_id"], self.proof_id)
        self.assertEqual(result["request_status"], "confirmed")
        self.assertEqual(result["attempts_remaining"], 2)
        self.assertEqual(
            execute_rpc.call_args_list[1].kwargs["function_name"],
            "commerce_review_mixed_payment_proof",
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_proof_review_service."
        "execute_commercial_rpc"
    )
    def test_rejects_invalid_context(self, execute_rpc):
        execute_rpc.return_value = None

        with self.assertRaises(CommercialValidationError) as context:
            review_commercial_payment_proof(
                access_token="owner-token",
                payment_proof_id=self.proof_id,
                decision="confirmed",
            )

        self.assertEqual(
            context.exception.code,
            "PAYMENT_PROOF_CONTEXT_INVALID",
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_proof_review_service."
        "execute_commercial_rpc"
    )
    def test_rejects_invalid_review_response(self, execute_rpc):
        execute_rpc.side_effect = [
            {
                "commerce_payment_proof_id": self.proof_id,
                "commerce_request_id": self.request_id,
                "request_type": "product_order",
                "file_id": (
                    "33333333-3333-3333-3333-333333333333"
                ),
                "proof_status": "submitted",
            },
            None,
        ]

        with self.assertRaises(CommercialValidationError) as context:
            review_commercial_payment_proof(
                access_token="owner-token",
                payment_proof_id=self.proof_id,
                decision="confirmed",
            )

        self.assertEqual(
            context.exception.code,
            "PAYMENT_PROOF_REVIEW_RESPONSE_INVALID",
        )
