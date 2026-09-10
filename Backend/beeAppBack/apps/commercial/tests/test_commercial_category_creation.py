from __future__ import annotations

from dataclasses import dataclass
from unittest import TestCase

from apps.commercial.exceptions import (
    CommercialProfileValidationError,
)
from apps.commercial.serializers import (
    CreateCommercialProfileSerializer,
)
from apps.commercial.services.commercial_profile_service import (
    build_commercial_category_slug,
    commercial_category_name_key,
    is_commercial_category_unique_violation,
    normalize_commercial_category_name,
    resolve_new_commercial_categories,
)


@dataclass
class FakeResponse:
    data: list[dict] | dict | None


class FakeCommercialCategoriesQuery:
    def __init__(
        self,
        table: "FakeCommercialCategoriesTable",
    ):
        self.table = table
        self.operation = ""
        self.insert_payload: dict | None = None
        self.filters: dict[str, object] = {}

    def select(self, *_args):
        self.operation = "select"
        return self

    def eq(self, key: str, value):
        self.filters[key] = value
        return self

    def in_(self, key: str, values):
        self.filters[key] = list(values)
        return self

    def order(self, *_args, **_kwargs):
        return self

    def maybe_single(self):
        self.operation = "maybe_single"
        return self

    def insert(self, payload: dict):
        self.operation = "insert"
        self.insert_payload = dict(payload)
        return self

    def execute(self):
        if self.operation == "maybe_single":
            slug = str(self.filters.get("slug") or "")

            for category in self.table.categories:
                if category["slug"] == slug:
                    return FakeResponse(category)

            return FakeResponse(None)

        if self.operation == "select":
            categories = list(self.table.categories)

            if "is_active" in self.filters:
                categories = [
                    category
                    for category in categories
                    if category["is_active"]
                    == self.filters["is_active"]
                ]

            if "offer_type" in self.filters:
                allowed_offer_types = self.filters["offer_type"]
                categories = [
                    category
                    for category in categories
                    if category["offer_type"] in allowed_offer_types
                ]

            return FakeResponse(categories)

        if self.operation == "insert":
            if self.table.raise_unique_on_insert:
                self.table.raise_unique_on_insert = False
                raise Exception(
                    "23505 duplicate key value violates unique "
                    "constraint "
                    "commercial_categories_active_offer_type_"
                    "normalized_name_key"
                )

            if not self.insert_payload:
                raise AssertionError("Missing insert payload.")

            category = {
                "id": (
                    f"new-category-{len(self.table.categories) + 1}"
                ),
                **self.insert_payload,
            }
            self.table.categories.append(category)
            self.table.inserted_payloads.append(
                dict(self.insert_payload)
            )

            return FakeResponse([category])

        raise AssertionError(
            f"Unexpected query operation: {self.operation}"
        )


class FakeCommercialCategoriesTable:
    def __init__(self, categories: list[dict] | None = None):
        self.categories = list(categories or [])
        self.inserted_payloads: list[dict] = []
        self.raise_unique_on_insert = False

    def select(self, *_args):
        query = FakeCommercialCategoriesQuery(self)
        return query.select(*_args)

    def insert(self, payload: dict):
        query = FakeCommercialCategoriesQuery(self)
        return query.insert(payload)


class FakeSupabase:
    def __init__(
        self,
        categories: list[dict] | None = None,
    ):
        self.commercial_categories = (
            FakeCommercialCategoriesTable(categories)
        )

    def table(self, table_name: str):
        if table_name != "commercial_categories":
            raise AssertionError(
                f"Unexpected table: {table_name}"
            )

        return self.commercial_categories


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
