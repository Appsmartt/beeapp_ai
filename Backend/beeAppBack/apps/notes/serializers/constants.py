MAX_NOTE_TITLE_LENGTH = 500
MAX_NOTE_CONTENT_BYTES = 1_000_000
MAX_NOTE_UPLOAD_FILES = 10

ALLOWED_BLOCK_TYPES = {
    "text",
    "heading",
    "field",
    "textarea",
    "checklist",
    "bulleted_list",
    "numbered_list",
    "date",
    "date_list",
    "number_list",
    "image",
    "file",
    "file_list",
    "divider",
}

NOTE_ATTACHMENT_TYPES = (
    "attachment",
    "image",
    "cover",
)
