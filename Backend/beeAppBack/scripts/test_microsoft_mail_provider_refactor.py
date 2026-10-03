#!/usr/bin/env python3
"""Run isolated regression checks for the Microsoft mail provider refactor."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import subprocess
import sys


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = REPOSITORY_ROOT / "Backend" / "beeAppBack"
PACKAGE_ROOT = (
    BACKEND_ROOT
    / "apps"
    / "mail"
    / "services"
    / "microsoft_provider"
)
MONOLITH_PATH = (
    BACKEND_ROOT
    / "apps"
    / "mail"
    / "services"
    / "microsoft_mail_provider_service.py"
)
REPORT_ROOT = REPOSITORY_ROOT / "tmp"
TEST_LABELS = (
    "apps.mail.tests.test_microsoft_graph_url_guard",
    "apps.mail.tests.test_v1_mail_body_xss_protection",
)
CYCLE_COUNT = 20


def run_command(
    command: list[str],
) -> tuple[int, str]:
    completed = subprocess.run(
        command,
        cwd=BACKEND_ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    return completed.returncode, completed.stdout


def count_lines(path: Path) -> int:
    return len(path.read_text(encoding="utf-8").splitlines())


def main() -> int:
    REPORT_ROOT.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime(
        "%Y%m%dT%H%M%SZ"
    )
    report_path = REPORT_ROOT / (
        f"microsoft_mail_provider_refactor_{timestamp}.txt"
    )
    report_lines = [
        "Microsoft mail provider refactor validation",
        f"started_at_utc={timestamp}",
        f"cycle_count={CYCLE_COUNT}",
        "",
    ]
    failures: list[str] = []

    if MONOLITH_PATH.exists():
        failures.append("monolith_file_still_exists")
    else:
        report_lines.append("PASS=monolith_file_removed")

    monolith_references = []
    for source_path in BACKEND_ROOT.rglob("*.py"):
        if source_path == Path(__file__).resolve():
            continue
        if "microsoft_mail_provider_service" in source_path.read_text(
            encoding="utf-8"
        ):
            monolith_references.append(
                str(source_path.relative_to(BACKEND_ROOT))
            )

    if monolith_references:
        failures.append(
            "monolith_references_found="
            + ",".join(sorted(monolith_references))
        )
    else:
        report_lines.append("PASS=no_functional_monolith_references")

    python_files = sorted(PACKAGE_ROOT.glob("*.py"))

    if not python_files:
        failures.append("provider_package_missing")
    else:
        for path in python_files:
            line_count = count_lines(path)

            if line_count > 400:
                failures.append(
                    f"line_limit_exceeded={path.name}:{line_count}"
                )
            else:
                report_lines.append(
                    f"PASS=line_limit={path.name}:{line_count}"
                )

    compile_command = [
        sys.executable,
        "-m",
        "py_compile",
        *[
            str(path.relative_to(BACKEND_ROOT))
            for path in python_files
        ],
    ]
    compile_code, compile_output = run_command(compile_command)
    report_lines.extend(
        [
            "",
            f"compile_exit_code={compile_code}",
            compile_output.rstrip(),
        ]
    )

    if compile_code != 0:
        failures.append("compile_failed")

    for cycle_number in range(1, CYCLE_COUNT + 1):
        test_command = [
            sys.executable,
            "manage.py",
            "test",
            *TEST_LABELS,
            "--verbosity",
            "1",
        ]
        test_code, test_output = run_command(test_command)
        report_lines.extend(
            [
                "",
                f"cycle={cycle_number}",
                f"test_exit_code={test_code}",
                test_output.rstrip(),
            ]
        )

        if test_code != 0:
            failures.append(f"test_cycle_failed={cycle_number}")
            break

        if "Found 0 test(s)." in test_output:
            failures.append(f"zero_tests_discovered={cycle_number}")
            break

    report_lines.extend(
        [
            "",
            f"result={'PASS' if not failures else 'FAIL'}",
            (
                "failures=none"
                if not failures
                else f"failures={','.join(failures)}"
            ),
        ]
    )
    report_path.write_text(
        "\n".join(report_lines) + "\n",
        encoding="utf-8",
    )
    print(report_path)

    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
