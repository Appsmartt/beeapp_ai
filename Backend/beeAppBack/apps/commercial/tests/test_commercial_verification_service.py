from django.test import SimpleTestCase

from apps.commercial.services.verification_service import (
    EDITABLE_STATUSES,
    _serialize_request,
)


class CommercialVerificationServiceTests(SimpleTestCase):
    def test_editable_states_include_rejected(self):
        self.assertEqual(
            EDITABLE_STATUSES,
            {"draft", "requires_correction", "rejected"},
        )

    def test_serializes_optional_document(self):
        request_row = {
            "id": "request-1",
            "commercial_profile_id": "profile-1",
            "status": "draft",
            "submitted_at": None,
            "reviewed_at": None,
            "review_reason_code": None,
            "review_reason_text": None,
            "applicant_type": "legal",
            "legal_name": "BeeApp SAS",
            "tax_id": "901.123.456-7",
            "tax_id_normalized": "9011234567",
            "business_address": "Bogotá, Colombia",
            "review_note": None,
            "declaration_accepted_at": "2026-09-11T00:00:00+00:00",
            "declaration_version": "v1",
            "created_at": "2026-09-11T00:00:00+00:00",
            "updated_at": "2026-09-11T00:00:00+00:00",
        }

        result = _serialize_request(request_row, None)

        self.assertTrue(result["is_editable"])
        self.assertIsNone(result["document"])
        self.assertEqual(result["status"], "draft")

    def test_rejected_request_is_editable(self):
        request_row = {
            "id": "request-1",
            "commercial_profile_id": "profile-1",
            "status": "rejected",
            "submitted_at": "2026-09-11T00:00:00+00:00",
            "reviewed_at": "2026-09-11T01:00:00+00:00",
            "review_reason_code": "DOCUMENT_UNCLEAR",
            "review_reason_text": "El documento no es legible.",
            "applicant_type": "natural",
            "legal_name": "Andrés Mendoza",
            "tax_id": "123456789",
            "tax_id_normalized": "123456789",
            "business_address": "Bogotá, Colombia",
            "review_note": None,
            "declaration_accepted_at": "2026-09-11T00:00:00+00:00",
            "declaration_version": "v1",
            "created_at": "2026-09-11T00:00:00+00:00",
            "updated_at": "2026-09-11T01:00:00+00:00",
        }

        result = _serialize_request(request_row, None)

        self.assertTrue(result["is_editable"])
        self.assertEqual(
            result["review_reason_text"],
            "El documento no es legible.",
        )

    def test_pending_request_is_not_editable(self):
        request_row = {
            "id": "request-1",
            "commercial_profile_id": "profile-1",
            "status": "pending_review",
            "submitted_at": "2026-09-11T00:00:00+00:00",
            "reviewed_at": None,
            "review_reason_code": None,
            "review_reason_text": None,
            "applicant_type": "natural",
            "legal_name": "Andrés Mendoza",
            "tax_id": "123456789",
            "tax_id_normalized": "123456789",
            "business_address": "Bogotá, Colombia",
            "review_note": None,
            "declaration_accepted_at": "2026-09-11T00:00:00+00:00",
            "declaration_version": "v1",
            "created_at": "2026-09-11T00:00:00+00:00",
            "updated_at": "2026-09-11T00:00:00+00:00",
        }

        result = _serialize_request(request_row, None)

        self.assertFalse(result["is_editable"])
