from unittest.mock import patch
from uuid import UUID

from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialAccessError


class CommercialPaymentProofReviewViewTests(SimpleTestCase):
    proof_id = "11111111-1111-1111-1111-111111111111"

    @patch(
        "apps.commercial.payment_proof_review_views."
        "review_commercial_payment_proof"
    )
    def test_view_uses_authenticated_access_token_for_confirmation(
        self,
        review_payment_proof,
    ):
        from rest_framework.test import APIRequestFactory

        from apps.commercial.payment_proof_review_views import (
            CommercialPaymentProofReviewView,
        )

        review_payment_proof.return_value = {
            "payment_proof_id": self.proof_id,
            "status": "confirmed",
        }

        class User:
            id = "owner-123"
            email = "owner@example.com"

        request = APIRequestFactory().post(
            f"/api/commercial/payment-proofs/{self.proof_id}/review/",
            {"decision": "confirmed"},
            format="json",
        )

        with patch.object(
            CommercialPaymentProofReviewView,
            "get_authenticated_user_and_access_token",
            return_value=(User(), "owner-token"),
        ):
            response = CommercialPaymentProofReviewView.as_view()(
                request,
                payment_proof_id=self.proof_id,
            )

        self.assertEqual(response.status_code, 200)
        review_payment_proof.assert_called_once_with(
            access_token="owner-token",
            payment_proof_id=self.proof_id,
            decision="confirmed",
            rejection_reason=None,
        )

    @patch(
        "apps.commercial.payment_proof_review_views."
        "review_commercial_payment_proof"
    )
    def test_view_normalizes_rejection_reason(
        self,
        review_payment_proof,
    ):
        from rest_framework.test import APIRequestFactory

        from apps.commercial.payment_proof_review_views import (
            CommercialPaymentProofReviewView,
        )

        review_payment_proof.return_value = {
            "payment_proof_id": self.proof_id,
            "status": "rejected",
        }

        class User:
            id = "owner-123"
            email = "owner@example.com"

        request = APIRequestFactory().post(
            f"/api/commercial/payment-proofs/{self.proof_id}/review/",
            {
                "decision": "rejected",
                "rejection_reason": " Comprobante ilegible. ",
            },
            format="json",
        )

        with patch.object(
            CommercialPaymentProofReviewView,
            "get_authenticated_user_and_access_token",
            return_value=(User(), "owner-token"),
        ):
            response = CommercialPaymentProofReviewView.as_view()(
                request,
                payment_proof_id=UUID(self.proof_id),
            )

        self.assertEqual(response.status_code, 200)
        review_payment_proof.assert_called_once_with(
            access_token="owner-token",
            payment_proof_id=self.proof_id,
            decision="rejected",
            rejection_reason="Comprobante ilegible.",
        )


    @patch(
        "apps.commercial.payment_proof_review_views."
        "review_commercial_payment_proof"
    )
    def test_view_returns_commercial_error_response(
        self,
        review_payment_proof,
    ):
        from rest_framework.test import APIRequestFactory

        from apps.commercial.payment_proof_review_views import (
            CommercialPaymentProofReviewView,
        )

        review_payment_proof.side_effect = CommercialAccessError(
            "Only the business owner can review this payment proof.",
            code="COMMERCIAL_OWNER_REQUIRED",
        )

        class User:
            id = "client-123"
            email = "client@example.com"

        request = APIRequestFactory().post(
            f"/api/commercial/payment-proofs/{self.proof_id}/review/",
            {"decision": "confirmed"},
            format="json",
        )

        with patch.object(
            CommercialPaymentProofReviewView,
            "get_authenticated_user_and_access_token",
            return_value=(User(), "client-token"),
        ):
            response = CommercialPaymentProofReviewView.as_view()(
                request,
                payment_proof_id=self.proof_id,
            )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["code"],
            "COMMERCIAL_OWNER_REQUIRED",
        )
