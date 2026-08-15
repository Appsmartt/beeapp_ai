class NotesError(Exception):
    """Base exception for notes domain errors."""


class NoteTemplateError(NotesError):
    """Raised when note templates cannot be retrieved."""


class NoteTemplateNotFoundError(NoteTemplateError):
    """Raised when a note template is unavailable."""


class NoteNotFoundError(NotesError):
    """Raised when a note cannot be found or accessed."""


class NoteCreateError(NotesError):
    """Raised when a note cannot be created."""


class NoteUpdateError(NotesError):
    """Raised when a note cannot be updated."""


class NoteDeleteError(NotesError):
    """Raised when a note cannot be deleted."""


class NoteFolderError(NotesError):
    """Raised when a note folder operation fails."""


class NoteFolderNotFoundError(NoteFolderError):
    """Raised when a note folder is not found or inaccessible."""


class NoteTagError(NotesError):
    """Raised when a note tag operation fails."""


class NoteTagNotFoundError(NoteTagError):
    """Raised when a note tag is not found or inaccessible."""