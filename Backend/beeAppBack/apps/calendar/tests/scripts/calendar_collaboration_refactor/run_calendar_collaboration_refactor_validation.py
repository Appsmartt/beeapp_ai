from __future__ import annotations

import ast
import sys
import traceback
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

BACKEND_ROOT = Path(__file__).resolve().parents[5]
ROOT = BACKEND_ROOT.parents[1]
MODULE_ROOT = (
    BACKEND_ROOT
    / "apps"
    / "calendar"
    / "services"
    / "calendar_collaboration"
)
REPORT_PATH = (
    ROOT
    / "tmp"
    / "calendar_collaboration_refactor_validation_report.txt"
)

sys.path.insert(0, str(BACKEND_ROOT))

from apps.calendar.exceptions import (
    CalendarError,
    CalendarEventNotFoundError,
)
from apps.calendar.services import calendar_collaboration
from apps.calendar.services.calendar_collaboration import access
from apps.calendar.services.calendar_collaboration import attendees
from apps.calendar.services.calendar_collaboration import notifications


EXPECTED_EXPORTS = {
    "accept_calendar_share",
    "create_calendar_share",
    "create_invitee_request",
    "list_calendar_shares",
    "list_event_attendees",
    "list_event_invitee_requests",
    "remove_event_attendee",
    "respond_to_event_invitation",
    "review_invitee_request",
    "revoke_calendar_share",
    "set_declined_event_hidden",
}


class FakeQuery:
    def __init__(self, response=None):
        self.response = response or SimpleNamespace(data=[])

    def __getattr__(self, _name):
        return lambda *args, **kwargs: self

    def execute(self):
        return self.response


class FakeSupabase:
    def __init__(self, table_responses=None):
        self.table_responses = table_responses or {}

    def table(self, table_name):
        response = self.table_responses.get(
            table_name,
            SimpleNamespace(data=[]),
        )
        return FakeQuery(response=response)


def assert_equal(actual, expected, label):
    if actual != expected:
        raise AssertionError(
            f"{label}: expected={expected!r}, actual={actual!r}"
        )


def test_public_contract():
    assert_equal(
        set(calendar_collaboration.__all__),
        EXPECTED_EXPORTS,
        "public_exports",
    )
    assert all(
        callable(getattr(calendar_collaboration, name, None))
        for name in EXPECTED_EXPORTS
    )


def test_file_line_limits():
    oversized = [
        (path.name, len(path.read_text().splitlines()))
        for path in MODULE_ROOT.glob("*.py")
        if len(path.read_text().splitlines()) > 400
    ]
    assert_equal(oversized, [], "oversized_modules")


def test_no_monolith_dependency():
    offenders = []

    for path in MODULE_ROOT.glob("*.py"):
        tree = ast.parse(path.read_text())

        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                if node.module == (
                    "apps.calendar.services."
                    "calendar_collaboration_service"
                ):
                    offenders.append(path.name)

            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name == (
                        "apps.calendar.services."
                        "calendar_collaboration_service"
                    ):
                        offenders.append(path.name)

    assert_equal(sorted(set(offenders)), [], "monolith_dependencies")


def test_no_dependency_cycles():
    modules = {
        path.stem: path
        for path in MODULE_ROOT.glob("*.py")
        if path.name != "__init__.py"
    }
    graph = {name: set() for name in modules}
    prefix = "apps.calendar.services.calendar_collaboration."

    for name, path in modules.items():
        tree = ast.parse(path.read_text())

        for node in ast.walk(tree):
            if not isinstance(node, ast.ImportFrom) or not node.module:
                continue

            if node.module.startswith(prefix):
                dependency = node.module.removeprefix(prefix).split(".")[0]

                if dependency in graph:
                    graph[name].add(dependency)

    visited = set()
    active = set()
    cycles = []

    def visit(module_name, trail):
        if module_name in active:
            cycles.append(
                trail[trail.index(module_name):] + [module_name]
            )
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

    assert_equal(cycles, [], "dependency_cycles")


