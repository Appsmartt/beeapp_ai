from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialValidationError
from apps.commercial.services.domain.request_draft import build_request_draft


def product_item(
    *,
    business_id: str = "business-1",
    offer_id: str = "offer-1",
    price: int | None = 10000,
    quantity: int = 1,
) -> dict:
    return {
        "commercial_offer_id": offer_id,
        "commercial_profile_id": business_id,
        "offer_kind": "product",
        "title": "Producto de prueba",
        "quantity": quantity,
        "unit_price_amount": price,
        "pricing_strategy": "fixed",
        "requested_modality": "delivery",
        "requires_booking": False,
        "offer_snapshot": {"title": "Producto de prueba"},
    }


def service_item(
    *,
    requires_booking: bool = False,
    duration_minutes: int | None = None,
) -> dict:
    return {
        "commercial_offer_id": "offer-service-1",
        "commercial_profile_id": "business-1",
        "offer_kind": "service",
        "title": "Servicio de prueba",
        "quantity": 1,
        "unit_price_amount": 50000,
        "pricing_strategy": "fixed",
        "requested_modality": "at_establishment",
        "requires_booking": requires_booking,
        "duration_minutes": duration_minutes,
        "payment_policy": "required_before_confirmation",
        "offer_snapshot": {"title": "Servicio de prueba"},
    }


class RequestDraftTests(SimpleTestCase):
    def test_product_cart_calculates_total_for_one_business(self):
        draft = build_request_draft(
            {
                "request_type": "product_order",
                "commercial_profile_id": "business-1",
                "requested_modality": "delivery",
                "delivery_address": "Calle 1 # 2-3",
                "delivery_fee_mode": "fixed",
                "delivery_fee_amount": 5000,
                "items": [
                    product_item(quantity=2),
                    product_item(offer_id="offer-2", price=3000, quantity=3),
                ],
            }
        )

        self.assertEqual(draft.subtotal_amount, 29000)
        self.assertEqual(draft.delivery_fee_amount, 5000)
        self.assertEqual(draft.total_amount, 34000)
        self.assertEqual(len(draft.items), 2)

    def test_rejects_cart_with_mixed_businesses(self):
        with self.assertRaises(CommercialValidationError) as context:
            build_request_draft(
                {
                    "request_type": "product_order",
                    "commercial_profile_id": "business-1",
                    "delivery_fee_mode": "not_offered",
                    "items": [
                        product_item(business_id="business-1"),
                        product_item(
                            business_id="business-2",
                            offer_id="offer-2",
                        ),
                    ],
                }
            )

        self.assertEqual(context.exception.code, "mixed_business_cart")

    def test_delivery_requires_address(self):
        with self.assertRaises(CommercialValidationError) as context:
            build_request_draft(
                {
                    "request_type": "product_order",
                    "commercial_profile_id": "business-1",
                    "requested_modality": "delivery",
                    "delivery_fee_mode": "free",
                    "items": [product_item()],
                }
            )

        self.assertEqual(context.exception.code, "delivery_address_required")

    def test_to_be_confirmed_delivery_leaves_total_unknown(self):
        draft = build_request_draft(
            {
                "request_type": "product_order",
                "commercial_profile_id": "business-1",
                "requested_modality": "delivery",
                "delivery_address": "Carrera 1 # 1-1",
                "delivery_fee_mode": "to_be_confirmed",
                "items": [product_item()],
            }
        )

        self.assertEqual(draft.subtotal_amount, 10000)
        self.assertIsNone(draft.delivery_fee_amount)
        self.assertIsNone(draft.total_amount)

    def test_service_request_requires_one_non_bookable_service(self):
        draft = build_request_draft(
            {
                "request_type": "service_request",
                "commercial_profile_id": "business-1",
                "delivery_fee_mode": "not_offered",
                "items": [service_item()],
            }
        )

        self.assertEqual(draft.request_type, "service_request")
        self.assertEqual(len(draft.items), 1)

    def test_booking_request_requires_bookable_service(self):
        draft = build_request_draft(
            {
                "request_type": "booking_request",
                "commercial_profile_id": "business-1",
                "delivery_fee_mode": "not_offered",
                "items": [
                    service_item(
                        requires_booking=True,
                        duration_minutes=60,
                    )
                ],
            }
        )

        self.assertEqual(draft.request_type, "booking_request")
        self.assertTrue(draft.items[0].requires_booking)

    def test_rejects_booking_request_for_non_bookable_service(self):
        with self.assertRaises(CommercialValidationError) as context:
            build_request_draft(
                {
                    "request_type": "booking_request",
                    "commercial_profile_id": "business-1",
                    "delivery_fee_mode": "not_offered",
                    "items": [service_item()],
                }
            )

        self.assertEqual(context.exception.code, "booking_offer_required")

    def test_rejects_product_in_service_request(self):
        with self.assertRaises(CommercialValidationError) as context:
            build_request_draft(
                {
                    "request_type": "service_request",
                    "commercial_profile_id": "business-1",
                    "delivery_fee_mode": "not_offered",
                    "items": [product_item()],
                }
            )

        self.assertEqual(context.exception.code, "service_request_items_invalid")

    def test_rejects_delivery_when_not_offered(self):
        with self.assertRaises(CommercialValidationError) as context:
            build_request_draft(
                {
                    "request_type": "product_order",
                    "commercial_profile_id": "business-1",
                    "requested_modality": "delivery",
                    "delivery_address": "Calle 1",
                    "delivery_fee_mode": "not_offered",
                    "items": [product_item()],
                }
            )

        self.assertEqual(context.exception.code, "delivery_not_offered")
