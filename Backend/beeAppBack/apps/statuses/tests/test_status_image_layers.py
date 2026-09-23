from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from apps.statuses.exceptions import StatusMediaError
from apps.statuses.services.status_media_service import (
    MAX_STATUS_IMAGE_SIZE_BYTES,
    validate_status_media_file,
)


class StatusImageLayerValidationTests(SimpleTestCase):
    def create_image_file(
        self,
        *,
        name: str = "capa.png",
        content_type: str = "image/png",
        size_bytes: int = 1024,
    ) -> SimpleUploadedFile:
        return SimpleUploadedFile(
            name=name,
            content=b"0" * size_bytes,
            content_type=content_type,
        )

    def test_accepts_png_image_layer_file(self):
        result = validate_status_media_file(
            uploaded_file=self.create_image_file(),
            kind="image",
        )

        self.assertEqual(result["mime_type"], "image/png")
        self.assertEqual(result["size_bytes"], 1024)

    def test_accepts_jpeg_and_webp_image_layer_files(self):
        for name, content_type in (
            ("capa.jpg", "image/jpeg"),
            ("capa.webp", "image/webp"),
        ):
            with self.subTest(content_type=content_type):
                result = validate_status_media_file(
                    uploaded_file=self.create_image_file(
                        name=name,
                        content_type=content_type,
                    ),
                    kind="image",
                )

                self.assertEqual(result["mime_type"], content_type)

    def test_rejects_image_layer_larger_than_ten_mib(self):
        with self.assertRaises(StatusMediaError):
            validate_status_media_file(
                uploaded_file=self.create_image_file(
                    size_bytes=MAX_STATUS_IMAGE_SIZE_BYTES + 1,
                ),
                kind="image",
            )

    def test_rejects_gif_as_image_layer(self):
        with self.assertRaises(StatusMediaError):
            validate_status_media_file(
                uploaded_file=self.create_image_file(
                    name="capa.gif",
                    content_type="image/gif",
                ),
                kind="image",
            )