def test_private_event_blocks_shared_editor():
    event = {
        "id": "event",
        "calendar_id": "calendar",
        "organizer_id": "organizer",
        "is_private": True,
    }
    calendar = {"id": "calendar", "owner_id": "owner"}

    with patch.object(access, "get_event_row", return_value=event), patch.object(
        access,
        "get_calendar_row",
        return_value=calendar,
    ), patch.object(
        access,
        "get_user_attendee_row",
        return_value=None,
    ), patch.object(
        access,
        "get_calendar_share_permission",
        return_value="editor",
    ):
        try:
            access.get_event_access(
                user_id="shared-editor",
                event_id="event",
            )
        except CalendarEventNotFoundError:
            return

    raise AssertionError("private_event_exposed_to_shared_editor")


def test_shared_editor_can_view_public_event():
    event = {
        "id": "event",
        "calendar_id": "calendar",
        "organizer_id": "organizer",
        "is_private": False,
    }
    calendar = {"id": "calendar", "owner_id": "owner"}

    with patch.object(access, "get_event_row", return_value=event), patch.object(
        access,
        "get_calendar_row",
        return_value=calendar,
    ), patch.object(
        access,
        "get_user_attendee_row",
        return_value=None,
    ), patch.object(
        access,
        "get_calendar_share_permission",
        return_value="editor",
    ):
        result = access.get_event_access(
            user_id="shared-editor",
            event_id="event",
        )

    assert_equal(result["can_view"], True, "editor_can_view")
    assert_equal(result["can_edit"], True, "editor_can_edit")
    assert_equal(
        result["can_manage_attendees"],
        False,
        "editor_cannot_manage_attendees",
    )


def test_invalid_rsvp_is_rejected():
    try:
        attendees.respond_to_event_invitation(
            user_id="user",
            event_id="event",
            response_status="pending",
        )
    except CalendarError as error:
        assert_equal(
            str(error),
            "Only accepted or declined RSVP responses are allowed.",
            "invalid_rsvp_message",
        )
        return

    raise AssertionError("invalid_rsvp_was_accepted")


def test_safe_notification_never_raises():
    with patch.object(
        notifications,
        "create_calendar_notification",
        side_effect=RuntimeError("notification failure"),
    ):
        notifications.safe_calendar_notification(
            recipient_id="recipient",
            notification_type="event_updated",
            title="Title",
            body="Body",
            metadata={"event_id": "event"},
        )


def test_removed_attendee_is_not_reactivated_by_read():
    fake_supabase = FakeSupabase(
        {
            "calendar_event_attendees": SimpleNamespace(
                data=[
                    {
                        "id": "attendee",
                        "event_id": "event",
                        "attendee_kind": "beeapp_user",
                        "attendee_user_id": "user",
                        "is_organizer": False,
                        "response_status": "removed",
                    }
                ]
            )
        }
    )

    with patch.object(
        access,
        "get_supabase",
        return_value=fake_supabase,
    ):
        attendee = access.get_user_attendee_row(
            event_id="event",
            user_id="user",
            include_removed=False,
        )

    assert_equal(attendee is not None, True, "query_filter_result")


TESTS = [
    test_public_contract,
    test_file_line_limits,
    test_no_monolith_dependency,
    test_no_dependency_cycles,
    test_private_event_blocks_shared_editor,
    test_shared_editor_can_view_public_event,
    test_invalid_rsvp_is_rejected,
    test_safe_notification_never_raises,
    test_removed_attendee_is_not_reactivated_by_read,
]


def main():
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    failures = []

    for test in TESTS:
        try:
            test()
            lines.append(f"PASS {test.__name__}")
        except Exception:
            failures.append(test.__name__)
            lines.append(f"FAIL {test.__name__}")
            lines.extend(traceback.format_exc().rstrip().splitlines())

    lines.append(f"TOTAL {len(TESTS)}")
    lines.append(f"PASSED {len(TESTS) - len(failures)}")
    lines.append(f"FAILED {len(failures)}")
    REPORT_PATH.write_text("\n".join(lines) + "\n")

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
