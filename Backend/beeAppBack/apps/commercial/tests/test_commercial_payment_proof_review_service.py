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
    def test_calls_confirm_review_rpc(self, execute_rpc):
        execute_rpc.return_value = self.proof_id

        result = review_commercial_payment_proof(
            access_token="owner-token",
            payment_proof_id=self.proof_id,
            decision="confirmed",
        )

        execute_rpc.assert_called_once_with(
            access_token="owner-token",
            function_name="commerce_review_payment_proof",
            parameters={
                "p_commerce_payment_proof_id": self.proof_id,
                "p_decision": "confirmed",
                "p_rejection_reason": None,
            },
        )
        self.assertEqual(
            result,
            {
                "payment_proof_id": self.proof_id,
                "status": "confirmed",
            },
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_proof_review_service."
        "execute_commercial_rpc"
    )
    def test_calls_reject_review_rpc_with_normalized_reason(
        self,
        execute_rpc,
    ):
        execute_rpc.return_value = self.proof_id

        result = review_commercial_payment_proof(
            access_token="owner-token",
            payment_proof_id=self.proof_id,
            decision="rejected",
            rejection_reason=" Comprobante ilegible. ",
        )

        execute_rpc.assert_called_once_with(
            access_token="owner-token",
            function_name="commerce_review_payment_proof",
            parameters={
                "p_commerce_payment_proof_id": self.proof_id,
                "p_decision": "rejected",
                "p_rejection_reason": "Comprobante ilegible.",
            },
        )
        self.assertEqual(
            result,
            {
                "payment_proof_id": self.proof_id,
                "status": "rejected",
            },
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_proof_review_service."
        "execute_commercial_rpc"
    )
    def test_rejects_invalid_rpc_response(self, execute_rpc):
        execute_rpc.return_value = None

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
