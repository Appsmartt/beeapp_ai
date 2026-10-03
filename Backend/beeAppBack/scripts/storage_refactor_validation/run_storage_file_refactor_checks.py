from __future__ import annotations

import importlib
import subprocess
import sys
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
BACKEND_ROOT = REPOSITORY_ROOT / "Backend" / "beeAppBack"
OPERATIONS_DIRECTORY = (
    BACKEND_ROOT
    / "apps"
    / "storage"
    / "services"
    / "file_operations"
)
REPORT_PATH = (
    REPOSITORY_ROOT
    / "tmp"
    / "storage_file_refactor_exhaustive_validation.txt"
)

MODULES = [
    "apps.storage.services.file_operations",
    "apps.storage.services.file_operations.constants",
    "apps.storage.services.file_operations.file_queries",
    "apps.storage.services.file_operations.file_helpers",
    "apps.storage.services.file_operations.file_upload_notifications",
    "apps.storage.services.file_operations.file_uploads",
    "apps.storage.services.file_operations.file_access",
    "apps.storage.services.file_operations.file_mutations",
    "apps.storage.services.file_operations.file_mail_attachments",
    "apps.storage.services.storage_share_service",
    "apps.storage.services.storage_tag_service",
    "apps.storage.views",
    "apps.chat.services.chat_attachment_service",
    "apps.mail.services.mail_draft_service",
    "apps.notes.services.note_attachment_service",
    "apps.accounts.services.profile_service",
    "apps.commercial.services.commercial_offer.validation",
    "apps.commercial.services.commercial_offer.relations",
    "apps.commercial.services.commercial_profile.relation_service",
    "apps.commercial.services.commercial_profile.validation_service",
]

REQUIRED_EXPORTS = [
    "SIGNED_URL_EXPIRES_IN_SECONDS",
    "create_file_access_url",
    "get_accessible_file",
    "get_file_content_for_mail_attachment",
    "get_owned_file",
    "get_storage_summary",
    "list_user_files",
    "move_file",
    "move_file_to_trash",
    "permanently_delete_file",
    "prepare_and_upload_file",
    "rename_file",
    "restore_file_from_trash",
    "upload_multiple_files",
]


def run_command(command: list[str], cwd: Path) -> tuple[int, str]:
    result = subprocess.run(
        command,
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    output = "\n".join(
        part for part in [result.stdout.strip(), result.stderr.strip()] if part
    )
    return result.returncode, output or "None"


def main() -> int:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report: list[str] = []
    failures: list[str] = []

    report.append("=== Storage file refactor exhaustive validation ===")

    source_files = sorted(OPERATIONS_DIRECTORY.glob("*.py"))
    report.append("")
    report.append("=== Module line counts ===")
    for source_file in source_files:
        line_count = len(source_file.read_text(encoding="utf-8").splitlines())
        report.append(f"{source_file.name} | {line_count} lines")
        if line_count > 400:
            failures.append(f"Line limit exceeded: {source_file.name}")

    report.append("")
    report.append("=== Monolith existence ===")
    monolith_path = BACKEND_ROOT / "apps/storage/services/storage_file_service.py"
    report.append(f"exists={monolith_path.exists()}")
    if monolith_path.exists():
        failures.append("Legacy monolith still exists.")

    report.append("")
    report.append("=== Syntax compilation ===")
    compile_exit, compile_output = run_command(
        [sys.executable, "-m", "compileall", "-q", str(OPERATIONS_DIRECTORY)],
        REPOSITORY_ROOT,
    )
    report.append(f"exit={compile_exit}")
    report.append(compile_output)
    if compile_exit != 0:
        failures.append("Refactored modules failed syntax compilation.")

    report.append("")
    report.append("=== Django module imports ===")
    sys.path.insert(0, str(BACKEND_ROOT))
    try:
        import os
        import django

        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")
        django.setup()

        for module_name in MODULES:
            importlib.import_module(module_name)
            report.append(f"OK | {module_name}")

        package = importlib.import_module(
            "apps.storage.services.file_operations"
        )
        report.append("")
        report.append("=== Public exports ===")
        for export_name in REQUIRED_EXPORTS:
            if getattr(package, export_name, None) is None:
                raise RuntimeError(f"Missing export: {export_name}")
            report.append(f"OK | {export_name}")

    except Exception as error:
        failures.append(
            f"Django import or public contract failure: "
            f"{type(error).__name__}: {error}"
        )
        report.append(f"FAIL | {type(error).__name__}: {error}")

    report.append("")
    report.append("=== Regression suite ===")
    test_exit, test_output = run_command(
        [
            sys.executable,
            "manage.py",
            "test",
            "apps.storage.tests.test_s7_expired_file_shares",
            "--verbosity",
            "1",
            "--keepdb",
        ],
        BACKEND_ROOT,
    )
    report.append(f"exit={test_exit}")
    report.append(test_output)
    if test_exit != 0:
        failures.append("Storage regression suite failed.")

    report.append("")
    report.append("=== Final result ===")
    if failures:
        report.extend(f"FAIL | {failure}" for failure in failures)
    else:
        report.append("PASS | All refactor checks passed.")

    REPORT_PATH.write_text("\n".join(report) + "\n", encoding="utf-8")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
