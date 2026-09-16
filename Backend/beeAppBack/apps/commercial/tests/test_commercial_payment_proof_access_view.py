from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.commercial.payment_proof_access_views import (
    CommercialPaymentProofAccessView,
)


class CommercialPaymentProofAccessViewTests(SimpleTestCase):
    proof_id = "11111111-1111-1111-1111-111111111111"

    class User:
        id = "owner-123"
        email = "owner@example.com"

    @patch(
        "apps.commercial.payment_proof_access_views."
        "get_commercial_payment_proof_access"
    )
    def test_returns_private_payment_proof_access(
        self,
        get_access,
    ):
        get_access.return_value = {
            "payment_proof_id": self.proof_id,
            "file": {
                "id": "22222222-2222-2222-2222-222222222222",
                "display_name": "Comprobante.pdf",
                "original_name": "proof.pdf",
                "mime_type": "application/pdf",
                "size_bytes": 1024,
            },
            "url": "https://example.test/signed-proof",
            "expires_in_seconds": 300,
            "download": False,
        }

        request = APIRequestFactory().get(
            f"/api/commercial/payment-proofs/{self.proof_id}/access/"
        )

        with patch.object(
            CommercialPaymentProofAccessView,
            "get_authenticated_user_and_access_token",
            return_value=(self.User(), "owner-token"),
        ):
            response = CommercialPaymentProofAccessView.as_view()(
                request,
                payment_proof_id=self.proof_id,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["payment_proof_id"], self.proof_id)
        get_access.assert_called_once_with(
            access_token="owner-token",
            payment_proof_id=self.proof_id,
            download=False,
        )
