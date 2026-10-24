from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from subprocess import run
import os
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[4]
BACKEND_ROOT = PROJECT_ROOT / "Backend" / "beeAppBack"
REPORT_DIRECTORY = PROJECT_ROOT / "tmp"
REPORT_PATH = REPORT_DIRECTORY / (
    "commercial_profile_refactor_checks_"
    f"{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.txt"
)

TEST_LABELS = [
    "apps.commercial.tests.test_commercial_profile_creation_state",
    "apps.commercial.tests.commercial_category_creation.test_category_name_normalization",
    "apps.commercial.tests.commercial_category_creation.test_category_resolution",
    "apps.commercial.tests.commercial_category_creation.test_profile_category_serializer",
    "apps.commercial.tests.test_commercial_authorization_service",
]


def run_check(command: list[str]) -> tuple[int, str]:
    result = run(
        command,
        cwd=BACKEND_ROOT,
        capture_output=True,
        text=True,
        env=os.environ.copy(),
        check=False,
    )
    output = (result.stdout or "") + (result.stderr or "")
    return result.returncode, output


def main() -> None:
    REPORT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    commands = [
        (
            "Django import contract",
            [
                sys.executable,
                "manage.py",
                "shell",
                "-c",
                (
                    "from apps.commercial.services import "
                    "commercial_profile_service as service; "
                    "required = ["
                    "'create_commercial_profile', "
                    "'update_commercial_profile', "
                    "'update_commercial_profile_publication', "
                    "'get_owned_commercial_profile', "
                    "'get_owned_commercial_profile_with_access_token', "
                    "'validate_commercial_categories', "
                    "'replace_commercial_profile_categories']; "
                    "missing = [name for name in required "
                    "if not hasattr(service, name)]; "
                    "print('missing=' + repr(missing))"
                ),
            ],
        ),
        (
            "Focused regression tests",
            [
                sys.executable,
                "manage.py",
                "test",
                *TEST_LABELS,
            ],
        ),
    ]

    sections = [
        "Commercial profile refactor verification",
        f"UTC timestamp: {datetime.now(UTC).isoformat()}",
        f"Project root: {PROJECT_ROOT}",
        "Environment files are not read or modified by this script.",
        "",
    ]
    failed_checks = []

    for title, command in commands:
        status_code, output = run_check(command)
        sections.extend(
            [
                f"=== {title} ===",
                f"Command: {' '.join(command)}",
                f"Exit status: {status_code}",
                output.rstrip() or "(no output)",
                "",
            ]
        )
        if status_code != 0:
            failed_checks.append(title)

    line_counts = []
    service_path = (
        BACKEND_ROOT
        / "apps"
        / "commercial"
        / "services"
        / "commercial_profile_service.py"
    )
    module_directory = (
        service_path.parent / "commercial_profile"
    )
    source_paths = [
        service_path,
        *sorted(module_directory.glob("*.py")),
    ]

    for source_path in source_paths:
        line_count = len(source_path.read_text().splitlines())
        line_counts.append(f"{line_count:>4} {source_path.relative_to(PROJECT_ROOT)}")
        if line_count > 400:
            failed_checks.append(f"Line limit: {source_path.name}")

    sections.extend(
        [
            "=== Source line limits ===",
            *line_counts,
            "",
            "=== Monolith replacement check ===",
            (
                "Facade is within the 400-line limit."
                if len(service_path.read_text().splitlines()) <= 400
                else "Facade exceeds the 400-line limit."
            ),
            "",
            "=== Result ===",
            "PASSED" if not failed_checks else "FAILED",
            (
                "All checks passed."
                if not failed_checks
                else "Failed checks: " + ", ".join(failed_checks)
            ),
        ]
    )

    REPORT_PATH.write_text("\n".join(sections) + "\n")
    print(REPORT_PATH)
    print("PASSED" if not failed_checks else "FAILED")


if __name__ == "__main__":
    main()
