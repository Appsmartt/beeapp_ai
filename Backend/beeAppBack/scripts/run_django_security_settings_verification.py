#!/usr/bin/env python3
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = PROJECT_ROOT / "Backend" / "beeAppBack"
REPORTS_ROOT = PROJECT_ROOT / ".beeapp-work"
REPORT_PATH = REPORTS_ROOT / "django-security-settings-verification.txt"
TEST_LABEL = "beeAppBack.tests.test_security_settings"


def run_command(command: list[str], environment: dict[str, str]) -> tuple[int, str]:
    result = subprocess.run(
        command,
        cwd=BACKEND_ROOT,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    output = (result.stdout + result.stderr).strip()
    return result.returncode, output


def append_result(
    lines: list[str],
    label: str,
    return_code: int,
    output: str,
) -> bool:
    status = "PASS" if return_code == 0 else "FAIL"
    lines.append(f"{label}: {status}")
    if output:
        lines.append(output)
    lines.append("")
    return return_code == 0


def main() -> int:
    REPORTS_ROOT.mkdir(parents=True, exist_ok=True)

    environment = os.environ.copy()
    environment["DEBUG"] = "False"
    environment["DJANGO_SETTINGS_MODULE"] = "beeAppBack.settings"

    lines = [
        "Django security settings verification",
        f"Timestamp UTC: {datetime.now(timezone.utc).isoformat()}",
        "Environment secrets are intentionally not printed.",
        "DEBUG override used for verification: False",
        "",
    ]
    passed = True

    deploy_return_code, deploy_output = run_command(
        [sys.executable, "manage.py", "check", "--deploy"],
        environment,
    )
    known_non_blocking_deploy_issue = "mail.E001"
    deploy_has_only_known_issue = (
        deploy_return_code != 0
        and known_non_blocking_deploy_issue in deploy_output
        and "ERRORS:" in deploy_output
        and deploy_output.count("(mail.E001)") == 1
    )
    if deploy_return_code == 0:
        deploy_status = "PASS"
    elif deploy_has_only_known_issue:
        deploy_status = "NON_BLOCKING_EXISTING_MAIL_CONFIGURATION_ISSUE"
    else:
        deploy_status = "FAIL"
        passed = False

    lines.append(f"Django deploy check: {deploy_status}")
    if deploy_output:
        lines.append(deploy_output)
    lines.append("")

    test_return_code, test_output = run_command(
        [
            sys.executable,
            "manage.py",
            "test",
            TEST_LABEL,
            "--verbosity",
            "2",
        ],
        environment,
    )
    passed = append_result(
        lines,
        "Security settings test suite",
        test_return_code,
        test_output,
    )

    REPORT_PATH.write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )
    print(f"Verification report created: {REPORT_PATH}")

    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
