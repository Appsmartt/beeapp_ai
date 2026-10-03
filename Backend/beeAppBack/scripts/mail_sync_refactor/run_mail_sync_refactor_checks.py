from __future__ import annotations

import json
import os
import sys
import traceback
import unittest
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPOSITORY_ROOT = PROJECT_ROOT.parents[1]
REPORT_PATH = REPOSITORY_ROOT / "tmp" / "mail_sync_refactor_checks.txt"

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(REPOSITORY_ROOT))

import django

django.setup()

from Backend.beeAppBack.scripts.mail_sync_refactor.tests.test_core import (
    MailSyncCoreTests,
)
from Backend.beeAppBack.scripts.mail_sync_refactor.tests.test_orchestrator import (
    MailSyncOrchestratorTests,
)


def main() -> int:
    suite = unittest.TestSuite()
    loader = unittest.defaultTestLoader
    suite.addTests(loader.loadTestsFromTestCase(MailSyncCoreTests))
    suite.addTests(loader.loadTestsFromTestCase(MailSyncOrchestratorTests))
    result = unittest.TextTestRunner(verbosity=2).run(suite)

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tests_run": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "successful": result.wasSuccessful(),
        "failure_details": [
            {"test": str(test), "traceback": detail}
            for test, detail in result.failures + result.errors
        ],
    }
    REPORT_PATH.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(
            traceback.format_exc(),
            encoding="utf-8",
        )
        raise
