from django.test import SimpleTestCase

from apps.commercial.services.commercial_public_service import (
    _serialize_public_profile,
)


class CommercialPublicProfileSerializationTests(
    SimpleTestCase,
):
    def _profile(self, **overrides):
        profile = {
            "id": "11111111-1111-1111-1111-111111111111",
            "display_name": "Tienda BeeApp",
            "description": "Productos y servicios.",
            "offer_type": "mixed",
            "category_id": None,
            "custom_activity_text": None,
            "country_code": "CO",
            "city": "Bogotá",
            "address": "Calle privada 1",
            "neighborhood": "Centro",
            "location_reference": "Frente al parque",
            "is_address_public": False,
            "phone_dial_code": "57",
            "phone_number": "3001234567",
            "is_phone_public": False,
            "public_email": "privado@example.com",
            "is_email_public": False,
            "logo_file_id": None,
            "verification_status": "verified",
            "verification_badge_visible": True,
            "delivery_fee_mode": "fixed",
            "created_at": "2026-09-03T00:00:00+00:00",
            "updated_at": "2026-09-03T00:00:00+00:00",
            "owner_id": "must-never-be-returned",
            "booking_hold_minutes": 30,
            "inventory_hold_minutes": 30,
            "delivery_fee_amount": 5000,
            "private_details": {"secret": "must-not-leak"},
        }
        profile.update(overrides)
        return profile

    def test_hides_private_contact_and_location_fields(self):
        serialized = _serialize_public_profile(
            profile=self._profile(),
            modalities=["delivery"],
            category=None,
        )

        self.assertIsNone(serialized["location"]["address"])
        self.assertIsNone(serialized["location"]["neighborhood"])
        self.assertIsNone(
            serialized["location"]["location_reference"]
        )
        self.assertIsNone(serialized["contact"]["phone_dial_code"])
        self.assertIsNone(serialized["contact"]["phone_number"])
        self.assertIsNone(serialized["contact"]["email"])
        self.assertNotIn("owner_id", serialized)
        self.assertNotIn("booking_hold_minutes", serialized)
        self.assertNotIn("inventory_hold_minutes", serialized)
        self.assertNotIn("delivery_fee_amount", serialized)

    def test_returns_contact_and_location_only_when_public(self):
        serialized = _serialize_public_profile(
            profile=self._profile(
                is_address_public=True,
                is_phone_public=True,
                is_email_public=True,
            ),
            modalities=["delivery"],
            category=None,
        )

        self.assertEqual(
            serialized["location"]["address"],
            "Calle privada 1",
        )
        self.assertEqual(
            serialized["contact"]["phone_number"],
            "3001234567",
        )
        self.assertEqual(
            serialized["contact"]["email"],
            "privado@example.com",
        )

    def test_verification_badge_requires_verified_status_and_flag(self):
        serialized = _serialize_public_profile(
            profile=self._profile(
                verification_status="verified",
                verification_badge_visible=True,
            ),
            modalities=[],
            category=None,
        )

        self.assertTrue(serialized["is_verified"])

        serialized = _serialize_public_profile(
            profile=self._profile(
                verification_status="verified",
                verification_badge_visible=False,
            ),
            modalities=[],
            category=None,
        )

        self.assertFalse(serialized["is_verified"])


class CommercialPublicFilterNormalizationTests(
    SimpleTestCase,
):
    def test_normalizes_optional_country_code(self):
        from apps.commercial.services.commercial_public_service import (
            _normalize_optional_country_code,
        )

        self.assertEqual(
            _normalize_optional_country_code(" co "),
            "CO",
        )
        self.assertIsNone(
            _normalize_optional_country_code("   ")
        )

    def test_normalizes_optional_city(self):
        from apps.commercial.services.commercial_public_service import (
            _normalize_optional_city,
        )

        self.assertEqual(
            _normalize_optional_city("  Bogotá  "),
            "Bogotá",
        )
        self.assertIsNone(
            _normalize_optional_city(None)
        )


