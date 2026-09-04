from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialStateError,
)
from apps.commercial.serializers import (
    AdjustCommercialOfferInventorySerializer,
    CreateCommercialOfferSerializer,
    UpdateCommercialOfferModalitiesSerializer,
)


class CommercialOfferSerializerTests(SimpleTestCase):
    def test_rejects_product_with_booking(self):
        serializer = CreateCommercialOfferSerializer(
            data={
                "catalog_id": (
                    "00000000-0000-0000-0000-000000000001"
                ),
                "offer_kind": "product",
                "title": "Producto",
                "pricing_strategy": "fixed",
                "base_price_amount": 10000,
                "requires_booking": True,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "requires_booking",
            serializer.errors,
        )

    def test_rejects_service_without_payment_policy(self):
        serializer = CreateCommercialOfferSerializer(
            data={
                "catalog_id": (
                    "00000000-0000-0000-0000-000000000001"
                ),
                "offer_kind": "service",
                "title": "Servicio",
                "pricing_strategy": "fixed",
                "base_price_amount": 10000,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "payment_policy",
            serializer.errors,
        )

    def test_accepts_tracked_product(self):
        serializer = CreateCommercialOfferSerializer(
            data={
                "catalog_id": (
                    "00000000-0000-0000-0000-000000000001"
                ),
                "offer_kind": "product",
                "title": "Producto",
                "pricing_strategy": "fixed",
                "base_price_amount": 10000,
                "track_inventory": True,
                "stock_quantity": 5,
            }
        )

        self.assertTrue(serializer.is_valid())

    def test_accepts_booked_service(self):
        serializer = CreateCommercialOfferSerializer(
            data={
                "catalog_id": (
                    "00000000-0000-0000-0000-000000000001"
                ),
                "offer_kind": "service",
                "title": "Servicio",
                "pricing_strategy": "starting_at",
                "base_price_amount": 10000,
                "requires_booking": True,
                "duration_minutes": 60,
                "payment_policy": "to_be_agreed",
            }
        )

        self.assertTrue(serializer.is_valid())

    def test_rejects_price_for_free_offer(self):
        serializer = CreateCommercialOfferSerializer(
            data={
                "catalog_id": (
                    "00000000-0000-0000-0000-000000000001"
                ),
                "offer_kind": "product",
                "title": "Producto gratis",
                "pricing_strategy": "free",
                "base_price_amount": 1,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "base_price_amount",
            serializer.errors,
        )

    def test_modalities_serializer_rejects_duplicates(self):
        serializer = UpdateCommercialOfferModalitiesSerializer(
            data={
                "modalities": [
                    "virtual",
                    "virtual",
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "modalities",
            serializer.errors,
        )

    def test_inventory_serializer_rejects_zero_delta(self):
        serializer = AdjustCommercialOfferInventorySerializer(
            data={
                "quantity_delta": 0,
                "reason_code": "restock",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "quantity_delta",
            serializer.errors,
        )


class CommercialOfferStateTests(SimpleTestCase):
    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "get_owned_commercial_offer"
    )
    def test_archived_offer_cannot_change_availability(
        self,
        get_offer_mock,
    ):
        from apps.commercial.services.commercial_offer_service import (
            set_commercial_offer_availability,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "archived",
            "is_available": False,
        }

        with self.assertRaises(CommercialStateError) as context:
            set_commercial_offer_availability(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                is_available=True,
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_ARCHIVED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "get_owned_commercial_offer"
    )
    def test_offer_rejects_unchanged_availability(
        self,
        get_offer_mock,
    ):
        from apps.commercial.services.commercial_offer_service import (
            set_commercial_offer_availability,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "published",
            "is_available": True,
        }

        with self.assertRaises(CommercialStateError) as context:
            set_commercial_offer_availability(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                is_available=True,
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_AVAILABILITY_UNCHANGED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "get_owned_commercial_offer"
    )
    def test_archived_offer_cannot_update_modalities(
        self,
        get_offer_mock,
    ):
        from apps.commercial.services.commercial_offer_service import (
            update_commercial_offer_modalities,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "archived",
        }

        with self.assertRaises(CommercialStateError) as context:
            update_commercial_offer_modalities(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                modalities=["virtual"],
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_ARCHIVED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "get_owned_commercial_offer"
    )
    def test_archived_offer_cannot_receive_images(
        self,
        get_offer_mock,
    ):
        from apps.commercial.services.commercial_offer_service import (
            add_commercial_offer_image,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "archived",
        }

        with self.assertRaises(CommercialStateError) as context:
            add_commercial_offer_image(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                payload={
                    "file_id": (
                        "00000000-0000-0000-0000-000000000002"
                    ),
                    "sort_order": 0,
                    "is_primary": False,
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_ARCHIVED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "get_owned_commercial_offer"
    )
    def test_archived_offer_cannot_restore_images(
        self,
        get_offer_mock,
    ):
        from apps.commercial.services.commercial_offer_service import (
            restore_commercial_offer_image,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "archived",
        }

        with self.assertRaises(CommercialStateError) as context:
            restore_commercial_offer_image(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                image_id="image-1",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_ARCHIVED",
        )


class CommercialOfferAuditEntityTests(SimpleTestCase):
    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "_get_user_supabase_client"
    )
    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "get_owned_commercial_offer"
    )
    def test_image_added_audit_uses_image_entity(
        self,
        get_offer_mock,
        get_client_mock,
    ):
        from apps.commercial.services.commercial_offer_service import (
            add_commercial_offer_image,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "published",
        }

        class Response:
            data = [
                {
                    "id": "image-1",
                    "commercial_offer_id": "offer-1",
                    "file_id": (
                        "00000000-0000-0000-0000-000000000002"
                    ),
                    "sort_order": 0,
                    "is_primary": False,
                    "status": "active",
                    "archived_at": None,
                    "created_at": None,
                    "updated_at": None,
                }
            ]

        class Query:
            def insert(self, *_args, **_kwargs):
                return self

            def execute(self):
                return Response()

        class Client:
            def table(self, _table_name):
                return Query()

        get_client_mock.return_value = Client()

        with patch(
            "apps.commercial.services."
            "commercial_offer_service."
            "_validate_offer_image_file"
        ), patch(
            "apps.commercial.services."
            "commercial_offer_service."
            "_write_offer_audit_event"
        ) as audit_mock:
            add_commercial_offer_image(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                payload={
                    "file_id": (
                        "00000000-0000-0000-0000-000000000002"
                    ),
                    "sort_order": 0,
                    "is_primary": False,
                },
            )

        self.assertEqual(
            audit_mock.call_args.kwargs["entity_type"],
            "commercial_offer_image",
        )
        self.assertEqual(
            audit_mock.call_args.kwargs["entity_id"],
            "image-1",
        )
