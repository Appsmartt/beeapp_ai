from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path
from typing import Any, Callable

REPOSITORY_ROOT = Path(__file__).resolve().parents[6]
BACKEND_ROOT = REPOSITORY_ROOT / "Backend" / "beeAppBack"
REPORT_PATH = REPOSITORY_ROOT / "tmp" / "notes_serializers_refactor_test_report.txt"


def configure_django() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")
    sys.path.insert(0, str(BACKEND_ROOT))

    import django

    django.setup()


def serialize_errors(serializer: Any) -> str:
    return str(serializer.errors)


def expect_valid(serializer_class: type, payload: dict[str, Any]) -> dict[str, Any]:
    serializer = serializer_class(data=payload)
    if not serializer.is_valid():
        raise AssertionError(serialize_errors(serializer))
    return dict(serializer.validated_data)


def expect_invalid(
    serializer_class: type,
    payload: dict[str, Any],
    expected_error: str,
) -> None:
    serializer = serializer_class(data=payload)
    if serializer.is_valid():
        raise AssertionError("Expected serializer validation to fail.")
    if expected_error not in serialize_errors(serializer):
        raise AssertionError(serialize_errors(serializer))


def run_check(
    name: str,
    callback: Callable[[], None],
    results: list[tuple[str, bool, str]],
) -> None:
    try:
        callback()
    except Exception as error:
        results.append((name, False, repr(error)))
    else:
        results.append((name, True, "ok"))


