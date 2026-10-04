from __future__ import annotations

from unittest import TestCase

from apps.commercial.exceptions import CommercialProfileValidationError
from apps.commercial.services.commercial_profile_service import (
    build_commercial_category_slug,
    commercial_category_name_key,
    is_commercial_category_unique_violation,
    normalize_commercial_category_name,
)


class CommercialCategoryNameTests(TestCase):
    def test_normalizes_whitespace(self):
        self.assertEqual(
            normalize_commercial_category_name(
                "  Reparación   de   drones  "
            ),
            "Reparación de drones",
        )

    def test_normalized_key_ignores_case_and_accents(self):
        self.assertEqual(
            commercial_category_name_key(
                "Reparación de Drones"
            ),
            commercial_category_name_key(
                "reparacion   de drones"
            ),
        )

    def test_builds_slug_without_accents(self):
        self.assertEqual(
            build_commercial_category_slug(
                "Reparación de drones agrícolas"
            ),
            "reparacion-de-drones-agricolas",
        )

    def test_rejects_blank_category_name(self):
        with self.assertRaises(
            CommercialProfileValidationError,
        ):
            normalize_commercial_category_name("   ")

    def test_recognizes_unique_constraint_error(self):
        self.assertTrue(
            is_commercial_category_unique_violation(
                Exception(
                    "23505 duplicate key value violates "
                    "unique constraint "
                    "commercial_categories_active_offer_type_"
                    "normalized_name_key"
                )
            )
        )

    def test_ignores_non_unique_error(self):
        self.assertFalse(
            is_commercial_category_unique_violation(
                Exception("permission denied for table")
            )
        )
