from __future__ import annotations

from unittest import TestCase

from apps.commercial.serializers import CreateCommercialProfileSerializer


class CreateCommercialProfileCategorySerializerTests(TestCase):
    def base_payload(self) -> dict:
        return {
            "offer_type": "services",
            "display_name": "Negocio de prueba",
            "description": "Descripción de prueba",
            "country_code": "CO",
            "city": "Bogotá",
            "logo_file_id": (
                "11111111-1111-1111-1111-111111111111"
            ),
            "modalities": ["virtual"],
        }

    def test_accepts_new_categories_without_existing_ids(self):
        serializer = CreateCommercialProfileSerializer(
            data={
                **self.base_payload(),
                "new_category_names": [
                    "Reparación de drones agrícolas",
                    "Mantenimiento de sensores",
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["new_category_names"],
            [
                "Reparación de drones agrícolas",
                "Mantenimiento de sensores",
            ],
        )

    def test_normalizes_new_category_whitespace(self):
        serializer = CreateCommercialProfileSerializer(
            data={
                **self.base_payload(),
                "new_category_names": [
                    "  Reparación   de drones  ",
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["new_category_names"],
            ["Reparación de drones"],
        )

    def test_rejects_more_than_five_combined_categories(self):
        serializer = CreateCommercialProfileSerializer(
            data={
                **self.base_payload(),
                "category_ids": [
                    "00000000-0000-0000-0000-000000000001",
                    "00000000-0000-0000-0000-000000000002",
                    "00000000-0000-0000-0000-000000000003",
                ],
                "new_category_names": [
                    "Categoría nueva uno",
                    "Categoría nueva dos",
                    "Categoría nueva tres",
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "new_category_names",
            serializer.errors,
        )

    def test_rejects_duplicate_new_category_names(self):
        serializer = CreateCommercialProfileSerializer(
            data={
                **self.base_payload(),
                "new_category_names": [
                    "Reparación de drones",
                    " reparación   DE DRONES ",
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "new_category_names",
            serializer.errors,
        )

    def test_rejects_custom_activity_with_new_categories(self):
        serializer = CreateCommercialProfileSerializer(
            data={
                **self.base_payload(),
                "new_category_names": [
                    "Reparación de drones",
                ],
                "custom_activity_text": (
                    "Actividad que no debe coexistir"
                ),
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "custom_activity_text",
            serializer.errors,
        )


    def test_accepts_commercial_social_links(self):
        serializer = CreateCommercialProfileSerializer(
            data={
                **self.base_payload(),
                "new_category_names": ["Reparación de drones"],
                "social_links": [
                    {
                        "platform": "instagram",
                        "url": "  https://instagram.com/beeapp  ",
                    },
                    {
                        "platform": "website",
                        "url": "https://beeapp.co",
                    },
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["social_links"],
            [
                {
                    "platform": "instagram",
                    "url": "https://instagram.com/beeapp",
                },
                {
                    "platform": "website",
                    "url": "https://beeapp.co",
                },
            ],
        )

    def test_rejects_invalid_commercial_social_link_url(self):
        serializer = CreateCommercialProfileSerializer(
            data={
                **self.base_payload(),
                "new_category_names": ["Reparación de drones"],
                "social_links": [
                    {
                        "platform": "instagram",
                        "url": "instagram.com/beeapp",
                    },
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("social_links", serializer.errors)

    def test_rejects_duplicate_commercial_social_platforms(self):
        serializer = CreateCommercialProfileSerializer(
            data={
                **self.base_payload(),
                "new_category_names": ["Reparación de drones"],
                "social_links": [
                    {
                        "platform": "instagram",
                        "url": "https://instagram.com/beeapp",
                    },
                    {
                        "platform": "instagram",
                        "url": "https://instagram.com/beeapp-alt",
                    },
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("social_links", serializer.errors)
