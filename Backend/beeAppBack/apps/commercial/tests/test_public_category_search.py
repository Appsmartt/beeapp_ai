from __future__ import annotations

from dataclasses import dataclass
from unittest import TestCase

from apps.commercial.serializers import (
    PublicCommercialCategoriesQuerySerializer,
)
from apps.commercial.services import commercial_public_service


@dataclass
class FakeResponse:
    data: list[dict]


class FakeCategoryQuery:
    def __init__(self, rows: list[dict]):
        self.rows = rows
        self.filters: dict[str, object] = {}

    def select(self, *_args):
        return self

    def eq(self, key: str, value):
        self.filters[key] = value
        return self

    def in_(self, key: str, values):
        self.filters[key] = list(values)
        return self

    def ilike(self, key: str, value: str):
        self.filters[key] = value
        return self

    def execute(self):
        rows = list(self.rows)

        if "is_active" in self.filters:
            rows = [
                row for row in rows
                if row.get("is_active")
                == self.filters["is_active"]
            ]

        if "offer_type" in self.filters:
            rows = [
                row for row in rows
                if row.get("offer_type")
                in self.filters["offer_type"]
            ]

        if "normalized_name" in self.filters:
            needle = str(
                self.filters["normalized_name"]
            ).strip("%").casefold()
            rows = [
                row for row in rows
                if needle in str(
                    row.get("normalized_name") or ""
                ).casefold()
            ]

        return FakeResponse(rows)


class FakeSupabase:
    def __init__(self, rows: list[dict]):
        self.rows = rows

    def table(self, name: str):
        if name != "commercial_categories":
            raise AssertionError(
                f"Unexpected table: {name}"
            )
        return FakeCategoryQuery(self.rows)


class PublicCategorySearchTests(TestCase):
    def setUp(self):
        self.rows = [
            {
                "id": "restaurant",
                "parent_id": None,
                "offer_type": "services",
                "name": "Restaurante",
                "slug": "restaurante",
                "sort_order": 20,
                "normalized_name": "restaurante",
                "is_active": True,
            },
            {
                "id": "restaurant-supplies",
                "parent_id": None,
                "offer_type": "products",
                "name": "Suministros para restaurante",
                "slug": "suministros-restaurante",
                "sort_order": 1,
                "normalized_name": "suministros para restaurante",
                "is_active": True,
            },
            {
                "id": "mixed-repairs",
                "parent_id": None,
                "offer_type": "mixed",
                "name": "Reparación de equipos",
                "slug": "reparacion-equipos",
                "sort_order": 5,
                "normalized_name": "reparacion de equipos",
                "is_active": True,
            },
            {
                "id": "inactive-restaurant",
                "parent_id": None,
                "offer_type": "services",
                "name": "Restaurante inactivo",
                "slug": "restaurante-inactivo",
                "sort_order": 0,
                "normalized_name": "restaurante inactivo",
                "is_active": False,
            },
        ]

    def query(self, **kwargs):
        original = (
            commercial_public_service.execute_with_supabase_admin_retry
        )
        commercial_public_service.execute_with_supabase_admin_retry = (
            lambda operation: operation(FakeSupabase(self.rows))
        )
        try:
            return commercial_public_service.list_public_categories(
                **kwargs
            )
        finally:
            commercial_public_service.execute_with_supabase_admin_retry = (
                original
            )

    def test_rejects_one_character_search(self):
        serializer = PublicCommercialCategoriesQuerySerializer(
            data={"search": "r"}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("search", serializer.errors)

    def test_prefix_result_precedes_internal_match(self):
        result = self.query(
            offer_type="mixed",
            search="rest",
            limit=5,
        )

        self.assertEqual(
            [item["id"] for item in result],
            ["restaurant", "restaurant-supplies"],
        )

    def test_products_include_mixed_categories(self):
        result = self.query(
            offer_type="products",
            search="re",
            limit=5,
        )

        self.assertEqual(
            [item["id"] for item in result],
            [
            "mixed-repairs",
            "restaurant-supplies",
        ],
        )

    def test_excludes_inactive_categories(self):
        result = self.query(
            offer_type="services",
            search="rest",
            limit=5,
        )

        self.assertEqual(
            [item["id"] for item in result],
            ["restaurant"],
        )

    def test_caps_limit_at_five(self):
        self.rows = [
            {
                "id": f"category-{index}",
                "parent_id": None,
                "offer_type": "services",
                "name": f"Servicio {index}",
                "slug": f"servicio-{index}",
                "sort_order": index,
                "normalized_name": f"servicio {index}",
                "is_active": True,
            }
            for index in range(10)
        ]

        result = self.query(
            offer_type="services",
            search="se",
            limit=99,
        )

        self.assertEqual(len(result), 5)
