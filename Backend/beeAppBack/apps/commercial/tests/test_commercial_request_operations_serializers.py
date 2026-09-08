from django.test import SimpleTestCase

from apps.commercial.serializers import (
    CompleteCommercialRequestSerializer,
    ListOwnedCommercialRequestsQuerySerializer,
    RejectCommercialRequestProposalSerializer,
    ReplaceCommercialPaymentProofSerializer,
    WithdrawCommercialRequestProposalSerializer,
)


class CommercialRequestOperationsSerializerTests(SimpleTestCase):
    def test_owner_list_accepts_statuses_and_pagination(self):
        serializer = ListOwnedCommercialRequestsQuerySerializer(
            data={
                "status": ["submitted", "payment_pending"],
                "limit": 20,
                "offset": 10,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["status"],
            ["submitted", "payment_pending"],
        )
        self.assertEqual(serializer.validated_data["limit"], 20)
        self.assertEqual(serializer.validated_data["offset"], 10)

    def test_reject_proposal_normalizes_blank_reason(self):
        serializer = RejectCommercialRequestProposalSerializer(
            data={"rejection_reason": "  "}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(
            serializer.validated_data["rejection_reason"]
        )

    def test_withdraw_proposal_normalizes_reason(self):
        serializer = WithdrawCommercialRequestProposalSerializer(
            data={"withdrawal_reason": " Ya no está disponible. "}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["withdrawal_reason"],
            "Ya no está disponible.",
        )

    def test_replace_proof_normalizes_optional_fields(self):
        serializer = ReplaceCommercialPaymentProofSerializer(
            data={
                "file_id": "11111111-1111-1111-1111-111111111111",
                "payment_method_id": None,
                "payment_reference": " REF-123 ",
                "note": " Comprobante corregido. ",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(
            serializer.validated_data["payment_method_id"]
        )
        self.assertEqual(
            serializer.validated_data["payment_reference"],
            "REF-123",
        )
        self.assertEqual(
            serializer.validated_data["note"],
            "Comprobante corregido.",
        )

    def test_complete_request_normalizes_blank_note(self):
        serializer = CompleteCommercialRequestSerializer(
            data={"completion_note": " "}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(
            serializer.validated_data["completion_note"]
        )
