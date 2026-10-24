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
