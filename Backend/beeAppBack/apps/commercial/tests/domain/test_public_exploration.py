from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialValidationError
from apps.commercial.services.domain.public_exploration import (
    parse_public_business_filters,
)


class PublicExplorationFiltersTests(SimpleTestCase):
    def test_uses_safe_defaults(self):
        filters = parse_public_business_filters({})

        self.assertEqual(filters.page, 1)
        self.assertEqual(filters.page_size, 20)
        self.assertEqual(filters.ordering, "featured")
        self.assertFalse(filters.verified_only)
        self.assertFalse(filters.delivery_only)

    def test_normalizes_country_and_boolean_filters(self):
        filters = parse_public_business_filters(
            {
                "country_code": " co ",
                "city": " Bogotá ",
                "verified_only": "true",
                "delivery_only": "1",
                "ordering": "recent",
                "page": "2",
                "page_size": "50",
            }
        )

        self.assertEqual(filters.country_code, "CO")
        self.assertEqual(filters.city, "Bogotá")
        self.assertTrue(filters.verified_only)
        self.assertTrue(filters.delivery_only)
        self.assertEqual(filters.ordering, "recent")
        self.assertEqual(filters.page, 2)
        self.assertEqual(filters.page_size, 50)

    def test_rejects_gps_or_distance_parameters_by_not_accepting_them(self):
        filters = parse_public_business_filters(
            {
                "latitude": "4.65",
                "longitude": "-74.05",
                "distance_km": "5",
            }
        )

        self.assertIsNone(filters.country_code)
        self.assertIsNone(filters.city)
        self.assertIsNone(filters.search)

    def test_rejects_invalid_offer_type(self):
        with self.assertRaises(CommercialValidationError) as context:
            parse_public_business_filters({"offer_type": "anything"})

        self.assertEqual(context.exception.code, "offer_type_invalid")

    def test_rejects_invalid_modality(self):
        with self.assertRaises(CommercialValidationError) as context:
            parse_public_business_filters({"modality": "teleport"})

        self.assertEqual(context.exception.code, "modality_invalid")

    def test_rejects_invalid_boolean(self):
        with self.assertRaises(CommercialValidationError) as context:
            parse_public_business_filters({"verified_only": "sometimes"})

        self.assertEqual(context.exception.code, "verified_only_invalid")

    def test_rejects_page_size_over_limit(self):
        with self.assertRaises(CommercialValidationError) as context:
            parse_public_business_filters({"page_size": "51"})

        self.assertEqual(context.exception.code, "page_size_out_of_range")
