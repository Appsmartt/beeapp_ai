from __future__ import annotations

import sys
import traceback
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[4]
ROOT = BACKEND_ROOT.parents[1]
REPORT_PATH = (
    ROOT
    / ".git"
    / "info"
    / "exploration"
    / "calendar_service_refactor_test_report.txt"
)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from calendar_refactor_access_tests import ACCESS_TESTS
from calendar_refactor_command_tests import COMMAND_TESTS
from calendar_refactor_test_support import STRUCTURAL_TESTS


TESTS = [
    *STRUCTURAL_TESTS,
    *ACCESS_TESTS,
    *COMMAND_TESTS,
]


def main():
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    failures = []

    for test in TESTS:
        try:
            test()
            lines.append(f"PASS {test.__name__}")
        except Exception:
            failures.append(test.__name__)
            lines.append(f"FAIL {test.__name__}")
            lines.extend(traceback.format_exc().rstrip().splitlines())

    lines.append(f"TOTAL {len(TESTS)}")
    lines.append(f"PASSED {len(TESTS) - len(failures)}")
    lines.append(f"FAILED {len(failures)}")
    REPORT_PATH.write_text("\n".join(lines) + "\n")

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
