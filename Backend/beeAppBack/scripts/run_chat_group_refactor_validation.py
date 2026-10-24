from __future__ import annotations

import ast
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = PROJECT_ROOT / "Backend" / "beeAppBack"
SERVICES_ROOT = BACKEND_ROOT / "apps" / "chat" / "services"
GROUP_PACKAGE = SERVICES_ROOT / "chat_group"
MONOLITH_PATH = SERVICES_ROOT / "chat_group_service.py"
REPORT_PATH = (
    PROJECT_ROOT
    / "tmp"
    / "chat_group_refactor_validation_report.txt"
)
TEST_LABELS = (
    "apps.chat.tests.test_chat_group_refactor_structure",
    "apps.chat.tests.test_chat_group_refactor_behavior",
)
EXCLUDED_PARTS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
    "tmp",
    "backups",
    "build",
    "dist",
    "coverage",
}
FORBIDDEN_IMPORT = "apps.chat.services.chat_group_service"


def write_section(
    lines: list[str],
    title: str,
) -> None:
    lines.append("")
    lines.append(f"=== {title} ===")


def run_command(
    command: list[str],
) -> tuple[int, str]:
    result = subprocess.run(
        command,
        cwd=BACKEND_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    output = "\n".join(
        value
        for value in (result.stdout.strip(), result.stderr.strip())
        if value
    )
    return result.returncode, output


def find_forbidden_imports() -> list[str]:
    offenders = []

    for python_path in BACKEND_ROOT.rglob("*.py"):
        if EXCLUDED_PARTS.intersection(python_path.parts):
            continue

        tree = ast.parse(
            python_path.read_text(encoding="utf-8"),
            filename=str(python_path),
        )

        imports_monolith = any(
            (
                isinstance(node, ast.ImportFrom)
                and node.module == FORBIDDEN_IMPORT
            )
            or (
                isinstance(node, ast.Import)
                and any(
                    alias.name == FORBIDDEN_IMPORT
                    for alias in node.names
                )
            )
            for node in ast.walk(tree)
        )

        if imports_monolith:
            offenders.append(
                str(python_path.relative_to(BACKEND_ROOT))
            )

    return offenders


def main() -> int:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "Chat group refactor validation report",
        (
            "Generated at: "
            f"{datetime.now(timezone.utc).isoformat()}"
        ),
    ]
    failures = []

    write_section(lines, "MONOLITH ABSENCE")
    if MONOLITH_PATH.exists():
        lines.append(f"FAIL: monolith exists: {MONOLITH_PATH}")
        failures.append("monolith exists")
    else:
        lines.append("PASS: chat_group_service.py is absent")

    write_section(lines, "MODULE LINE LIMITS")
    module_paths = sorted(GROUP_PACKAGE.glob("*.py"))
    if not module_paths:
        lines.append("FAIL: chat_group package has no Python modules")
        failures.append("missing group package modules")

    for module_path in module_paths:
        line_count = len(
            module_path.read_text(encoding="utf-8").splitlines()
        )
        if line_count <= 400:
            lines.append(
                f"PASS: {module_path.name} has {line_count} lines"
            )
        else:
            lines.append(
                f"FAIL: {module_path.name} has {line_count} lines"
            )
            failures.append(
                f"line limit exceeded: {module_path.name}"
            )

    write_section(lines, "FORBIDDEN MONOLITH IMPORTS")
    try:
        offenders = find_forbidden_imports()
    except (OSError, SyntaxError, UnicodeDecodeError) as error:
        lines.append(f"FAIL: import scan error: {error}")
        failures.append("import scan error")
    else:
        if offenders:
            for offender in offenders:
                lines.append(f"FAIL: forbidden import in {offender}")
            failures.append("forbidden monolith imports")
        else:
            lines.append("PASS: no backend imports the removed monolith")

    write_section(lines, "PYTHON SYNTAX")
    syntax_command = [
        sys.executable,
        "-m",
        "compileall",
        "-q",
        str(GROUP_PACKAGE),
        str(
            BACKEND_ROOT
            / "apps"
            / "chat"
            / "views"
            / "refactored"
        ),
    ]
    syntax_status, syntax_output = run_command(syntax_command)

    if syntax_status == 0:
        lines.append("PASS: package and refactored views compile")
    else:
        lines.append("FAIL: compileall failed")
        lines.append(syntax_output)
        failures.append("syntax compilation failure")

    write_section(lines, "DJANGO TESTS")
    test_command = [
        sys.executable,
        "manage.py",
        "test",
        *TEST_LABELS,
        "--verbosity",
        "2",
    ]
    test_status, test_output = run_command(test_command)
    lines.append(test_output or "No test output was produced.")

    if test_status == 0:
        lines.append("PASS: structural and behavior tests passed")
    else:
        lines.append("FAIL: Django tests failed")
        failures.append("Django tests failed")

    write_section(lines, "RESULT")
    if failures:
        lines.append("FAIL")
        lines.extend(f"- {failure}" for failure in failures)
    else:
        lines.append("PASS: all chat group refactor validations passed")

    REPORT_PATH.write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
