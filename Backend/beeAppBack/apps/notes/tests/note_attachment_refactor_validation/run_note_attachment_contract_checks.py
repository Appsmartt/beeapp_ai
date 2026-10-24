#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import Mock, patch

backend_root = Path(__file__).resolve().parents[4]
repository_root = backend_root.parent.parent
sys.path.insert(0, str(backend_root))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")

import django
django.setup()

from apps.notes.exceptions import NoteAttachmentFileNotFoundError
from apps.storage.exceptions import StorageUploadError
from apps.notes.services.note_attachments import operations, uploads

results = []

def record(name, passed):
    results.append((name, passed))

def test_list():
    attachment = {"id": "a1", "file_id": "f1"}
    file_record = {"id": "f1", "status": "ready"}
    query = Mock()
    query.select.return_value = query
    query.eq.return_value = query
    query.order.return_value = query
    query.execute.return_value = Mock(data=[attachment])
    client = Mock()
    client.table.return_value = query
    with patch.object(operations, "ensure_note_access"):
        with patch.object(operations, "get_supabase_admin_client", return_value=client):
            with patch.object(operations, "get_files_by_ids", return_value={"f1": file_record}):
                for _ in range(20):
                    result = operations.list_note_attachments(user_id="u1", note_id="n1", allow_shared=True)
    record("Repeated shared list", result == [{**attachment, "file": file_record}])

def test_owned_operations():
    attachment = {"id": "a1", "file_id": "f1"}
    file_record = {"id": "f1", "owner_id": "u1"}
    with patch.object(operations, "get_owned_note"):
        with patch.object(operations, "get_note_attachment_row", return_value=attachment):
            with patch.object(operations, "get_attachable_owned_file", return_value=file_record):
                result = operations.get_note_attachment(user_id="u1", note_id="n1", attachment_id="a1")
    record("Owned attachment read", result == {**attachment, "file": file_record})

def test_security_error():
    with patch.object(operations, "get_owned_note"):
        with patch.object(operations, "get_note_attachment_row", return_value={"file_id": "f1"}):
            with patch.object(operations, "get_attachable_owned_file", side_effect=NoteAttachmentFileNotFoundError("missing")):
                try:
                    operations.get_note_attachment(user_id="u1", note_id="n1", attachment_id="a1")
                except NoteAttachmentFileNotFoundError:
                    blocked = True
                else:
                    blocked = False
    record("Unavailable file rejected", blocked)

def test_upload_partial():
    file_ok = Mock(name="ok.txt")
    file_ok.name = "ok.txt"
    file_bad = Mock(name="bad.txt")
    file_bad.name = "bad.txt"
    with patch.object(uploads, "get_owned_note"):
        with patch.object(uploads, "get_or_create_notes_storage_folder", return_value="folder-1"):
            with patch.object(uploads, "prepare_and_upload_file", side_effect=[{"id": "f1"}, StorageUploadError("failed")]):
                with patch.object(uploads, "attach_existing_file", return_value={"id": "a1"}):
                    result = uploads.upload_and_attach_files(user_id="u1", note_id="n1", uploaded_files=[file_ok, file_bad])
    record("Partial upload result", result["success_count"] == 1 and result["failure_count"] == 1 and result["failed_files"][0]["code"] == "upload_failed")

def main():
    test_list()
    test_owned_operations()
    test_security_error()
    test_upload_partial()
    passed = all(value for _, value in results)
    report = repository_root / "tmp/note_attachment_refactor_contract_report.txt"
    lines = ["=== NOTE ATTACHMENT CONTRACT REPORT ===", ""]
    lines.extend([("PASS" if value else "FAIL") + ": " + name for name, value in results])
    lines.extend(["", "RESULT: " + ("PASS" if passed else "FAIL")])
    report.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(report)
    return 0 if passed else 1

if __name__ == "__main__":
    raise SystemExit(main())
