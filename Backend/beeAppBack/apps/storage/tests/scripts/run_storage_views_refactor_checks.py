from datetime import datetime, timezone
from pathlib import Path
import subprocess
import sys

project_root = Path(__file__).resolve().parents[6]
backend_root = project_root / "Backend" / "beeAppBack"
report_path = project_root / "tmp" / "storage_views_refactor_test_report.txt"

test_labels = [
    "apps.storage.tests.test_storage_view_exports",
    "apps.storage.tests.test_storage_url_contract",
    "apps.storage.tests.test_storage_view_module_contracts",
    "apps.storage.tests.test_s7_expired_file_shares",
]

cycles = 20
results = []

for cycle in range(1, cycles + 1):
    result = subprocess.run(
        [
            sys.executable,
            "manage.py",
            "test",
            *test_labels,
            "-v",
            "1",
        ],
        cwd=backend_root,
        capture_output=True,
        text=True,
        check=False,
    )
    results.append(
        {
            "cycle": cycle,
            "return_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }
    )

    if result.returncode != 0:
        break

report_lines = [
    "=== Storage Views Refactor Exhaustive Test Report ===",
    f"Generated at: {datetime.now(timezone.utc).isoformat()}",
    f"Requested cycles: {cycles}",
    f"Completed cycles: {len(results)}",
    "",
]

for result in results:
    report_lines.extend(
        [
            f"=== Cycle {result['cycle']} ===",
            f"Return code: {result['return_code']}",
            "--- stdout ---",
            result["stdout"].rstrip(),
            "--- stderr ---",
            result["stderr"].rstrip(),
            "",
        ]
    )

successful_cycles = sum(
    result["return_code"] == 0
    for result in results
)

report_lines.append(
    f"Successful cycles: {successful_cycles}/{len(results)}"
)

report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(
    "\n".join(report_lines) + "\n",
    encoding="utf-8",
)

raise SystemExit(
    0
    if len(results) == cycles and successful_cycles == cycles
    else 1
)
