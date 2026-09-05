from django.test import SimpleTestCase

from apps.commercial.serializers import (
    ReviewCommercialPaymentProofSerializer,
)


class ReviewCommercialPaymentProofSerializerTests(SimpleTestCase):
    def test_allows_confirmed_without_reason(self):
        serializer = ReviewCommercialPaymentProofSerializer(
            data={"decision": "confirmed"}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data,
            {
                "decision": "confirmed",
                "rejection_reason": None,
            },
        )

    def test_rejected_requires_reason(self):
        serializer = ReviewCommercialPaymentProofSerializer(
            data={"decision": "rejected"}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("rejection_reason", serializer.errors)

    def test_rejected_normalizes_reason(self):
        serializer = ReviewCommercialPaymentProofSerializer(
            data={
                "decision": "rejected",
                "rejection_reason": " Comprobante ilegible. ",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["rejection_reason"],
            "Comprobante ilegible.",
        )

    def test_confirmed_rejects_reason(self):
        serializer = ReviewCommercialPaymentProofSerializer(
            data={
                "decision": "confirmed",
                "rejection_reason": "No aplica.",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("rejection_reason", serializer.errors)
