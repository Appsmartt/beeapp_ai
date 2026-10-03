from __future__ import annotations

import importlib
import os
import subprocess
import sys
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve()
PROJECT_ROOT = SCRIPT_PATH.parents[4]
REPOSITORY_ROOT = PROJECT_ROOT.parents[1]
REPORT_PATH = REPOSITORY_ROOT / "tmp" / "calendar_views_refactor_validation_report.txt"
VIEWS_PATH = PROJECT_ROOT / "apps" / "calendar" / "views"
MONOLITH_PATH = PROJECT_ROOT / "apps" / "calendar" / "views.py"

EXPECTED_VIEW_NAMES = {
    "CalendarBootstrapView",
    "CalendarConflictView",
    "CalendarDetailView",
    "CalendarEventAttendeesView",
    "CalendarEventDetailView",
    "CalendarEventDuplicateView",
    "CalendarEventInviteeRequestsView",
    "CalendarEventRsvpView",
    "CalendarEventsView",
    "CalendarExternalCalendarDetailView",
    "CalendarIntegrationDetailView",
    "CalendarIntegrationDiscoverCalendarsView",
    "CalendarIntegrationExternalCalendarsView",
    "CalendarIntegrationSyncView",
    "CalendarIntegrationsView",
    "CalendarInviteeRequestDetailView",
    "CalendarPreferencesView",
    "CalendarShareAcceptView",
    "CalendarShareDetailView",
    "CalendarSharesView",
    "CalendarTagDetailView",
    "CalendarTagsView",
    "CalendarUsersSearchView",
    "CalendarsView",
    "DeclinedEventVisibilityView",
}


def add_section(lines: list[str], title: str) -> None:
    lines.append(f"\n=== {title} ===")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def run_command(command: list[str]) -> tuple[int, str]:
    environment = os.environ.copy()
    environment.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")
    environment["PYTHONPATH"] = (
        f"{PROJECT_ROOT}{os.pathsep}"
        f"{environment.get('PYTHONPATH', '')}"
    ).rstrip(os.pathsep)

    completed = subprocess.run(
        command,
        cwd=PROJECT_ROOT,
        env=environment,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    return completed.returncode, completed.stdout


def validate_project_paths(lines: list[str]) -> None:
    add_section(lines, "PROJECT PATHS")
    lines.append(f"SCRIPT_PATH: {SCRIPT_PATH}")
    lines.append(f"PROJECT_ROOT: {PROJECT_ROOT}")
    lines.append(f"REPOSITORY_ROOT: {REPOSITORY_ROOT}")
    lines.append(f"VIEWS_PATH: {VIEWS_PATH}")

    require(PROJECT_ROOT.is_dir(), "Django project root does not exist.")
    require(
        (PROJECT_ROOT / "manage.py").is_file(),
        "manage.py was not found in the Django project root.",
    )
    require(
        (PROJECT_ROOT / "beeAppBack" / "settings.py").is_file(),
        "beeAppBack/settings.py was not found.",
    )
    require(
        REPOSITORY_ROOT.is_dir(),
        "Repository root does not exist.",
    )
    lines.append("PROJECT_PATHS_RESULT: PASS")


def validate_structure(lines: list[str]) -> None:
    add_section(lines, "STRUCTURE")
    require(not MONOLITH_PATH.exists(), "The monolithic views.py still exists.")
    require(VIEWS_PATH.is_dir(), "The refactored views package does not exist.")

    files = sorted(VIEWS_PATH.glob("*.py"))
    require(files, "No Python view modules were found.")

    for file_path in files:
        line_count = len(file_path.read_text(encoding="utf-8").splitlines())
        lines.append(f"LINES: {file_path.relative_to(PROJECT_ROOT)} -> {line_count}")
        require(line_count <= 400, f"File exceeds 400 lines: {file_path}")

    lines.append("STRUCTURE_RESULT: PASS")


def initialize_django() -> None:
    project_root = str(PROJECT_ROOT)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")

    import django

    django.setup()


def validate_django_contract(lines: list[str]) -> None:
    add_section(lines, "DJANGO CONTRACT")
    initialize_django()

    from apps.calendar import urls, views

    exported_names = set(views.__all__)
    require(
        exported_names == EXPECTED_VIEW_NAMES,
        "The public view export contract changed.",
    )
    require(
        len(urls.urlpatterns) == len(EXPECTED_VIEW_NAMES),
        "The calendar URL callback count changed.",
    )

    for view_name in sorted(EXPECTED_VIEW_NAMES):
        view_class = getattr(views, view_name)
        require(
            callable(getattr(view_class, "as_view", None)),
            f"Invalid view export: {view_name}",
        )
        lines.append(
            f"VIEW: {view_name} -> "
            f"{view_class.__module__}.{view_class.__name__}"
        )

    lines.append("DJANGO_CONTRACT_RESULT: PASS")


def validate_stability(lines: list[str]) -> None:
    add_section(lines, "IMPORT STABILITY")

    for cycle in range(1, 21):
        views_module = importlib.import_module("apps.calendar.views")
        urls_module = importlib.import_module("apps.calendar.urls")

        require(
            set(views_module.__all__) == EXPECTED_VIEW_NAMES,
            f"Export contract changed in cycle {cycle}.",
        )
        require(
            len(urls_module.urlpatterns) == len(EXPECTED_VIEW_NAMES),
            f"Route contract changed in cycle {cycle}.",
        )

        for view_name in views_module.__all__:
            view_class = getattr(views_module, view_name)
            require(
                callable(getattr(view_class, "as_view", None)),
                f"Invalid view export in cycle {cycle}: {view_name}",
            )

        lines.append(f"CYCLE_{cycle:02d}: PASS")

    lines.append("IMPORT_STABILITY_RESULT: PASS")


def validate_commands(lines: list[str]) -> None:
    commands = [
        ("DJANGO CHECK", [sys.executable, "manage.py", "check"]),
        (
            "DJANGO CALENDAR TESTS",
            [
                sys.executable,
                "manage.py",
                "test",
                "apps.calendar.tests",
                "--verbosity",
                "2",
            ],
        ),
        (
            "SERVICE REFACTOR CHECKS",
            [
                sys.executable,
                "apps/calendar/tests/scripts/"
                "run_calendar_service_refactor_checks.py",
            ],
        ),
        (
            "ACCESS REFACTOR CHECKS",
            [
                sys.executable,
                "apps/calendar/tests/scripts/"
                "calendar_refactor_access_tests.py",
            ],
        ),
        (
            "COMMAND REFACTOR CHECKS",
            [
                sys.executable,
                "apps/calendar/tests/scripts/"
                "calendar_refactor_command_tests.py",
            ],
        ),
    ]

    for title, command in commands:
        add_section(lines, title)
        return_code, output = run_command(command)
        lines.append(output.rstrip())
        require(return_code == 0, f"{title} failed with exit code {return_code}.")
        lines.append(f"{title.replace(' ', '_')}_RESULT: PASS")


def main() -> int:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = ["CALENDAR VIEWS REFACTOR VALIDATION REPORT"]

    try:
        validate_project_paths(lines)
        validate_structure(lines)
        validate_django_contract(lines)
        validate_stability(lines)
        validate_commands(lines)
        lines.append("\nFINAL_RESULT: PASS")
        result = 0
    except Exception as error:
        lines.append("\nFINAL_RESULT: FAIL")
        lines.append(f"ERROR: {error}")
        result = 1

    REPORT_PATH.write_text(
        "\n".join(lines).rstrip() + "\n",
        encoding="utf-8",
    )
    return result


if __name__ == "__main__":
    raise SystemExit(main())
