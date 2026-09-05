from uuid import UUID

from django.test import SimpleTestCase
from django.urls import resolve, reverse

from apps.commercial.payment_proof_review_views import (
    CommercialPaymentProofReviewView,
)


class CommercialPaymentProofReviewUrlTests(SimpleTestCase):
    proof_id = "11111111-1111-1111-1111-111111111111"

    def test_review_payment_proof_url_resolves_to_review_view(self):
        url = reverse(
            "commercial-payment-proof-review",
            kwargs={"payment_proof_id": self.proof_id},
        )

        match = resolve(url)

        self.assertEqual(
            match.func.view_class,
            CommercialPaymentProofReviewView,
        )
        self.assertEqual(
            match.kwargs["payment_proof_id"],
            UUID(self.proof_id),
        )
