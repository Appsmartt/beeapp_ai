from __future__ import annotations

import pathlib
import subprocess
import sys


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[6]
DJANGO_ROOT = PROJECT_ROOT / "Backend" / "beeAppBack"
REPORT_PATH = PROJECT_ROOT / "tmp" / "mail_draft_refactor_test_report.txt"


def main() -> int:
    command = [
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
    result = subprocess.run(
        command,
        cwd=DJANGO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        "\n".join(
            [
                "=== Mail Draft Refactor Test Report ===",
                f"Exit code: {result.returncode}",
                "",
                "=== Standard output ===",
                result.stdout,
                "",
                "=== Standard error ===",
                result.stderr,
            ]
        ),
        encoding="utf-8",
    )

    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
