from __future__ import annotations

from dataclasses import dataclass


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
