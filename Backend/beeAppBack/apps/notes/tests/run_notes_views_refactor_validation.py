#!/usr/bin/env python3
import ast
import os
import subprocess
import sys
from pathlib import Path


def main():
    backend_root = Path(__file__).resolve().parents[3]
    repository_root = backend_root.parent.parent
    views_directory = backend_root / "apps/notes/views"
    report_path = repository_root / "tmp/notes_views_refactor_test_report.txt"
    expected_classes = {
        "NoteTemplatesView",
        "NotesView",
        "NoteDetailView",
        "NoteTrashView",
        "NoteRestoreView",
        "NoteFoldersView",
        "NoteFolderDetailView",
        "NoteTagsView",
        "NoteTagDetailView",
        "NoteTagsAssignmentView",
        "NoteAttachmentsView",
        "NoteAttachmentUploadView",
        "NoteAttachmentDetailView",
        "NoteAttachmentAccessView",
        "NoteShareRecipientsView",
        "NoteSharesView",
        "ReceivedNoteSharesView",
        "SharedNoteDetailView",
        "NoteShareDetailView",
    }
    results = []

    def record(name, passed, detail):
        results.append((name, passed, detail))

    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))

    os.environ.setdefault(
        "DJANGO_SETTINGS_MODULE",
        "beeAppBack.settings",
    )

    try:
        import django

        django.setup()

        from apps.notes import urls, views

        exported_classes = set(views.__all__)
        route_classes = {
            pattern.callback.view_class.__name__
            for pattern in urls.urlpatterns
        }

        record(
            "Package exports",
            exported_classes == expected_classes,
            str(sorted(exported_classes ^ expected_classes))
            or "All expected classes exported.",
        )
        record(
            "Route bindings",
            route_classes == expected_classes,
            str(sorted(route_classes ^ expected_classes))
            or "All routes bind to expected classes.",
        )
    except Exception as error:
        record("Django imports", False, repr(error))

    for module_path in sorted(views_directory.glob("*.py")):
        try:
            content = module_path.read_text(encoding="utf-8")
            ast.parse(content)
            line_count = len(content.splitlines())
            record(
                f"Syntax and line limit: {module_path.name}",
                line_count <= 400,
                f"{line_count} lines.",
            )
        except Exception as error:
            record(
                f"Syntax and line limit: {module_path.name}",
                False,
                repr(error),
            )

    check_result = subprocess.run(
        [sys.executable, "manage.py", "check"],
        cwd=backend_root,
        capture_output=True,
        text=True,
        env=os.environ.copy(),
    )
    record(
        "Django system check",
        check_result.returncode == 0,
        (check_result.stdout + check_result.stderr).strip()
        or "No output.",
    )

    monolith_path = backend_root / "apps/notes/views.py"
    record(
        "Monolith removal",
        not monolith_path.exists(),
        "views.py is absent."
        if not monolith_path.exists()
        else "views.py still exists.",
    )

    report_lines = ["=== NOTES VIEWS REFACTOR TEST REPORT ===", ""]
    for name, passed, detail in results:
        report_lines.extend([
            f"{'PASS' if passed else 'FAIL'}: {name}",
            detail,
            "",
        ])

    passed = all(result[1] for result in results)
    report_lines.append(f"RESULT: {'PASS' if passed else 'FAIL'}")
    report_path.write_text(
        "\n".join(report_lines) + "\n",
        encoding="utf-8",
    )

    print(report_path)
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
