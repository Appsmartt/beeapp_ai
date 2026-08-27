from django.test import SimpleTestCase

from apps.calls.serializers import (
    CallHistoryQuerySerializer,
    CancelCallJoinAttemptSerializer,
    JoinCallSerializer,
    KickCallParticipantSerializer,
    StartCallSerializer,
)


class StartCallSerializerTests(SimpleTestCase):
    def test_accepts_voice_call(self):
        serializer = StartCallSerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "call_type": "voice",
            }
        )

        self.assertTrue(serializer.is_valid())

    def test_accepts_video_call(self):
        serializer = StartCallSerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "call_type": "video",
            }
        )

        self.assertTrue(serializer.is_valid())

    def test_rejects_unknown_call_type(self):
        serializer = StartCallSerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "call_type": "screen_share",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("call_type", serializer.errors)


class JoinCallSerializerTests(SimpleTestCase):
    def test_requires_identity(self):
        serializer = JoinCallSerializer(data={})

        self.assertFalse(serializer.is_valid())
        self.assertIn("actor_identity_id", serializer.errors)


class CancelCallJoinAttemptSerializerTests(SimpleTestCase):
    def test_normalizes_blank_failure_reason(self):
        serializer = CancelCallJoinAttemptSerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "failure_reason": "   ",
            }
        )

        self.assertTrue(serializer.is_valid())
        self.assertIsNone(
            serializer.validated_data["failure_reason"]
        )


class KickCallParticipantSerializerTests(SimpleTestCase):
    def test_rejects_kicking_self(self):
        identity_id = "11111111-1111-1111-1111-111111111111"

        serializer = KickCallParticipantSerializer(
            data={
                "actor_identity_id": identity_id,
                "target_identity_id": identity_id,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("target_identity_id", serializer.errors)


class CallHistoryQuerySerializerTests(SimpleTestCase):
    def test_defaults_and_limits_history_pagination(self):
        serializer = CallHistoryQuerySerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
            }
        )

        self.assertTrue(serializer.is_valid())
        self.assertEqual(
            serializer.validated_data["limit"],
            50,
        )

    def test_rejects_history_limit_above_maximum(self):
        serializer = CallHistoryQuerySerializer(
            data={
                "actor_identity_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "limit": 101,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("limit", serializer.errors)