def main() -> int:
    configure_django()

    from django.core.files.uploadedfile import SimpleUploadedFile
    from apps.notes import serializers
    from apps.notes.serializers.constants import (
        MAX_NOTE_CONTENT_BYTES,
        MAX_NOTE_UPLOAD_FILES,
    )

    results: list[tuple[str, bool, str]] = []
    first_id = uuid.uuid4()
    second_id = uuid.uuid4()
    valid_content = {
        "version": 1,
        "blocks": [
            {
                "id": "block-1",
                "type": "text",
            }
        ],
    }

    def check_public_exports() -> None:
        expected = {
            "CreateNoteAttachmentSerializer",
            "CreateNoteFolderSerializer",
            "CreateNoteSerializer",
            "CreateNoteShareSerializer",
            "CreateNoteTagSerializer",
            "MoveNoteFolderSerializer",
            "NoteAttachmentAccessQuerySerializer",
            "NoteFolderQuerySerializer",
            "NoteListQuerySerializer",
            "NoteTemplateListQuerySerializer",
            "ReceivedNoteSharesQuerySerializer",
            "RenameNoteFolderSerializer",
            "ReplaceNoteTagsSerializer",
            "UpdateNoteAttachmentSerializer",
            "UpdateNoteSerializer",
            "UpdateNoteTagSerializer",
            "UploadNoteAttachmentsSerializer",
        }
        if set(serializers.__all__) != expected:
            raise AssertionError(serializers.__all__)
        for serializer_name in expected:
            if not hasattr(serializers, serializer_name):
                raise AssertionError(serializer_name)

    def check_template_defaults() -> None:
        data = expect_valid(
            serializers.NoteTemplateListQuerySerializer,
            {},
        )
        assert data == {"include_inactive": False}

    def check_create_note() -> None:
        data = expect_valid(
            serializers.CreateNoteSerializer,
            {
                "title": "  Important note  ",
                "template_id": str(first_id),
                "folder_id": str(second_id),
            },
        )
        assert data["title"] == "Important note"
        expect_invalid(
            serializers.CreateNoteSerializer,
            {"title": "   "},
            "This field may not be blank.",
        )

    def check_note_list_defaults_and_limits() -> None:
        data = expect_valid(serializers.NoteListQuerySerializer, {})
        assert data == {"deleted": False, "limit": 50, "offset": 0}
        expect_invalid(
            serializers.NoteListQuerySerializer,
            {"limit": 101},
            "Ensure this value is less than or equal to 100.",
        )
        expect_invalid(
            serializers.NoteListQuerySerializer,
            {"search": "   "},
            "This field may not be blank.",
        )

    def check_update_note_validations() -> None:
        data = expect_valid(
            serializers.UpdateNoteSerializer,
            {
                "title": "  Updated  ",
                "content": valid_content,
                "color": " #8b5cf6 ",
                "position": "123.456789",
            },
        )
        assert data["title"] == "Updated"
        assert data["color"] == "#8B5CF6"
        expect_invalid(
            serializers.UpdateNoteSerializer,
            {},
            "Provide at least one field to update.",
        )
        expect_invalid(
            serializers.UpdateNoteSerializer,
            {
                "content": {
                    "version": 1,
                    "blocks": [
                        {"id": "same", "type": "text"},
                        {"id": "same", "type": "heading"},
                    ],
                }
            },
            "Block IDs cannot be repeated.",
        )
        expect_invalid(
            serializers.UpdateNoteSerializer,
            {
                "content": {
                    "version": 1,
                    "blocks": [{"id": "block", "type": "unsupported"}],
                }
            },
            "The block type is not supported.",
        )
        oversized_content = {
            "version": 1,
            "blocks": [{"id": "block", "type": "text"}],
            "payload": "x" * MAX_NOTE_CONTENT_BYTES,
        }
        expect_invalid(
            serializers.UpdateNoteSerializer,
            {"content": oversized_content},
            "Note content cannot exceed 1 MB.",
        )

    def check_direct_validators() -> None:
        from rest_framework import serializers as drf_serializers
        from apps.notes.serializers.validators import (
            validate_note_folder_name,
            validate_note_tag_icon,
            validate_note_tag_name,
            validate_note_title,
        )

        for validator, value, expected_error in (
            (validate_note_title, "   ", "Title cannot be empty."),
            (validate_note_folder_name, "   ", "Folder name cannot be empty."),
            (validate_note_tag_name, "   ", "Tag name cannot be empty."),
            (validate_note_tag_icon, "   ", "Tag icon cannot be empty."),
        ):
            try:
                validator(value)
            except drf_serializers.ValidationError as error:
                if expected_error not in str(error):
                    raise AssertionError(str(error))
            else:
                raise AssertionError(expected_error)

    def check_folders() -> None:
        data = expect_valid(
            serializers.CreateNoteFolderSerializer,
            {"name": "  Work  ", "parent_id": None},
        )
        assert data["name"] == "Work"
        expect_invalid(
            serializers.CreateNoteFolderSerializer,
            {"name": "invalid/path"},
            "Folder names cannot contain slashes.",
        )
        expect_invalid(
            serializers.RenameNoteFolderSerializer,
            {"name": "   "},
            "This field may not be blank.",
        )
        assert expect_valid(
            serializers.MoveNoteFolderSerializer,
            {"parent_id": None},
        ) == {"parent_id": None}

    def check_tags() -> None:
        data = expect_valid(
            serializers.CreateNoteTagSerializer,
            {"name": "  Personal  ", "icon": "  star  ", "color": "#abcdef"},
        )
        assert data["name"] == "Personal"
        assert data["icon"] == "star"
        assert data["color"] == "#ABCDEF"
        defaults = expect_valid(
            serializers.CreateNoteTagSerializer,
            {"name": "Default tag"},
        )
        assert defaults["icon"] == "tag"
        assert defaults["color"] == "#8B5CF6"
        assert defaults["sort_order"] == 0
        expect_invalid(
            serializers.UpdateNoteTagSerializer,
            {},
            "Provide at least one field to update.",
        )
        expect_invalid(
            serializers.ReplaceNoteTagsSerializer,
            {"tag_ids": [str(first_id), str(first_id)]},
            "Tag IDs cannot be repeated.",
        )

    def check_attachments() -> None:
        data = expect_valid(
            serializers.CreateNoteAttachmentSerializer,
            {"file_id": str(first_id)},
        )
        assert data["attachment_type"] == "attachment"
        assert data["display_order"] == 0
        expect_invalid(
            serializers.UpdateNoteAttachmentSerializer,
            {},
            "Provide at least one field to update.",
        )
        single_file = SimpleUploadedFile(
            "single.txt",
            b"single-content",
            content_type="text/plain",
        )
        uploaded = expect_valid(
            serializers.UploadNoteAttachmentsSerializer,
            {"file": single_file},
        )
        assert len(uploaded["files"]) == 1
        assert "file" not in uploaded
        file_list = [
            SimpleUploadedFile(
                f"file-{index}.txt",
                f"content-{index}".encode(),
                content_type="text/plain",
            )
            for index in range(MAX_NOTE_UPLOAD_FILES)
        ]
        uploaded_list = expect_valid(
            serializers.UploadNoteAttachmentsSerializer,
            {"files": file_list, "attachment_type": "image"},
        )
        assert len(uploaded_list["files"]) == MAX_NOTE_UPLOAD_FILES
        expect_invalid(
            serializers.UploadNoteAttachmentsSerializer,
            {},
            "Provide at least one file using 'files' or 'file'.",
        )
        assert expect_valid(
            serializers.NoteAttachmentAccessQuerySerializer,
            {},
        ) == {"download": False}

    def check_shares() -> None:
        data = expect_valid(
            serializers.CreateNoteShareSerializer,
            {"recipient_id": str(first_id), "expires_at": None},
        )
        assert data["recipient_id"] == first_id
        assert data["expires_at"] is None
        defaults = expect_valid(
            serializers.ReceivedNoteSharesQuerySerializer,
            {},
        )
        assert defaults == {
            "include_hidden": False,
            "limit": 50,
            "offset": 0,
        }
        expect_invalid(
            serializers.ReceivedNoteSharesQuerySerializer,
            {"offset": -1},
            "Ensure this value is greater than or equal to 0.",
        )

    def check_repeated_cycles() -> None:
        for index in range(100):
            data = expect_valid(
                serializers.UpdateNoteSerializer,
                {
                    "title": f" Note {index} ",
                    "content": {
                        "version": 1,
                        "blocks": [
                            {
                                "id": f"block-{index}",
                                "type": "text",
                            }
                        ],
                    },
                    "color": "#123ABC",
                },
            )
            assert data["title"] == f"Note {index}"
            assert data["color"] == "#123ABC"

    run_check("public_exports", check_public_exports, results)
    run_check("template_defaults", check_template_defaults, results)
    run_check("create_note", check_create_note, results)
    run_check(
        "note_list_defaults_and_limits",
        check_note_list_defaults_and_limits,
        results,
    )
    run_check(
        "update_note_validations",
        check_update_note_validations,
        results,
    )
    run_check("direct_validators", check_direct_validators, results)
    run_check("folders", check_folders, results)
    run_check("tags", check_tags, results)
    run_check("attachments", check_attachments, results)
    run_check("shares", check_shares, results)
    run_check("repeated_cycles", check_repeated_cycles, results)

    passed = sum(success for _, success, _ in results)
    total = len(results)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        "\n".join(
            [
                "=== NOTES SERIALIZERS REFACTOR TEST REPORT ===",
                f"passed={passed}",
                f"total={total}",
                *[
                    f"{'PASS' if success else 'FAIL'} | {name} | {detail}"
                    for name, success, detail in results
                ],
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    print(REPORT_PATH)
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
