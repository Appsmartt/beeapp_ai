from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.commercial.services.commercial_payment_proof_access_service import (
    get_commercial_payment_proof_access,
)


class CommercialPaymentProofAccessServiceTests(SimpleTestCase):
    proof_id = "11111111-1111-1111-1111-111111111111"
    file_id = "22222222-2222-2222-2222-222222222222"

    @patch(
        "apps.commercial.services."
        "commercial_payment_proof_access_service."
        "get_supabase_admin_client"
    )
    @patch(
        "apps.commercial.services."
        "commercial_payment_proof_access_service."
        "execute_commercial_rpc"
    )
    def test_creates_signed_url_for_authorized_proof(
        self,
        execute_rpc,
        get_admin_client,
    ):
        execute_rpc.return_value = {
            "commerce_payment_proof_id": self.proof_id,
            "commerce_request_id": (
                "33333333-3333-3333-3333-333333333333"
            ),
            "request_type": "mixed_request",
            "file_id": self.file_id,
            "proof_status": "submitted",
        }

        admin_client = MagicMock()
        get_admin_client.return_value = admin_client

        table_query = (
            admin_client.table.return_value
            .select.return_value
            .eq.return_value
            .eq.return_value
            .is_.return_value
            .maybe_single.return_value
        )
        table_query.execute.return_value.data = {
            "id": self.file_id,
            "bucket_id": "beeapp-files",
            "storage_path": "client/files/proof.pdf",
            "display_name": "Comprobante.pdf",
            "original_name": "proof.pdf",
            "mime_type": "application/pdf",
            "size_bytes": 1024,
        }

        admin_client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.test/signed-proof",
        }

        result = get_commercial_payment_proof_access(
            access_token="owner-token",
            payment_proof_id=self.proof_id,
            download=True,
        )

        self.assertEqual(
            result["url"],
            "https://example.test/signed-proof",
        )
        self.assertEqual(result["expires_in_seconds"], 300)
        self.assertTrue(result["download"])
        execute_rpc.assert_called_once_with(
            access_token="owner-token",
            function_name="commerce_get_payment_proof_context",
            parameters={
                "p_commerce_payment_proof_id": self.proof_id,
            },
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_proof_access_service."
        "execute_commercial_rpc"
    )
    def test_rejects_invalid_context(self, execute_rpc):
        execute_rpc.return_value = None

        with self.assertRaises(Exception):
            get_commercial_payment_proof_access(
                access_token="owner-token",
                payment_proof_id=self.proof_id,
            )
