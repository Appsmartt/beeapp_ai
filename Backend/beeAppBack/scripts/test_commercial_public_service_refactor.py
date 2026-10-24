#!/usr/bin/env python
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = PROJECT_ROOT.parents[1]
SERVICE_DIRECTORY = (
    PROJECT_ROOT
    / "apps"
    / "commercial"
    / "services"
    / "commercial_public_service"
)
MONOLITH_PATH = (
    PROJECT_ROOT
    / "apps"
    / "commercial"
    / "services"
    / "commercial_public_service.py"
)
OUTPUT_DIRECTORY = (
    REPOSITORY_ROOT
    / "tmp"
    / "commercial_public_service_refactor"
)
REPORT_PATH = (
    OUTPUT_DIRECTORY
    / "commercial_public_service_refactor_report.txt"
)

EXPECTED_MODULES = {
    "__init__.py",
    "catalogs.py",
    "locations.py",
    "media.py",
    "offers.py",
    "product_feed.py",
    "profile_data.py",
    "profile_queries.py",
    "shared.py",
}
EXPECTED_EXPORTS = {
    "get_public_commercial_offer",
    "get_public_commercial_profile",
    "list_public_categories",
    "list_public_cities",
    "list_public_commercial_catalogs",
    "list_public_commercial_offers",
    "list_public_commercial_product_feed",
    "list_public_commercial_profiles",
    "list_public_countries",
}
TEST_LABELS = (
    "apps.commercial.tests.test_commercial_public_service",
    "apps.commercial.tests.test_public_category_search",
    "apps.commercial.tests.test_public_commercial_product_feed",
    "apps.commercial.tests.test_s6_public_media_ownership",
)


def write_result(report, label, passed, detail):
    report.append(f"{'PASS' if passed else 'FAIL'} | {label} | {detail}")
    return passed


def run_command(command):
    result = subprocess.run(
        command,
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
        env=os.environ.copy(),
    )
    output = "\n".join(
        item for item in (result.stdout, result.stderr) if item
    ).strip()
    return result.returncode, output


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))

    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    report = []
    passed = True

    passed &= write_result(
        report,
        "monolith_removed",
        not MONOLITH_PATH.exists(),
        str(MONOLITH_PATH),
    )

    actual_modules = {
        path.name
        for path in SERVICE_DIRECTORY.glob("*.py")
    }
    passed &= write_result(
        report,
        "expected_modules",
        EXPECTED_MODULES == actual_modules,
        (
            f"missing={sorted(EXPECTED_MODULES - actual_modules)}; "
            f"unexpected={sorted(actual_modules - EXPECTED_MODULES)}"
        ),
    )

    oversized_files = []
    for path in sorted(SERVICE_DIRECTORY.glob("*.py")):
        line_count = len(path.read_text(encoding="utf-8").splitlines())
        if line_count > 400:
            oversized_files.append(f"{path.name}={line_count}")
        passed &= write_result(
            report,
            "line_limit",
            line_count <= 400,
            f"{path.name}={line_count}",
        )

    import django

    django.setup()

    from apps.commercial.services import commercial_public_service

    active_module = Path(commercial_public_service.__file__).resolve()
    passed &= write_result(
        report,
        "active_package",
        active_module == (SERVICE_DIRECTORY / "__init__.py").resolve(),
        str(active_module),
    )

    missing_exports = [
        name
        for name in sorted(EXPECTED_EXPORTS)
        if not hasattr(commercial_public_service, name)
    ]
    passed &= write_result(
        report,
        "public_exports",
        not missing_exports,
        f"missing={missing_exports}",
    )

    blocked_search_values = (
        "name,email.ilike.%private%",
        "name;select",
        "name:email",
        "name\nemail",
        "name\\value",
    )
    rejected_values = []
    for value in blocked_search_values:
        try:
            commercial_public_service._validate_postgrest_search_value(
                value
            )
        except Exception:
            rejected_values.append(value)
    passed &= write_result(
        report,
        "postgrest_input_safety",
        rejected_values == list(blocked_search_values),
        f"rejected={rejected_values}",
    )

    for cycle in range(1, 4):
        code, output = run_command([
            sys.executable,
            "manage.py",
            "test",
            *TEST_LABELS,
            "--verbosity",
            "1",
        ])
        passed &= write_result(
            report,
            f"targeted_regression_cycle_{cycle}",
            code == 0,
            output[-2000:] if output else "no output",
        )

    report.append(
        f"RESULT | {'PASS' if passed else 'FAIL'} | "
        f"oversized={oversized_files}"
    )
    REPORT_PATH.write_text(
        "\n".join(report) + "\n",
        encoding="utf-8",
    )
    print(REPORT_PATH)
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
