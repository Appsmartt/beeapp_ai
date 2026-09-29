from django.test import SimpleTestCase

from apps.chat.exceptions import ChatMessageSendError
from apps.chat.services.chat_message_service import _validate_message_payload


class ChatLocationMessageValidationTests(SimpleTestCase):
    def validate_location(self, metadata, attachment_file_id=None):
        _validate_message_payload(
            message_type="location",
            body="Ubicación",
            attachment_file_id=attachment_file_id,
            reference_type=None,
            reference_id=None,
            metadata=metadata,
        )

    def test_accepts_valid_coordinates_without_attachment(self):
        self.validate_location(
            {"location": {"latitude": 4.711, "longitude": -74.072}}
        )

    def test_rejects_invalid_coordinates_and_metadata(self):
        invalid_values = [
            None,
            [],
            {"location": {"latitude": 91, "longitude": 0}},
            {"location": {"latitude": 0, "longitude": -181}},
            {"location": {"latitude": "4.711", "longitude": -74.072}},
            {"location": {"latitude": True, "longitude": 0}},
            {"location": {"latitude": float("nan"), "longitude": 0}},
            {"location": {"latitude": 4.711}},
        ]
        for metadata in invalid_values:
            with self.subTest(metadata=metadata):
                with self.assertRaises(ChatMessageSendError):
                    self.validate_location(metadata)

    def test_rejects_attachment(self):
        with self.assertRaises(ChatMessageSendError):
            self.validate_location(
                {"location": {"latitude": 4.711, "longitude": -74.072}},
                attachment_file_id="22222222-2222-2222-2222-222222222222",
            )
