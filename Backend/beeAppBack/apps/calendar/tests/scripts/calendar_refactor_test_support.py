from __future__ import annotations

import ast
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

BACKEND_ROOT = Path(__file__).resolve().parents[4]
ROOT = BACKEND_ROOT.parents[1]
MODULE_ROOT = (
    BACKEND_ROOT
    / "apps"
    / "calendar"
    / "services"
    / "calendar_service_modules"
)

sys.path.insert(0, str(BACKEND_ROOT))

from apps.calendar.services import calendar_service
from apps.calendar.services.calendar_service_modules import shared


EXPECTED_EXPORTS = {
    "create_calendar",
    "create_calendar_event",
    "create_calendar_tag",
    "delete_calendar",
    "delete_calendar_event",
    "delete_calendar_event",
    "delete_calendar_tag",
    "duplicate_calendar_event",
    "get_calendar_bootstrap",
    "get_calendar_event_details",
    "get_calendar_preferences",
    "list_calendar_events",
    "list_calendar_tags",
    "list_calendars",
    "search_beeapp_users",
    "update_calendar",
    "update_calendar_event",
    "update_calendar_preferences",
    "update_calendar_tag",
}


class FakeQuery:
    def __init__(self, response=None, error=None):
        self.response = response or SimpleNamespace(data=[])
        self.error = error

    def __getattr__(self, _name):
        return lambda *args, **kwargs: self

    def execute(self):
        if self.error:
            raise self.error

        return self.response


class FakeSupabase:
    def __init__(self, table_responses=None):
        self.table_responses = table_responses or {}
        self.deleted_event_ids = []

    def table(self, name):
        response = self.table_responses.get(
            name,
            SimpleNamespace(data=[]),
        )
        query = FakeQuery(response=response)

        if name == "calendar_events":
            original_delete = query.delete

            def delete():
                original_delete()
                self.deleted_event_ids.append("deleted")
                return query

            query.delete = delete

        return query


def assert_equal(actual, expected, message):
    if actual != expected:
        raise AssertionError(
            f"{message}: expected={expected!r}, actual={actual!r}"
        )


def test_facade_exports():
    assert_equal(set(calendar_service.__all__), EXPECTED_EXPORTS, "exports")
    assert all(
        callable(getattr(calendar_service, name, None))
        for name in EXPECTED_EXPORTS
    )


def test_file_limits():
    oversized = [
        (path.name, len(path.read_text().splitlines()))
        for path in MODULE_ROOT.glob("*.py")
        if len(path.read_text().splitlines()) > 400
    ]
    assert_equal(oversized, [], "oversized_modules")


def test_dependency_cycles():
    modules = {
        path.stem: path
        for path in MODULE_ROOT.glob("*.py")
        if path.name != "__init__.py"
    }
    graph = {name: set() for name in modules}

    for name, path in modules.items():
        tree = ast.parse(path.read_text())

        for node in ast.walk(tree):
            if not isinstance(node, ast.ImportFrom) or not node.module:
                continue

            prefix = "apps.calendar.services.calendar_service_modules."

            if node.module.startswith(prefix):
                dependency = node.module.removeprefix(prefix).split(".")[0]

                if dependency in graph:
                    graph[name].add(dependency)

    visited = set()
    active = set()
    cycles = []

    def visit(module, trail):
        if module in active:
            cycles.append(trail[trail.index(module):] + [module])
            return

        if module in visited:
            return

        visited.add(module)
        active.add(module)

        for dependency in graph[module]:
            visit(dependency, trail + [dependency])

        active.remove(module)

    for module in graph:
        visit(module, [module])

    assert_equal(cycles, [], "dependency_cycles")


def test_shared_serializers():
    moment = datetime(2026, 10, 3, 12, 30, tzinfo=timezone.utc)
    assert_equal(shared.iso_datetime(moment), moment.isoformat(), "datetime")
    assert_equal(shared.iso_date("2026-10-03"), "2026-10-03", "date")
    assert_equal(shared.iso_time("09:30:00"), "09:30:00", "time")
    assert_equal(shared.to_string_list(["one", "two"]), ["one", "two"], "ids")


STRUCTURAL_TESTS = [
    test_facade_exports,
    test_file_limits,
    test_dependency_cycles,
    test_shared_serializers,
]
