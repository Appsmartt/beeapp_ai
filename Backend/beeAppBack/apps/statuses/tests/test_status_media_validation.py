from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from apps.statuses.exceptions import StatusMediaError
from apps.statuses.services.status_media_service import (
    MAX_STATUS_VIDEO_DURATION_SECONDS,
    MAX_STATUS_VIDEO_SIZE_BYTES,
    validate_status_media_file,
)


class StatusMediaValidationTests(SimpleTestCase):
    def create_video_file(
        self,
        *,
        name: str = "estado-prueba.mp4",
        size_bytes: int = 1024,
    ) -> SimpleUploadedFile:
        return SimpleUploadedFile(
            name=name,
            content=b"0" * size_bytes,
            content_type="video/mp4",
        )

    def test_accepts_video_at_maximum_duration_and_size(self):
        uploaded_file = self.create_video_file(
            size_bytes=MAX_STATUS_VIDEO_SIZE_BYTES,
        )

        result = validate_status_media_file(
            uploaded_file=uploaded_file,
            kind="video",
            duration_seconds=MAX_STATUS_VIDEO_DURATION_SECONDS,
        )

        self.assertEqual(result["mime_type"], "video/mp4")
        self.assertEqual(
            result["size_bytes"],
            MAX_STATUS_VIDEO_SIZE_BYTES,
        )
        self.assertEqual(
            result["duration_seconds"],
            float(MAX_STATUS_VIDEO_DURATION_SECONDS),
        )

    def test_rounds_video_duration_to_three_decimal_places(self):
        uploaded_file = self.create_video_file()

        result = validate_status_media_file(
            uploaded_file=uploaded_file,
            kind="video",
            duration_seconds=12.34567,
        )

        self.assertEqual(result["duration_seconds"], 12.346)

    def test_rejects_video_over_ninety_seconds(self):
        uploaded_file = self.create_video_file()

        with self.assertRaisesMessage(
            StatusMediaError,
            "Video stories cannot exceed 90 seconds.",
        ):
            validate_status_media_file(
                uploaded_file=uploaded_file,
                kind="video",
                duration_seconds=(
                    MAX_STATUS_VIDEO_DURATION_SECONDS + 0.001
                ),
            )

    def test_rejects_video_over_forty_mib(self):
        uploaded_file = self.create_video_file(
            size_bytes=MAX_STATUS_VIDEO_SIZE_BYTES + 1,
        )

        with self.assertRaisesMessage(
            StatusMediaError,
            "Video stories must be 40 MB or smaller.",
        ):
            validate_status_media_file(
                uploaded_file=uploaded_file,
                kind="video",
                duration_seconds=1,
            )
