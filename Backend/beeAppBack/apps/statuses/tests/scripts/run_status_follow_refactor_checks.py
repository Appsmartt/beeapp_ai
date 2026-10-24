from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import os
import subprocess
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[6]
BACKEND_ROOT = PROJECT_ROOT / "Backend" / "beeAppBack"
TRACE_DIRECTORY = PROJECT_ROOT / "tmp"
TEST_LABELS = (
    "apps.statuses.tests.test_status_follow_discovery_service",
    "apps.statuses.tests.test_status_follow_refactor_contract",
    "apps.statuses.tests.test_status_follow_refactor_listing",
    "apps.statuses.tests.test_status_refactor_contract",
)


def run_command(command: list[str]) -> tuple[int, str]:
    completed = subprocess.run(
        command,
        cwd=BACKEND_ROOT,
        text=True,
        capture_output=True,
        env=os.environ.copy(),
        check=False,
    )
    output = "\n".join(
        part for part in (completed.stdout, completed.stderr) if part
    )
    return completed.returncode, output


def git_revision() -> str:
    completed = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=PROJECT_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return completed.stdout.strip() or "unavailable"


def line_counts() -> list[str]:
    paths = sorted(
        (
            PROJECT_ROOT
            / "Backend"
            / "beeAppBack"
            / "apps"
            / "statuses"
            / "services"
            / "status_follow_refactor"
        ).glob("*.py")
    )
    paths.append(
        PROJECT_ROOT
        / "Backend"
        / "beeAppBack"
        / "apps"
        / "statuses"
        / "services"
        / "status_follow_service.py"
    )
    return [
        f"{path.relative_to(PROJECT_ROOT)}={len(path.read_text().splitlines())}"
        for path in paths
    ]


def main() -> int:
    TRACE_DIRECTORY.mkdir(parents=True, exist_ok=True)
    started_at = datetime.now(timezone.utc)
    exit_code, output = run_command(
        [sys.executable, "manage.py", "test", *TEST_LABELS, "--verbosity", "2"]
    )
    completed_at = datetime.now(timezone.utc)
    trace_path = TRACE_DIRECTORY / "status_follow_refactor_test_trace.txt"

    trace_path.write_text(
        "\n".join(
            (
                "=== STATUS FOLLOW REFACTOR TEST TRACE ===",
                f"started_at_utc={started_at.isoformat()}",
                f"completed_at_utc={completed_at.isoformat()}",
                f"git_revision={git_revision()}",
                f"python_executable={sys.executable}",
                f"exit_code={exit_code}",
                f"tests={','.join(TEST_LABELS)}",
                "=== LINE_COUNTS ===",
                *line_counts(),
                "=== TEST_OUTPUT ===",
                output,
                "",
            )
        )
    )
    print(trace_path.relative_to(PROJECT_ROOT))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
