from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialValidationError
from apps.commercial.services.domain.notification_payloads import (
    build_beeservices_notification_payload,
    build_notification_dedupe_key,
)


class NotificationPayloadTests(SimpleTestCase):
    def test_builds_required_beeservices_payload(self):
        payload = build_beeservices_notification_payload(
            event_type="request_submitted",
            business_id="business-1",
            request_id="request-1",
            conversation_id="conversation-1",
        )

        self.assertEqual(payload["module"], "beeservices")
        self.assertEqual(payload["type"], "request_submitted")
        self.assertEqual(payload["business_id"], "business-1")
        self.assertEqual(payload["request_id"], "request-1")
        self.assertEqual(payload["conversation_id"], "conversation-1")

    def test_dedupe_key_is_deterministic(self):
        key = build_notification_dedupe_key(
            entity_type="commerce_request",
            entity_id="request-1",
            event_type="submitted",
            recipient_profile_id="profile-1",
        )

        self.assertEqual(
            key,
            "commerce_request:request-1:submitted:profile-1",
        )

    def test_rejects_missing_business_id(self):
        with self.assertRaises(CommercialValidationError) as context:
            build_beeservices_notification_payload(
                event_type="request_submitted",
                business_id="",
            )

        self.assertEqual(context.exception.code, "business_id_required")
