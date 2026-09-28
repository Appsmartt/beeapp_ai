from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from apps.chat.exceptions import ChatAttachmentError
from apps.chat.services.chat_attachment_service import (
    _validate_chat_upload_type,
    _validate_file_for_chat_message,
)


class ChatAttachmentTypeTests(SimpleTestCase):
    def test_accepts_traditional_documents(self):
        cases = (
            ("report.pdf", "application/pdf", "document"),
            ("letter.doc", "application/msword", "document"),
            (
                "letter.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "document",
            ),
            ("budget.xls", "application/vnd.ms-excel", "spreadsheet"),
            (
                "budget.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "spreadsheet",
            ),
            ("slides.ppt", "application/vnd.ms-powerpoint", "presentation"),
            (
                "slides.pptx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "presentation",
            ),
            ("data.csv", "text/csv", "spreadsheet"),
            ("notes.txt", "text/plain", "document"),
            ("notes.md", "text/markdown", "document"),
        )
        for filename, mime_type, kind in cases:
            with self.subTest(filename=filename):
                uploaded = SimpleUploadedFile(
                    filename, b"sample", content_type=mime_type
                )
                _validate_chat_upload_type(
                    uploaded_file=uploaded, message_type="document"
                )
                _validate_file_for_chat_message(
                    file_record={
                        "owner_id": "owner",
                        "status": "ready",
                        "trashed_at": None,
                        "kind": kind,
                    },
                    user_id="owner",
                    message_type="document",
                )

    def test_rejects_unsafe_or_mismatched_documents(self):
        cases = (
            ("script.exe", "application/pdf"),
            ("macro.docm", "application/vnd.ms-word.document.macroEnabled.12"),
            ("macro.xlsm", "application/vnd.ms-excel.sheet.macroEnabled.12"),
            ("macro.pptm", "application/vnd.ms-powerpoint.presentation.macroEnabled.12"),
            ("report.pdf", "application/x-msdownload"),
            ("budget.xlsx", "application/pdf"),
        )
        for filename, mime_type in cases:
            with self.subTest(filename=filename, mime_type=mime_type):
                uploaded = SimpleUploadedFile(
                    filename, b"sample", content_type=mime_type
                )
                with self.assertRaises(ChatAttachmentError):
                    _validate_chat_upload_type(
                        uploaded_file=uploaded, message_type="document"
                    )

    def test_video_requires_mp4_and_matching_mime(self):
        for filename, mime_type, accepted in (
            ("clip.mp4", "video/mp4", True),
            ("clip.mov", "video/quicktime", False),
            ("clip.mp4", "application/pdf", False),
        ):
            uploaded = SimpleUploadedFile(
                filename, b"sample", content_type=mime_type
            )
            with self.subTest(filename=filename, mime_type=mime_type):
                if accepted:
                    _validate_chat_upload_type(
                        uploaded_file=uploaded, message_type="video"
                    )
                else:
                    with self.assertRaises(ChatAttachmentError):
                        _validate_chat_upload_type(
                            uploaded_file=uploaded, message_type="video"
                        )

    def test_document_does_not_accept_other_storage_kinds(self):
        for kind in ("archive", "other", "image", "video", "audio"):
            with self.subTest(kind=kind):
                with self.assertRaises(ChatAttachmentError):
                    _validate_file_for_chat_message(
                        file_record={
                            "owner_id": "owner",
                            "status": "ready",
                            "trashed_at": None,
                            "kind": kind,
                        },
                        user_id="owner",
                        message_type="document",
                    )
