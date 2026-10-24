from __future__ import annotations

from .note_attachments.operations import (
    attach_existing_file,
    create_note_attachment_access_url,
    get_note_attachment,
    list_note_attachments,
    remove_note_attachment,
    update_note_attachment,
)
from .note_attachments.uploads import (
    upload_and_attach_files,
)

__all__ = [
    "attach_existing_file",
    "create_note_attachment_access_url",
    "get_note_attachment",
    "list_note_attachments",
    "remove_note_attachment",
    "update_note_attachment",
    "upload_and_attach_files",
]
