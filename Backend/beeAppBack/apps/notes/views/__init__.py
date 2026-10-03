from .attachments import (
    NoteAttachmentAccessView,
    NoteAttachmentDetailView,
    NoteAttachmentsView,
    NoteAttachmentUploadView,
)
from .folders import (
    NoteFolderDetailView,
    NoteFoldersView,
)
from .notes import (
    NoteDetailView,
    NoteRestoreView,
    NotesView,
    NoteTrashView,
)
from .shares import (
    NoteShareDetailView,
    NoteShareRecipientsView,
    NoteSharesView,
    ReceivedNoteSharesView,
    SharedNoteDetailView,
)
from .tags import (
    NoteTagDetailView,
    NoteTagsAssignmentView,
    NoteTagsView,
)
from .templates import NoteTemplatesView

__all__ = [
    "NoteAttachmentAccessView",
    "NoteAttachmentDetailView",
    "NoteAttachmentsView",
    "NoteAttachmentUploadView",
    "NoteDetailView",
    "NoteFolderDetailView",
    "NoteFoldersView",
    "NoteRestoreView",
    "NotesView",
    "NoteShareDetailView",
    "NoteShareRecipientsView",
    "NoteSharesView",
    "NoteTagDetailView",
    "NoteTagsAssignmentView",
    "NoteTagsView",
    "NoteTemplatesView",
    "NoteTrashView",
    "ReceivedNoteSharesView",
    "SharedNoteDetailView",
]
