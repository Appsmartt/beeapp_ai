#!/usr/bin/env python3
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path


PACKAGE_DIRECTORY = Path(__file__).resolve().parent
MAXIMUM_LINES = 400
REQUIRED_MODULES = {
    "__init__.py",
    "auth_helpers.py",
    "fixture_lifecycle.py",
    "http_client.py",
    "profile_repository.py",
    "reporting.py",
    "run_exhaustive_http.py",
    "runtime_config.py",
    "security_cases.py",
}
FORBIDDEN_PATTERNS = (
    re.compile(r"(?i)(password|secret|token)\s*=\s*['\"][^'\"]+['\"]"),
    re.compile(r"(?i)(eyJ[a-z0-9_-]{10,})"),
)


def validate_module(path: Path) -> list[str]:
    errors: list[str] = []
    content = path.read_text(encoding="utf-8")
    line_count = len(content.splitlines())
    if line_count > MAXIMUM_LINES:
        errors.append(f"{path.name}: exceeds {MAXIMUM_LINES} lines")
    try:
        ast.parse(content, filename=str(path))
    except SyntaxError as error:
        errors.append(f"{path.name}: syntax error at line {error.lineno}")
    for pattern in FORBIDDEN_PATTERNS:
        if pattern.search(content):
            errors.append(f"{path.name}: possible hardcoded secret")
    return errors


def main() -> int:
    module_paths = sorted(PACKAGE_DIRECTORY.glob("*.py"))
    present_modules = {path.name for path in module_paths}
    errors = [
        f"Missing required module: {name}"
        for name in sorted(REQUIRED_MODULES - present_modules)
    ]
    errors.extend(
        error
        for path in module_paths
        for error in validate_module(path)
    )
    runner = PACKAGE_DIRECTORY / "run_exhaustive_http.py"
    runner_content = runner.read_text(encoding="utf-8")
    for required_text in (
        "load_runtime_config",
        "login_account",
        "create_malicious_fixture",
        "delete_fixture_or_raise",
        "run_owner_protected_cycles",
        "run_fixture_protected_cycles",
        "assert_cross_account_isolation",
    ):
        if required_text not in runner_content:
            errors.append(f"Runner does not invoke {required_text}")
    if "finally:" not in runner_content:
        errors.append("Runner lacks guaranteed fixture cleanup.")
    if errors:
        print("FAILED")
        print("\n".join(errors))
        return 1
    print("PASSED")
    for path in module_paths:
        print(f"{path.name}: {len(path.read_text(encoding='utf-8').splitlines())} lines")
    return 0


if __name__ == "__main__":
    sys.exit(main())
