from __future__ import annotations

from typing import Any


ATTACHMENT_COLUMNS = (
    "id,note_id,file_id,attachment_type,display_order,created_at"
)

FILE_COLUMNS = (
    "id,owner_id,folder_id,bucket_id,storage_path,"
    "original_name,display_name,extension,mime_type,"
    "kind,size_bytes,status,is_starred,trashed_at,"
    "purge_after,created_at,updated_at"
)


def extract_rpc_uuid(value: Any) -> str | None:
    if isinstance(value, str):
        return value

    if isinstance(value, list):
        if not value:
            return None

        return extract_rpc_uuid(value[0])

    if isinstance(value, dict):
        return (
            value.get("get_or_create_notes_storage_folder")
            or value.get("attach_file_to_note")
            or value.get("id")
            or value.get("value")
        )

    return None
