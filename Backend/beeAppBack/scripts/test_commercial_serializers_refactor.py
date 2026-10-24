from __future__ import annotations

import argparse
import ast
import importlib
import os
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

SERIALIZERS_PACKAGE = (
    PROJECT_ROOT / "apps/commercial/serializers"
)
MONOLITH_PATH = PROJECT_ROOT / "apps/commercial/serializers.py"
EXPECTED_EXPORT_COUNT = 49
MAX_MODULE_LINES = 400
TEST_LABELS = (
    "apps.commercial.tests.test_commercial_catalog_service",
    "apps.commercial.tests.commercial_offer.test_offer_archived_state",
    "apps.commercial.tests.commercial_offer.test_offer_availability",
    "apps.commercial.tests.commercial_offer.test_offer_images",
    "apps.commercial.tests.commercial_offer.test_offer_package_exports",
    "apps.commercial.tests.test_commercial_offer_serializers",
    "apps.commercial.tests.test_public_commercial_product_feed",
    (
        "apps.commercial.tests."
        "test_commercial_payment_and_verification_serializers"
    ),
    (
        "apps.commercial.tests."
        "test_commercial_payment_proof_review_serializer"
    ),
    (
        "apps.commercial.tests."
        "test_commercial_request_operations_serializers"
    ),
    "apps.commercial.tests.test_public_category_search",
    "apps.commercial.tests.commercial_category_creation.test_category_name_normalization",
    "apps.commercial.tests.commercial_category_creation.test_category_resolution",
    "apps.commercial.tests.commercial_category_creation.test_profile_category_serializer",
    "apps.commercial.tests.test_commercial_authorization_service",
)
CONSUMER_MODULES = (
    "apps.commercial.views",
    "apps.commercial.verification_views",
    "apps.commercial.payment_proof_review_views",
    "apps.commercial.payment_proof_views",
    "apps.commercial.request_item_views",
    "apps.commercial.request_operations_views",
    "apps.commercial.request_proposal_views",
    "apps.commercial.request_transition_views",
    "apps.commercial.request_views",
    "apps.commercial.reservation_views",
)


def setup_django() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")
    import django

    django.setup()


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--cycles",
        type=int,
        default=3,
    )
    parser.add_argument(
        "--report-file",
        type=Path,
    )
    return parser.parse_args()


def validate_static_contract() -> list[str]:
    setup_django()
    failures = []

    if MONOLITH_PATH.exists():
        failures.append(
            f"Monolith still exists: {MONOLITH_PATH}"
        )

    if not SERIALIZERS_PACKAGE.is_dir():
        failures.append(
            f"Serializer package is missing: {SERIALIZERS_PACKAGE}"
        )
        return failures

    package = importlib.import_module(
        "apps.commercial.serializers"
    )
    exports = getattr(package, "__all__", ())

    if len(exports) != EXPECTED_EXPORT_COUNT:
        failures.append(
            "Unexpected export count: "
            f"{len(exports)}"
        )

    if len(set(exports)) != len(exports):
        failures.append("Duplicate serializer exports detected.")

    for export_name in exports:
        if not hasattr(package, export_name):
            failures.append(
                f"Missing exported serializer: {export_name}"
            )

    for module_path in sorted(
        SERIALIZERS_PACKAGE.glob("*.py")
    ):
        line_count = len(
            module_path.read_text(encoding="utf-8").splitlines()
        )
        if line_count > MAX_MODULE_LINES:
            failures.append(
                f"{module_path.name} exceeds "
                f"{MAX_MODULE_LINES} lines: {line_count}"
            )

        if module_path.name == "__init__.py":
            continue

        module_name = (
            "apps.commercial.serializers."
            f"{module_path.stem}"
        )
        try:
            importlib.import_module(module_name)
        except Exception as error:
            failures.append(
                f"Cannot import {module_name}: "
                f"{type(error).__name__}: {error}"
            )

    for module_name in CONSUMER_MODULES:
        try:
            importlib.import_module(module_name)
        except Exception as error:
            failures.append(
                f"Cannot import consumer {module_name}: "
                f"{type(error).__name__}: {error}"
            )

    init_path = SERIALIZERS_PACKAGE / "__init__.py"
    init_tree = ast.parse(
        init_path.read_text(encoding="utf-8")
    )
    all_assignments = [
        node
        for node in init_tree.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name)
            and target.id == "__all__"
            for target in node.targets
        )
    ]
    if len(all_assignments) != 1:
        failures.append(
            "Expected exactly one __all__ assignment."
        )

    return failures


def run_test_cycle(cycle: int) -> tuple[bool, str]:
    command = [
        sys.executable,
        "manage.py",
        "test",
        *TEST_LABELS,
        "--verbosity",
        "1",
    ]
    result = subprocess.run(
        command,
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
    )
    output = (
        f"=== Test cycle {cycle} ===\n"
        f"Exit status: {result.returncode}\n"
        f"{result.stdout}"
        f"{result.stderr}"
    )
    return result.returncode == 0, output


def build_report(cycles: int) -> tuple[bool, str]:
    if cycles < 1:
        return False, "cycles must be at least 1.\n"

    sections = ["=== Commercial serializers refactor verification ==="]
    static_failures = validate_static_contract()

    if static_failures:
        sections.append("Static contract: FAIL")
        sections.extend(static_failures)
        return False, "\n".join(sections) + "\n"

    sections.append("Static contract: PASS")
    cycles_passed = True

    for cycle in range(1, cycles + 1):
        passed, output = run_test_cycle(cycle)
        sections.append(output.rstrip())
        cycles_passed = cycles_passed and passed

    sections.append(
        "Overall: "
        f"{'PASS' if cycles_passed else 'FAIL'}"
    )
    return cycles_passed, "\n\n".join(sections) + "\n"


def main() -> int:
    arguments = parse_arguments()
    passed, report = build_report(arguments.cycles)

    if arguments.report_file is not None:
        arguments.report_file.parent.mkdir(
            parents=True,
            exist_ok=True,
        )
        arguments.report_file.write_text(
            report,
            encoding="utf-8",
        )

    print(report, end="")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
