from __future__ import annotations

import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[6]
BACKEND_DIRECTORY = PROJECT_ROOT / "Backend" / "beeAppBack"
CALLS_DIRECTORY = BACKEND_DIRECTORY / "apps" / "calls"
REFACTORED_VIEWS_DIRECTORY = CALLS_DIRECTORY / "refactored_views"
REPORT_DIRECTORY = PROJECT_ROOT / "tmp"
REPORT_PATH = REPORT_DIRECTORY / (
    "call_views_refactor_verification_"
    f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
)

TEST_LABELS = [
    "apps.calls.tests.test_call_views_success_contract",
    "apps.calls.tests.test_call_views_validation_contract",
    "apps.calls.tests.test_call_session_refactor_structure",
    "apps.calls.tests.test_call_session_refactor_behavior",
]

EXPECTED_MODULES = {
    "__init__.py",
    "common.py",
    "start_and_query_views.py",
    "participant_views.py",
    "lifecycle_views.py",
}


def run_command(command: list[str]) -> tuple[int, str]:
    completed = subprocess.run(
        command,
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
        env=os.environ.copy(),
    )
    output = (completed.stdout or "") + (completed.stderr or "")
    return completed.returncode, output


def has_legacy_imports() -> bool:
    for path in BACKEND_DIRECTORY.rglob("*.py"):
        relative_parts = path.relative_to(BACKEND_DIRECTORY).parts
        if (
            "__pycache__" in relative_parts
            or "migrations" in relative_parts
            or "tests" in relative_parts
        ):
            continue

        content = path.read_text(encoding="utf-8")
        if "from apps.calls.views import" in content:
            return True
        if "import apps.calls.views" in content:
            return True

    return False


def module_line_counts() -> dict[str, int]:
    return {
        module_path.name: len(
            module_path.read_text(encoding="utf-8").splitlines()
        )
        for module_path in sorted(
            REFACTORED_VIEWS_DIRECTORY.glob("*.py")
        )
    }


def main() -> int:
    REPORT_DIRECTORY.mkdir(parents=True, exist_ok=True)

    check_code, check_output = run_command(
        [sys.executable, str(BACKEND_DIRECTORY / "manage.py"), "check"]
    )
    test_code, test_output = run_command(
        [
            sys.executable,
            str(BACKEND_DIRECTORY / "manage.py"),
            "test",
            *TEST_LABELS,
            "--verbosity",
            "2",
        ]
    )

    existing_modules = {
        path.name
        for path in REFACTORED_VIEWS_DIRECTORY.glob("*.py")
    }
    line_counts = module_line_counts()
    legacy_views_removed = not (CALLS_DIRECTORY / "views.py").exists()
    legacy_imports_found = has_legacy_imports()
    modules_present = EXPECTED_MODULES <= existing_modules
    all_modules_under_limit = all(
        line_count <= 400
        for line_count in line_counts.values()
    )

    passed = all(
        [
            check_code == 0,
            test_code == 0,
            legacy_views_removed,
            not legacy_imports_found,
            modules_present,
            all_modules_under_limit,
        ]
    )

    report_lines = [
        "BeeApp call views refactor verification",
        f"Generated at: {datetime.now().isoformat(timespec='seconds')}",
        "",
        f"Django check exit code: {check_code}",
        f"Test suite exit code: {test_code}",
        f"Legacy views.py removed: {legacy_views_removed}",
        f"Legacy imports found: {legacy_imports_found}",
        f"Required refactored modules present: {modules_present}",
        f"All refactored modules <= 400 lines: {all_modules_under_limit}",
        "",
        "Refactored module line counts:",
    ]

    report_lines.extend(
        f"- {name}: {line_count}"
        for name, line_count in line_counts.items()
    )

    report_lines.extend(
        [
            "",
            "Django check output:",
            check_output.strip() or "(no output)",
            "",
            "Test suite output:",
            test_output.strip() or "(no output)",
            "",
            f"Verification result: {'PASS' if passed else 'FAIL'}",
        ]
    )

    REPORT_PATH.write_text(
        "\n".join(report_lines) + "\n",
        encoding="utf-8",
    )

    print(REPORT_PATH)
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