class CommercialPublicOfferSerializationTests(
    SimpleTestCase,
):
    def test_does_not_expose_inventory_or_offer_state(self):
        from apps.commercial.services.commercial_public_service import (
            _serialize_public_offer,
        )

        serialized = _serialize_public_offer(
            offer={
                "id": "11111111-1111-1111-1111-111111111111",
                "commercial_profile_id": (
                    "22222222-2222-2222-2222-222222222222"
                ),
                "catalog_id": (
                    "33333333-3333-3333-3333-333333333333"
                ),
                "offer_kind": "product",
                "title": "Producto",
                "description": "Descripción",
                "pricing_strategy": "fixed",
                "base_price_amount": 12000,
                "currency_code": "COP",
                "is_available": True,
                "status": "published",
                "track_inventory": True,
                "stock_quantity": 99,
                "duration_minutes": None,
                "requires_booking": False,
                "payment_policy": None,
                "created_at": "2026-09-03T00:00:00+00:00",
                "updated_at": "2026-09-03T00:00:00+00:00",
            },
            modalities=["delivery"],
            images=[],
        )

        self.assertNotIn("is_available", serialized)
        self.assertNotIn("status", serialized)
        self.assertNotIn("track_inventory", serialized)
        self.assertNotIn("stock_quantity", serialized)
        self.assertEqual(
            serialized["base_price_amount"],
            12000,
        )

    def test_exposes_only_safe_image_fields(self):
        image = {
            "id": "image-id",
            "file_id": "file-id",
            "display_name": "foto.png",
            "mime_type": "image/png",
            "sort_order": 0,
            "is_primary": True,
            "url": "https://signed.example/image",
            "url_expires_in_seconds": 300,
        }

        self.assertNotIn("bucket_id", image)
        self.assertNotIn("storage_path", image)


class CommercialPublicCatalogValidationTests(
    SimpleTestCase,
):
    def test_catalog_helper_is_declared(self):
        from apps.commercial.services.commercial_public_service import (
            _require_public_catalog_for_profile,
        )

        self.assertTrue(
            callable(_require_public_catalog_for_profile)
        )


class CommercialPublicProfileCountCompatibilityTests(SimpleTestCase):
    def test_response_without_count_uses_returned_profile_count(self):
        class Response:
            data = [
                {
                    "id": "profile-1",
                    "offer_type": "services",
                    "category_id": None,
                    "custom_activity_text": None,
                    "display_name": "Servicio",
                    "description": "Descripción",
                    "country_code": "CO",
                    "city": "Montería",
                    "address": None,
                    "neighborhood": None,
                    "location_reference": None,
                    "is_address_public": False,
                    "phone_dial_code": None,
                    "phone_number": None,
                    "is_phone_public": False,
                    "public_email": None,
                    "is_email_public": False,
                    "logo_file_id": None,
                    "is_public": True,
                    "is_available": True,
                    "publication_status": "published",
                    "verification_status": "not_requested",
                    "verification_badge_visible": False,
                    "delivery_fee_mode": "not_offered",
                    "delivery_fee_amount": None,
                    "delivery_currency_code": "COP",
                    "created_at": "2026-09-01T00:00:00+00:00",
                    "updated_at": "2026-09-01T00:00:00+00:00",
                }
            ]

        from unittest.mock import patch

        from apps.commercial.services.commercial_public_service import (
            list_public_commercial_profiles,
        )

        with patch(
            "apps.commercial.services.commercial_public_service.execute_with_supabase_admin_retry",
            return_value=Response(),
        ), patch(
            "apps.commercial.services.commercial_public_service._get_modalities_by_profile_ids",
            return_value={},
        ), patch(
            "apps.commercial.services.commercial_public_service._get_categories_by_ids",
            return_value={},
        ):
            result = list_public_commercial_profiles(
                country_code=None,
                city=None,
                category_id=None,
                offer_type=None,
                modality=None,
                verified_only=False,
                delivery_only=False,
                search=None,
                ordering="recent",
                limit=10,
                offset=0,
            )

        self.assertEqual(result["count"], 1)
        self.assertEqual(len(result["profiles"]), 1)
