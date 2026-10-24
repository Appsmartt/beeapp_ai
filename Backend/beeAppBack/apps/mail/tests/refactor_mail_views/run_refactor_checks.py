from __future__ import annotations

import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[4]
REPOSITORY_ROOT = PROJECT_ROOT.parent.parent
REPORT_PATH = REPOSITORY_ROOT / "tmp" / (
    "mail_views_refactor_test_report.txt"
)


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=PROJECT_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


def format_result(
    label: str,
    command: list[str],
    completed: subprocess.CompletedProcess[str],
) -> str:
    return "\n".join(
        [
            f"=== {label} ===",
            "COMMAND:",
            " ".join(command),
            "",
            "STDOUT:",
            completed.stdout,
            "",
            "STDERR:",
            completed.stderr,
            "",
            f"EXIT_CODE: {completed.returncode}",
            "",
        ]
    )


def main() -> int:
    django_command = [
        sys.executable,
        "manage.py",
        "test",
        "apps.mail.tests.test_mail_views_refactor_contract",
        "apps.mail.tests.test_microsoft_graph_url_guard",
        "apps.mail.tests.test_s7_mail_draft_attachment_access",
        "apps.mail.tests.test_v1_mail_body_xss_protection",
        "--verbosity",
        "2",
    ]
    draft_command = [
        sys.executable,
        "-m",
        "unittest",
        "discover",
        "-s",
        "apps/mail/tests/refactor_mail_draft",
        "-p",
        "test_*.py",
        "-v",
    ]
    message_command = [
        sys.executable,
        "-m",
        "unittest",
        "discover",
        "-s",
        "apps/mail/tests/refactor_mail_message",
        "-p",
        "test_*.py",
        "-v",
    ]

    results = [
        (
            "DJANGO MAIL VIEW AND SECURITY TESTS",
            django_command,
            run_command(django_command),
        ),
        (
            "MAIL DRAFT SERVICE CONTRACT TESTS",
            draft_command,
            run_command(draft_command),
        ),
        (
            "MAIL MESSAGE SERVICE CONTRACT TESTS",
            message_command,
            run_command(message_command),
        ),
    ]

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        "\n".join(
            format_result(label, command, completed)
            for label, command, completed in results
        ),
        encoding="utf-8",
    )

    return 0 if all(
        completed.returncode == 0
        for _, _, completed in results
    ) else 1


if __name__ == "__main__":
    raise SystemExit(main())
