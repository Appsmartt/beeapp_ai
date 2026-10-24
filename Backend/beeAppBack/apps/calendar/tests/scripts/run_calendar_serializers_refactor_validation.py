from __future__ import annotations

import ast
import importlib
import os
import sys
import traceback
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

SCRIPT_PATH = Path(__file__).resolve()
PROJECT_ROOT = SCRIPT_PATH.parents[4]
REPOSITORY_ROOT = PROJECT_ROOT.parents[1]
PACKAGE_PATH = PROJECT_ROOT / "apps" / "calendar" / "serializers"
LEGACY_PATH = PROJECT_ROOT / "apps" / "calendar" / "serializers.py"
REPORT_PATH = REPOSITORY_ROOT / "tmp" / "calendar_serializers_refactor_validation_report.txt"

EXPECTED_EXPORTS = {
    "BaseCalendarEventSerializer",
    "CalendarConflictQuerySerializer",
    "CalendarEventListQuerySerializer",
    "CalendarIntegrationListQuerySerializer",
    "CalendarIntegrationSyncRequestSerializer",
    "CalendarListQuerySerializer",
    "CalendarUserSearchQuerySerializer",
    "ConferenceSerializer",
    "CreateCalendarEventSerializer",
    "CreateCalendarSerializer",
    "CreateCalendarShareSerializer",
    "CreateCalendarTagSerializer",
    "CreateInviteeRequestSerializer",
    "DeclinedEventVisibilitySerializer",
    "DuplicateCalendarEventSerializer",
    "EventRsvpSerializer",
    "RecurrenceSerializer",
    "ReminderSerializer",
    "RemoveEventAttendeeSerializer",
    "ReviewInviteeRequestSerializer",
    "UUIDListField",
    "UpdateCalendarEventSerializer",
    "UpdateCalendarPreferencesSerializer",
    "UpdateCalendarSerializer",
    "UpdateCalendarTagSerializer",
    "UpdateExternalCalendarPreferencesSerializer",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def add_section(lines: list[str], title: str) -> None:
    lines.append(f"\n=== {title} ===")


def initialize_django() -> None:
    project_root = str(PROJECT_ROOT)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")

    import django

    django.setup()


def validate_structure(lines: list[str]) -> None:
    add_section(lines, "STRUCTURE")
    require(not LEGACY_PATH.exists(), "Legacy serializers.py still exists.")
    require(PACKAGE_PATH.is_dir(), "Serializers package does not exist.")

    modules = sorted(PACKAGE_PATH.glob("*.py"))
    require(modules, "No serializer modules were found.")

    for module_path in modules:
        line_count = len(module_path.read_text(encoding="utf-8").splitlines())
        lines.append(f"LINES: {module_path.name} -> {line_count}")
        require(
            line_count <= 400,
            f"Serializer file exceeds 400 lines: {module_path.name}",
        )

    lines.append("STRUCTURE_RESULT: PASS")


def validate_dependency_cycles(lines: list[str]) -> None:
    add_section(lines, "DEPENDENCY CYCLES")
    modules = {
        path.stem: path
        for path in PACKAGE_PATH.glob("*.py")
        if path.name != "__init__.py"
    }
    graph = {name: set() for name in modules}
    prefix = "apps.calendar.serializers."

    for name, path in modules.items():
        tree = ast.parse(path.read_text(encoding="utf-8"))

        for node in ast.walk(tree):
            if not isinstance(node, ast.ImportFrom) or not node.module:
                continue

            if node.module.startswith(prefix):
                dependency = node.module.removeprefix(prefix).split(".")[0]

                if dependency in graph:
                    graph[name].add(dependency)

    active: set[str] = set()
    visited: set[str] = set()
    cycles: list[list[str]] = []

    def visit(module_name: str, trail: list[str]) -> None:
        if module_name in active:
            cycles.append(trail[trail.index(module_name):] + [module_name])
            return

        if module_name in visited:
            return

        visited.add(module_name)
        active.add(module_name)

        for dependency in graph[module_name]:
            visit(dependency, trail + [dependency])

        active.remove(module_name)

    for module_name in graph:
        visit(module_name, [module_name])

    require(not cycles, f"Dependency cycles found: {cycles}")
    lines.append("DEPENDENCY_CYCLES_RESULT: PASS")


def validate_public_contract(lines: list[str]) -> None:
    add_section(lines, "PUBLIC CONTRACT")
    module = importlib.import_module("apps.calendar.serializers")
    exports = set(module.__all__)

    require(exports == EXPECTED_EXPORTS, "Serializer public exports changed.")

    for name in sorted(EXPECTED_EXPORTS):
        serializer_class = getattr(module, name, None)
        require(serializer_class is not None, f"Missing export: {name}")
        lines.append(f"EXPORT: {name} -> {serializer_class.__module__}")

    lines.append("PUBLIC_CONTRACT_RESULT: PASS")


def validate_serializer_behavior(lines: list[str]) -> None:
    add_section(lines, "SERIALIZER BEHAVIOR")
    from apps.calendar.serializers import (
        CalendarConflictQuerySerializer,
        CalendarEventListQuerySerializer,
        CreateCalendarEventSerializer,
        CreateCalendarSerializer,
        DuplicateCalendarEventSerializer,
        RecurrenceSerializer,
        UpdateCalendarEventSerializer,
        UpdateCalendarPreferencesSerializer,
        UUIDListField,
    )

    start = datetime(2026, 10, 3, 12, 0, tzinfo=timezone.utc)
    end = start + timedelta(hours=1)
    first_id = uuid4()
    second_id = uuid4()

    create_calendar = CreateCalendarSerializer(
        data={"name": "  BeeApp Calendar  "}
    )
    require(create_calendar.is_valid(), create_calendar.errors)
    require(
        create_calendar.validated_data["name"] == "BeeApp Calendar",
        "Calendar name normalization changed.",
    )

    uuid_list = UUIDListField()
    normalized_ids = uuid_list.run_validation(
        [str(first_id), str(first_id), str(second_id)]
    )
    require(
        normalized_ids == [first_id, second_id],
        "UUID list deduplication changed.",
    )

    event = CreateCalendarEventSerializer(
        data={
            "calendar_id": str(first_id),
            "title": "  Planning  ",
            "starts_at": start.isoformat(),
            "ends_at": end.isoformat(),
            "tag_ids": [str(second_id), str(second_id)],
            "reminders": [
                {"channel": "push", "offset_minutes": 10},
            ],
        }
    )
    require(event.is_valid(), event.errors)
    require(
        event.validated_data["title"] == "Planning",
        "Event title normalization changed.",
    )
    require(
        event.validated_data["tag_ids"] == [second_id],
        "Event UUID deduplication changed.",
    )

    invalid_event = CreateCalendarEventSerializer(
        data={
            "calendar_id": str(first_id),
            "title": "Invalid",
            "starts_at": end.isoformat(),
            "ends_at": start.isoformat(),
        }
    )
    require(
        not invalid_event.is_valid(),
        "Invalid timed event was accepted.",
    )

    invalid_patch = UpdateCalendarEventSerializer(
        data={"starts_at": start.isoformat()}
    )
    require(
        not invalid_patch.is_valid(),
        "Partial timing patch was accepted.",
    )

    valid_patch = UpdateCalendarEventSerializer(
        data={
            "is_all_day": True,
            "starts_at": None,
            "ends_at": None,
            "starts_on": date(2026, 10, 3).isoformat(),
            "ends_on": date(2026, 10, 4).isoformat(),
        }
    )
    require(valid_patch.is_valid(), valid_patch.errors)

    invalid_duplicate = DuplicateCalendarEventSerializer(
        data={
            "starts_at": start.isoformat(),
            "ends_at": end.isoformat(),
            "starts_on": date(2026, 10, 3).isoformat(),
            "ends_on": date(2026, 10, 4).isoformat(),
        }
    )
    require(
        not invalid_duplicate.is_valid(),
        "Duplicate event accepted mixed time modes.",
    )

    recurrence = RecurrenceSerializer(
        data={"rrule": "freq=weekly;byday=MO", "frequency": "weekly"}
    )
    require(recurrence.is_valid(), recurrence.errors)
    require(
        recurrence.validated_data["rrule"] == "FREQ=WEEKLY;BYDAY=MO",
        "RRULE normalization changed.",
    )

    preferences = UpdateCalendarPreferencesSerializer(
        data={
            "default_reminders": [
                {"channel": "push", "offset_minutes": 10},
                {"channel": "push", "offset_minutes": 10},
            ]
        }
    )
    require(
        not preferences.is_valid(),
        "Duplicate preference reminders were accepted.",
    )

    conflicts = CalendarConflictQuerySerializer(
        data={
            "is_all_day": False,
            "starts_at": start.isoformat(),
            "ends_at": end.isoformat(),
        }
    )
    require(conflicts.is_valid(), conflicts.errors)

    event_query = CalendarEventListQuerySerializer(
        data={
            "range_start": start.isoformat(),
            "range_end": end.isoformat(),
            "limit": 1000,
        }
    )
    require(event_query.is_valid(), event_query.errors)

    lines.append("SERIALIZER_BEHAVIOR_RESULT: PASS")


def validate_import_stability(lines: list[str]) -> None:
    add_section(lines, "IMPORT STABILITY")

    for cycle in range(1, 21):
        module = importlib.import_module("apps.calendar.serializers")
        require(
            set(module.__all__) == EXPECTED_EXPORTS,
            f"Public contract changed in import cycle {cycle}.",
        )

        for name in module.__all__:
            require(
                getattr(module, name, None) is not None,
                f"Missing export in import cycle {cycle}: {name}",
            )

        lines.append(f"CYCLE_{cycle:02d}: PASS")

    lines.append("IMPORT_STABILITY_RESULT: PASS")


def main() -> int:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = ["CALENDAR SERIALIZERS REFACTOR VALIDATION REPORT"]

    try:
        initialize_django()
        validate_structure(lines)
        validate_dependency_cycles(lines)
        validate_public_contract(lines)
        validate_serializer_behavior(lines)
        validate_import_stability(lines)
        lines.append("\nFINAL_RESULT: PASS")
        result = 0
    except Exception as error:
        lines.append("\nFINAL_RESULT: FAIL")
        lines.append(f"ERROR: {error}")
        lines.extend(traceback.format_exc().rstrip().splitlines())
        result = 1

    REPORT_PATH.write_text(
        "\n".join(lines).rstrip() + "\n",
        encoding="utf-8",
    )
    return result


if __name__ == "__main__":
    raise SystemExit(main())
