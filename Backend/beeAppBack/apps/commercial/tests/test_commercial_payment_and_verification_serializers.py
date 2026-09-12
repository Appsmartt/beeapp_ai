from django.test import SimpleTestCase

from apps.commercial.serializers import (
    CreateCommercialPaymentMethodSerializer,
    CreateCommercialVerificationDocumentSerializer,
    CreateCommercialVerificationRequestSerializer,
    ReviewCommercialVerificationRequestSerializer,
    UpdateCommercialPaymentMethodSerializer,
    UpdateCommercialProfilePublicationSerializer,
)


class CommercialPaymentMethodSerializerTests(
    SimpleTestCase,
):
    def test_accepts_nequi_with_private_details(self):
        serializer = CreateCommercialPaymentMethodSerializer(
            data={
                "payment_method_type": "nequi",
                "display_name": "Nequi",
                "public_details": {
                    "provider": "Nequi",
                },
                "private_details": {
                    "account_holder_name": "Andrés Mendoza",
                    "phone_number": "3001234567",
                },
                "private_instructions": (
                    "Transfiere al número indicado y envía "
                    "el comprobante."
                ),
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rejects_manual_method_without_private_data(self):
        serializer = CreateCommercialPaymentMethodSerializer(
            data={
                "payment_method_type": "bank_account",
                "display_name": "Cuenta Bancolombia",
                "public_details": {
                    "provider": "Bancolombia",
                },
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "private_details",
            serializer.errors,
        )

    def test_accepts_breb_with_private_instructions_only(self):
        serializer = CreateCommercialPaymentMethodSerializer(
            data={
                "payment_method_type": "breb",
                "display_name": "BRE-B",
                "private_instructions": (
                    "Solicita los datos al negocio por chat."
                ),
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rejects_non_object_private_details(self):
        serializer = CreateCommercialPaymentMethodSerializer(
            data={
                "payment_method_type": "nequi",
                "display_name": "Nequi",
                "private_details": ["3001234567"],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "private_details",
            serializer.errors,
        )

    def test_update_requires_at_least_one_field(self):
        serializer = UpdateCommercialPaymentMethodSerializer(
            data={}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "non_field_errors",
            serializer.errors,
        )


class CommercialVerificationSerializerTests(SimpleTestCase):
    def test_accepts_valid_natural_person_request(self):
        serializer = CreateCommercialVerificationRequestSerializer(
            data={
                "applicant_type": "natural",
                "legal_name": "Andrés Mendoza",
                "tax_id": "1.234.567.890",
                "business_address": "Carrera 7 # 72-41, Bogotá",
                "declaration_accepted": True,
                "declaration_version": "v1",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_accepts_valid_legal_person_request(self):
        serializer = CreateCommercialVerificationRequestSerializer(
            data={
                "applicant_type": "legal",
                "legal_name": "BeeApp SAS",
                "tax_id": "901.123.456-7",
                "business_address": "Calle 100 # 10-20, Bogotá",
                "review_note": "El RUT está actualizado.",
                "declaration_accepted": True,
                "declaration_version": "v1",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rejects_request_without_declaration(self):
        serializer = CreateCommercialVerificationRequestSerializer(
            data={
                "applicant_type": "legal",
                "legal_name": "BeeApp SAS",
                "tax_id": "901123456",
                "business_address": "Calle 100 # 10-20, Bogotá",
                "declaration_accepted": False,
                "declaration_version": "v1",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "declaration_accepted",
            serializer.errors,
        )

    def test_rejects_request_with_short_tax_id(self):
        serializer = CreateCommercialVerificationRequestSerializer(
            data={
                "applicant_type": "natural",
                "legal_name": "Ana Pérez",
                "tax_id": "1234",
                "business_address": "Calle 10 # 20-30, Bogotá",
                "declaration_accepted": True,
                "declaration_version": "v1",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("tax_id", serializer.errors)

    def test_accepts_valid_verification_document(self):
        serializer = CreateCommercialVerificationDocumentSerializer(
            data={
                "file_id": (
                    "00000000-0000-0000-0000-000000000001"
                ),
                "note": "Registro mercantil vigente.",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_requires_reason_for_correction(self):
        serializer = ReviewCommercialVerificationRequestSerializer(
            data={
                "decision": "requires_correction",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "reason_text",
            serializer.errors,
        )

    def test_requires_reason_for_rejection(self):
        serializer = ReviewCommercialVerificationRequestSerializer(
            data={
                "decision": "rejected",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "reason_text",
            serializer.errors,
        )

    def test_verified_request_cannot_have_reason(self):
        serializer = ReviewCommercialVerificationRequestSerializer(
            data={
                "decision": "verified",
                "reason_text": "No aplica.",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "reason_text",
            serializer.errors,
        )


class CommercialProfilePublicationSerializerTests(
    SimpleTestCase,
):
    def test_archiving_requires_reason(self):
        serializer = UpdateCommercialProfilePublicationSerializer(
            data={
                "publication_status": "archived",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "reason_text",
            serializer.errors,
        )

    def test_accepts_pause_without_reason(self):
        serializer = UpdateCommercialProfilePublicationSerializer(
            data={
                "publication_status": "paused",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_accepts_archive_with_reason(self):
        serializer = UpdateCommercialProfilePublicationSerializer(
            data={
                "publication_status": "archived",
                "reason_text": "Cierre temporal del negocio.",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
