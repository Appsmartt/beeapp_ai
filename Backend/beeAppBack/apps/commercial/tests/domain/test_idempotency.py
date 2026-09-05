from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialValidationError
from apps.commercial.services.domain.idempotency import build_idempotency_payload


class IdempotencyTests(SimpleTestCase):
    def test_equivalent_payloads_generate_same_fingerprint(self):
        first = build_idempotency_payload(
            operation="commerce_request.create",
            key="req-123",
            body={"b": 2, "a": 1},
        )
        second = build_idempotency_payload(
            operation="commerce_request.create",
            key="req-123",
            body={"a": 1, "b": 2},
        )

        self.assertEqual(first.fingerprint, second.fingerprint)

    def test_rejects_empty_key(self):
        with self.assertRaises(CommercialValidationError) as context:
            build_idempotency_payload(
                operation="commerce_request.create",
                key="",
                body={},
            )

        self.assertEqual(context.exception.code, "idempotency_key_required")

    def test_operation_changes_fingerprint(self):
        first = build_idempotency_payload(
            operation="commerce_request.create",
            key="req-123",
            body={"offer_id": "offer-1"},
        )
        second = build_idempotency_payload(
            operation="commerce_request.submit",
            key="req-123",
            body={"offer_id": "offer-1"},
        )

        self.assertNotEqual(first.fingerprint, second.fingerprint)
