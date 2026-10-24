from __future__ import annotations

STORAGE_BUCKET = "beeapp-files"
MAX_FILE_SIZE_BYTES = 52_428_800
SIGNED_URL_EXPIRES_IN_SECONDS = 300

BLOCKED_EXTENSIONS = {
    "apk",
    "app",
    "bat",
    "bash",
    "cmd",
    "com",
    "dll",
    "dylib",
    "exe",
    "jar",
    "msi",
    "ps1",
    "scr",
    "sh",
    "so",
    "zsh",
}

FILE_LIST_COLUMNS = (
    "id,owner_id,folder_id,original_name,display_name,"
    "extension,mime_type,kind,size_bytes,status,is_starred,"
    "trashed_at,purge_after,created_at,updated_at"
)
