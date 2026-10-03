from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parents[1]
REPORT_PATH = PROJECT_ROOT / "tmp" / "accounts_views_refactor_checks.txt"
MODULE_DIRECTORY = BACKEND_ROOT / "apps" / "accounts" / "view_modules"
FACADE_PATH = BACKEND_ROOT / "apps" / "accounts" / "views.py"
MAX_LINES = 400
TEST_LABELS = [
    "apps.accounts.tests",
    "beeAppBack.tests.test_security_settings",
    "apps.notifications.tests.test_push_device_ownership",
    "apps.chat.tests.test_chat_presence_views",
    "apps.chat.tests.test_chat_typed_unpinned_inbox",
]


def run_command(arguments: list[str]) -> tuple[int, str]:
    result = subprocess.run(
        arguments,
        cwd=BACKEND_ROOT,
        text=True,
        capture_output=True,
        check=False,
        env=os.environ.copy(),
    )
    output = f"{result.stdout}{result.stderr}".strip()
    return result.returncode, output


def append_section(lines: list[str], title: str, content: str) -> None:
    lines.append(f"=== {title} ===")
    lines.append(content or "no output")
    lines.append("")


def main() -> int:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report_lines: list[str] = []
    failures: list[str] = []

    facade_lines = len(FACADE_PATH.read_text().splitlines())
    append_section(report_lines, "FACADE LINE COUNT", str(facade_lines))
    if facade_lines > MAX_LINES:
        failures.append("facade line limit exceeded")

    for module_path in sorted(MODULE_DIRECTORY.glob("*.py")):
        line_count = len(module_path.read_text().splitlines())
        append_section(
            report_lines,
            f"MODULE LINE COUNT {module_path.name}",
            str(line_count),
        )
        if line_count > MAX_LINES:
            failures.append(f"{module_path.name} line limit exceeded")

    checks = [
        ("DJANGO CHECK", [sys.executable, "manage.py", "check"]),
        (
            "REFACTOR TEST SUITE",
            [sys.executable, "manage.py", "test", *TEST_LABELS, "--verbosity", "1"],
        ),
        (
            "URL TARGET CHECK",
            [
                sys.executable,
                "manage.py",
                "shell",
                "-c",
                (
                    "from django.urls import resolve; "
                    "paths=['/api/accounts/register/','/api/accounts/login/',"
                    "'/api/accounts/session/refresh/',"
                    "'/api/accounts/login/phone/request-otp/',"
                    "'/api/accounts/login/phone/verify-otp/',"
                    "'/api/accounts/login/phone/verify-otp/mobile/',"
                    "'/api/accounts/password-reset/request/',"
                    "'/api/accounts/password-reset/verify/',"
                    "'/api/accounts/password-reset/confirm/',"
                    "'/api/accounts/me/security-pin/',"
                    "'/api/accounts/me/security-pin/configure/',"
                    "'/api/accounts/me/security-pin/verify/',"
                    "'/api/accounts/me/security-pin/verify-password/',"
                    "'/api/accounts/me/security-pin/replace/',"
                    "'/api/accounts/me/','/api/accounts/me/avatar/',"
                    "'/api/accounts/me/profile/','/api/accounts/me/assistant/',"
                    "'/api/accounts/me/devices/','/api/accounts/me/devices/others/',"
                    "'/api/accounts/me/devices/00000000-0000-0000-0000-000000000001/',"
                    "'/api/accounts/qr-login/challenges/',"
                    "'/api/accounts/qr-login/challenges/challenge-token/',"
                    "'/api/accounts/qr-login/scan/',"
                    "'/api/accounts/web-session/activate/',"
                    "'/api/accounts/web-session/me/',"
                    "'/api/accounts/web-session/logout/']; "
                    "targets=[f'{resolve(path).func.view_class.__module__}.' "
                    "f'{resolve(path).func.view_class.__name__}' for path in paths]; "
                    "print(f'url_count={len(paths)}'); "
                    "print(f'all_in_view_modules={all(\".view_modules.\" in target for target in targets)}'); "
                    "print(f'unique_target_count={len(set(targets))}')"
                ),
            ],
        ),
    ]

    for title, command in checks:
        return_code, output = run_command(command)
        append_section(report_lines, title, output)
        if return_code:
            failures.append(title.lower())

    append_section(
        report_lines,
        "RESULT",
        "PASS" if not failures else f"FAIL: {', '.join(failures)}",
    )
    REPORT_PATH.write_text("\n".join(report_lines))
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
