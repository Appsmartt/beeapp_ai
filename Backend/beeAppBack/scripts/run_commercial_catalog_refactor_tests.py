from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT.parent.parent / "tmp" / (
    "commercial_catalog_refactor_test_results.txt"
)


def run(command: list[str]) -> tuple[int, str]:
    result = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    return result.returncode, result.stdout


def main() -> int:
    commands = [
        [
            sys.executable,
            "manage.py",
            "test",
            "apps.commercial.tests.test_commercial_catalog_service",
            "--verbosity",
            "2",
        ],
        [
            sys.executable,
            "manage.py",
            "test",
            "apps.commercial.tests.test_commercial_catalog_service",
            "apps.commercial.tests.commercial_offer.test_offer_archived_state",
            "apps.commercial.tests.commercial_offer.test_offer_package_exports",
            "--verbosity",
            "2",
        ],
        [
            sys.executable,
            "-m",
            "compileall",
            "-q",
            "apps/commercial/services/commercial_catalog",
            "apps/commercial/views/catalog_query_views.py",
            "apps/commercial/views/catalog_state_views.py",
            "apps/commercial/services/commercial_offer/validation.py",
            "apps/commercial/tests/test_commercial_catalog_service.py",
        ],
    ]
    sections: list[str] = []
    failed = False

    for command in commands:
        code, output = run(command)
        sections.extend(
            [
                "=== COMMAND ===",
                " ".join(command),
                f"=== EXIT CODE ===\n{code}",
                "=== OUTPUT ===",
                output.rstrip(),
                "",
            ]
        )
        failed = failed or code != 0

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(
        "\n".join(sections) + "\n",
        encoding="utf-8",
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
