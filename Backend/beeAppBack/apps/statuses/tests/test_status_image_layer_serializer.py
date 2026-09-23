import json

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from apps.statuses.serializers import StatusCreateSerializer


class StatusImageLayerSerializerTests(SimpleTestCase):
    def build_text_payload(self, **overrides):
        payload = {
            "actor_type": "profile",
            "kind": "text",
            "text_content": "Estado con capa",
            "text_background_id": "00000000-0000-0000-0000-000000000001",
            "editor_metadata": {
                "version": 2,
                "mentions": [],
                "image_layers": [],
            },
        }
        payload.update(overrides)
        return payload

    def build_layer_metadata(self, **overrides):
        metadata = {
            "id": "image_layer_1",
            "x": 50,
            "y": 50,
            "scale": 1,
            "rotation": 0,
            "size": 120,
            "sort_order": 0,
        }
        metadata.update(overrides)
        return metadata

    def test_text_status_without_main_file_remains_valid(self):
        serializer = StatusCreateSerializer(
            data=self.build_text_payload(),
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_text_status_rejects_main_media_file(self):
        serializer = StatusCreateSerializer(
            data=self.build_text_payload(
                file=SimpleUploadedFile(
                    "principal.jpg",
                    b"image",
                    content_type="image/jpeg",
                ),
            ),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("file", serializer.errors)

    def test_layer_metadata_transport_is_json_object(self):
        serialized_layers = json.dumps(
            [self.build_layer_metadata()],
        )

        decoded_layers = json.loads(serialized_layers)

        self.assertEqual(len(decoded_layers), 1)
        self.assertEqual(decoded_layers[0]["sort_order"], 0)
        self.assertEqual(decoded_layers[0]["size"], 120)

    def test_validated_layer_metadata_is_json_serializable(self):
        serializer = StatusCreateSerializer(
            data={
                "actor_type": "profile",
                "kind": "image",
                "file": SimpleUploadedFile(
                    "principal.jpg",
                    b"image",
                    content_type="image/jpeg",
                ),
                "image_layers_metadata": [
                    self.build_layer_metadata()
                ],
                "image_layer_file_0": SimpleUploadedFile(
                    "capa.jpg",
                    b"image",
                    content_type="image/jpeg",
                ),
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

        normalized_layer = serializer.validated_data[
            "image_layers_metadata"
        ][0]

        self.assertIsInstance(normalized_layer["x"], float)
        self.assertIsInstance(normalized_layer["y"], float)
        self.assertIsInstance(normalized_layer["scale"], float)
        self.assertIsInstance(normalized_layer["rotation"], float)

        json.dumps(serializer.validated_data["image_layers_metadata"])

    def test_personal_status_rejects_commercial_offer_link(self):
        serializer = StatusCreateSerializer(
            data=self.build_text_payload(
                commercial_offer_link={
                    "commercial_offer_id": "00000000-0000-0000-0000-000000000010",
                    "commercial_offer_image_id": "00000000-0000-0000-0000-000000000011",
                    "image_layer_id": "commercial_offer_00000000",
                    "x": 50,
                    "y": 50,
                    "scale": 1,
                    "rotation": 0,
                    "size": 96,
                },
            ),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "commercial_offer_link",
            serializer.errors,
        )

    def test_commercial_status_accepts_valid_commercial_offer_link(self):
        serializer = StatusCreateSerializer(
            data={
                "actor_type": "commercial_profile",
                "actor_commercial_profile_id": "00000000-0000-0000-0000-000000000020",
                "kind": "text",
                "text_content": "Oferta destacada",
                "text_background_id": "00000000-0000-0000-0000-000000000001",
                "commercial_offer_link": {
                    "commercial_offer_id": "00000000-0000-0000-0000-000000000021",
                    "commercial_offer_image_id": "00000000-0000-0000-0000-000000000022",
                    "image_layer_id": "commercial_offer_00000000",
                    "x": 50,
                    "y": 50,
                    "scale": 1,
                    "rotation": 0,
                    "size": 96,
                },
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

        link = serializer.validated_data[
            "commercial_offer_link"
        ]

        self.assertEqual(
            link["commercial_offer_id"],
            "00000000-0000-0000-0000-000000000021",
        )
        self.assertEqual(link["size"], 96)
        self.assertEqual(link["scale"], 1.0)

    def test_layer_file_fields_have_stable_explicit_names(self):
        files = {
            f"image_layer_file_{index}": SimpleUploadedFile(
                f"capa-{index}.jpg",
                b"image",
                content_type="image/jpeg",
            )
            for index in range(3)
        }

        self.assertEqual(
            sorted(files),
            [
                "image_layer_file_0",
                "image_layer_file_1",
                "image_layer_file_2",
            ],
        )
