from __future__ import annotations

from apps.notes.exceptions import (
    NoteNotFoundError,
)
from apps.notes.services.note_service import (
    get_owned_note,
)
from apps.notes.services.note_share_service import (
    _get_active_received_note_share,
)


def ensure_note_access(
    *,
    user_id: str,
    note_id: str,
) -> None:
    try:
        get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=False,
        )
        return
    except NoteNotFoundError:
        pass

    _get_active_received_note_share(
        user_id=user_id,
        note_id=note_id,
        include_hidden=True,
    )
