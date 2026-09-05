from __future__ import annotations

from unittest.mock import patch
from uuid import UUID

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialOperationError,
)
from apps.commercial.services.commercial_payment_proof_service import (
    submit_commercial_payment_proof,
)


class CommercialPaymentProofServiceTests(SimpleTestCase):
    @patch(
        "apps.commercial.services.commercial_payment_proof_service."
        "execute_commercial_rpc"
    )
    def test_calls_submit_proof_rpc_with_safe_normalized_fields(
        self,
        execute_rpc,
    ):
        execute_rpc.return_value = "proof-123"

        result = submit_commercial_payment_proof(
            access_token="client-token",
            commerce_request_id="request-123",
            file_id="file-123",
            payment_method_id="method-123",
            payment_reference=" REF-001 ",
            note=" Pago realizado ",
        )

        execute_rpc.assert_called_once_with(
            access_token="client-token",
            function_name="commerce_submit_payment_proof",
            parameters={
                "p_commerce_request_id": "request-123",
                "p_file_id": "file-123",
                "p_payment_method_id": "method-123",
                "p_payment_reference": "REF-001",
                "p_note": "Pago realizado",
            },
        )

        self.assertEqual(
            result,
            {
                "payment_proof_id": "proof-123",
                "request_id": "request-123",
                "status": "submitted",
            },
        )

    def test_rejects_missing_token(self):
        with self.assertRaises(CommercialAuthenticationError):
            submit_commercial_payment_proof(
                access_token="",
                commerce_request_id="request-123",
                file_id="file-123",
                payment_method_id="method-123",
            )

    @patch(
        "apps.commercial.services.commercial_payment_proof_service."
        "execute_commercial_rpc"
    )
    def test_rejects_invalid_rpc_response(self, execute_rpc):
        execute_rpc.return_value = None

        with self.assertRaises(CommercialOperationError) as context:
            submit_commercial_payment_proof(
                access_token="client-token",
                commerce_request_id="request-123",
                file_id="file-123",
                payment_method_id="method-123",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_PROOF_RESPONSE_INVALID",
        )


class CommercialPaymentProofViewTests(SimpleTestCase):
    @patch(
        "apps.commercial.payment_proof_views."
        "submit_commercial_payment_proof"
    )
    def test_view_uses_authenticated_access_token(self, submit_proof):
        from rest_framework.test import APIRequestFactory

        from apps.commercial.payment_proof_views import (
            CommercialPaymentProofsView,
        )

        submit_proof.return_value = {
            "payment_proof_id": "proof-123",
            "request_id": "request-123",
            "status": "submitted",
        }

        class User:
            id = "user-123"
            email = "client@example.com"

        request = APIRequestFactory().post(
            "/api/commercial/requests/request-123/payment-proofs/",
            {
                "file_id": "11111111-1111-1111-1111-111111111111",
                "payment_method_id": (
                    "22222222-2222-2222-2222-222222222222"
                ),
                "payment_reference": " REF-001 ",
                "note": " Pago realizado ",
            },
            format="json",
        )

        with patch.object(
            CommercialPaymentProofsView,
            "get_authenticated_user_and_access_token",
            return_value=(User(), "authenticated-token"),
        ):
            response = CommercialPaymentProofsView.as_view()(
                request,
                request_id="request-123",
            )

        self.assertEqual(response.status_code, 201)
        submit_proof.assert_called_once_with(
            access_token="authenticated-token",
            commerce_request_id="request-123",
            file_id=UUID("11111111-1111-1111-1111-111111111111"),
            payment_method_id=UUID(
                "22222222-2222-2222-2222-222222222222"
            ),
            payment_reference="REF-001",
            note="Pago realizado",
        )
