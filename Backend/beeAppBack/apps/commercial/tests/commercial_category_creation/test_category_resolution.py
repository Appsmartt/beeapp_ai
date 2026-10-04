from __future__ import annotations

from unittest import TestCase

from apps.commercial.services.commercial_profile_service import (
    resolve_new_commercial_categories,
)

from .fakes import FakeCommercialCategoriesQuery, FakeSupabase


class ResolveNewCommercialCategoriesTests(TestCase):
    def test_creates_missing_category_and_tracks_created_id(self):
        supabase = FakeSupabase()

        category_ids, created_category_ids = (
            resolve_new_commercial_categories(
                supabase=supabase,
                category_names=[
                    "Reparación de drones agrícolas",
                ],
                offer_type="services",
            )
        )

        self.assertEqual(
            category_ids,
            ["new-category-1"],
        )
        self.assertEqual(
            created_category_ids,
            ["new-category-1"],
        )
        self.assertEqual(
            supabase.commercial_categories.inserted_payloads,
            [
                {
                    "parent_id": None,
                    "offer_type": "services",
                    "name": "Reparación de drones agrícolas",
                    "slug": "reparacion-de-drones-agricolas",
                    "is_active": True,
                    "sort_order": 0,
                }
            ],
        )

    def test_reuses_existing_category_ignoring_case_and_accents(self):
        supabase = FakeSupabase(
            [
                {
                    "id": "existing-category-1",
                    "offer_type": "services",
                    "name": "Reparación de drones",
                    "slug": "reparacion-de-drones",
                    "is_active": True,
                    "sort_order": 10,
                }
            ]
        )

        category_ids, created_category_ids = (
            resolve_new_commercial_categories(
                supabase=supabase,
                category_names=[
                    " reparacion   DE DRONES ",
                ],
                offer_type="services",
            )
        )

        self.assertEqual(
            category_ids,
            ["existing-category-1"],
        )
        self.assertEqual(created_category_ids, [])
        self.assertEqual(
            supabase.commercial_categories.inserted_payloads,
            [],
        )

    def test_unique_collision_reuses_category_created_concurrently(self):
        supabase = FakeSupabase()
        supabase.commercial_categories.raise_unique_on_insert = True

        original_execute = FakeCommercialCategoriesQuery.execute

        def execute_with_concurrent_category(query):
            if (
                query.operation == "insert"
                and query.table.raise_unique_on_insert
            ):
                query.table.categories.append(
                    {
                        "id": "concurrent-category-1",
                        "offer_type": "services",
                        "name": "Reparación de drones",
                        "slug": "reparacion-de-drones",
                        "is_active": True,
                        "sort_order": 0,
                    }
                )

            return original_execute(query)

        FakeCommercialCategoriesQuery.execute = (
            execute_with_concurrent_category
        )

        try:
            category_ids, created_category_ids = (
                resolve_new_commercial_categories(
                    supabase=supabase,
                    category_names=[
                        "Reparación de drones",
                    ],
                    offer_type="services",
                )
            )
        finally:
            FakeCommercialCategoriesQuery.execute = original_execute

        self.assertEqual(
            category_ids,
            ["concurrent-category-1"],
        )
        self.assertEqual(created_category_ids, [])
        self.assertEqual(
            supabase.commercial_categories.inserted_payloads,
            [],
        )

    def test_product_category_can_reuse_mixed_category(self):
        supabase = FakeSupabase(
            [
                {
                    "id": "mixed-category-1",
                    "offer_type": "mixed",
                    "name": "Reparación de drones",
                    "slug": "reparacion-de-drones-mixto",
                    "is_active": True,
                    "sort_order": 10,
                }
            ]
        )

        category_ids, created_category_ids = (
            resolve_new_commercial_categories(
                supabase=supabase,
                category_names=[
                    "REPARACION DE DRONES",
                ],
                offer_type="products",
            )
        )

        self.assertEqual(
            category_ids,
            ["mixed-category-1"],
        )
        self.assertEqual(created_category_ids, [])
