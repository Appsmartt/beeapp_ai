from __future__ import annotations

import argparse
import ast
import importlib
import os
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

PACKAGE_PATH = PROJECT_ROOT / "apps/chat/serializers"
MONOLITH_PATH = PROJECT_ROOT / "apps/chat/serializers.py"
EXPECTED_EXPORTS = 32
MAX_LINES = 400
TEST_LABELS = (
    "apps.chat.tests.test_chat_serializers",
    "apps.chat.tests.test_chat_typed_unpinned_inbox",
    "apps.chat.tests.test_chat_attachment_types",
    "apps.chat.tests.test_chat_location_message",
    "apps.chat.tests.test_chat_message_reaction_cache",
    "apps.chat.tests.test_chat_read_cache",
    "apps.chat.tests.test_chat_receipt_service",
    "apps.chat.tests.test_chat_conversation_permissions",
    "apps.chat.tests.test_chat_group_refactor_behavior",
)
CONSUMERS = (
    "apps.chat.views.refactored.bootstrap_views",
    "apps.chat.views.refactored.conversation_views",
    "apps.chat.views.refactored.discovery_views",
    "apps.chat.views.refactored.group_invitation_views",
    "apps.chat.views.refactored.group_management_views",
    "apps.chat.views.refactored.group_membership_views",
    "apps.chat.views.refactored.inbox_views",
    "apps.chat.views.refactored.message_delivery_views",
    "apps.chat.views.refactored.message_detail_views",
    "apps.chat.views.refactored.reaction_views",
)

def setup_django() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")
    import django
    django.setup()

def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cycles", type=int, default=3)
    parser.add_argument("--report-file", type=Path)
    return parser.parse_args()

def static_failures() -> list[str]:
    failures: list[str] = []
    if MONOLITH_PATH.exists():
        failures.append(f"Monolith still exists: {MONOLITH_PATH}")
    if not PACKAGE_PATH.is_dir():
        return failures + [f"Package missing: {PACKAGE_PATH}"]

    for path in sorted(PACKAGE_PATH.glob("*.py")):
        count = len(path.read_text(encoding="utf-8").splitlines())
        if count > MAX_LINES:
            failures.append(
                f"{path.name} exceeds {MAX_LINES} lines: {count}"
            )

    init_path = PACKAGE_PATH / "__init__.py"
    tree = ast.parse(init_path.read_text(encoding="utf-8"))
    assignments = [
        node for node in tree.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == "__all__"
            for target in node.targets
        )
    ]
    if len(assignments) != 1:
        failures.append("Expected exactly one __all__ assignment.")

    setup_django()
    try:
        package = importlib.import_module("apps.chat.serializers")
    except Exception as error:
        return failures + [
            f"Cannot import serializers package: {type(error).__name__}: {error}"
        ]

    exports = getattr(package, "__all__", ())
    if len(exports) != EXPECTED_EXPORTS:
        failures.append(f"Unexpected export count: {len(exports)}")
    if len(set(exports)) != len(exports):
        failures.append("Duplicate serializer exports detected.")
    for name in exports:
        if not hasattr(package, name):
            failures.append(f"Missing exported serializer: {name}")

    for path in sorted(PACKAGE_PATH.glob("*.py")):
        if path.name == "__init__.py":
            continue
        name = f"apps.chat.serializers.{path.stem}"
        try:
            importlib.import_module(name)
        except Exception as error:
            failures.append(
                f"Cannot import {name}: {type(error).__name__}: {error}"
            )

    for name in CONSUMERS:
        try:
            importlib.import_module(name)
        except Exception as error:
            failures.append(
                f"Cannot import consumer {name}: "
                f"{type(error).__name__}: {error}"
            )
    return failures

def run_cycle(cycle: int) -> tuple[bool, str]:
    command = [
        sys.executable, "manage.py", "test", *TEST_LABELS,
        "--verbosity", "1",
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
        f"{result.stdout}{result.stderr}"
    )
    return result.returncode == 0, output

def build_report(cycles: int) -> tuple[bool, str]:
    if cycles < 1:
        return False, "cycles must be at least 1.\n"
    failures = static_failures()
    sections = ["=== Chat serializers refactor verification ==="]
    if failures:
        sections.extend(["Static contract: FAIL", *failures])
        return False, "\n".join(sections) + "\n"

    sections.append("Static contract: PASS")
    passed = True
    for cycle in range(1, cycles + 1):
        success, output = run_cycle(cycle)
        sections.append(output.rstrip())
        passed = passed and success
    sections.append(f"Overall: {'PASS' if passed else 'FAIL'}")
    return passed, "\n\n".join(sections) + "\n"

def main() -> int:
    arguments = parse_arguments()
    passed, report = build_report(arguments.cycles)
    if arguments.report_file:
        arguments.report_file.parent.mkdir(parents=True, exist_ok=True)
        arguments.report_file.write_text(report, encoding="utf-8")
    print(report, end="")
    return 0 if passed else 1

if __name__ == "__main__":
    raise SystemExit(main())
