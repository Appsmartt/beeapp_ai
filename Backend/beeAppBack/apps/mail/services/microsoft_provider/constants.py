"""Constants for Microsoft Graph mail operations."""

MICROSOFT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
MICROSOFT_MESSAGES_ENDPOINT = (
    f"{MICROSOFT_GRAPH_BASE_URL}/me/messages"
)
MICROSOFT_MAIL_FOLDERS_ENDPOINT = (
    f"{MICROSOFT_GRAPH_BASE_URL}/me/mailFolders"
)

MICROSOFT_WELL_KNOWN_FOLDER_NAMES = {
    "inbox": "inbox",
    "drafts": "drafts",
    "sent": "sentitems",
    "spam": "junkemail",
    "trash": "deleteditems",
}

MICROSOFT_FOLDER_DISPLAY_NAMES = {
    "inbox": {"inbox", "bandeja de entrada", "inbox folder"},
    "drafts": {"drafts", "borradores"},
    "sent": {
        "sent items",
        "sent",
        "elementos enviados",
        "enviados",
    },
    "spam": {
        "junk email",
        "junk",
        "correo no deseado",
        "spam",
    },
    "trash": {
        "deleted items",
        "deleted",
        "elementos eliminados",
        "papelera",
    },
    "archived": {"archive", "archivados", "archivo"},
}

HTTP_TIMEOUT_SECONDS = 25.0
MAX_PAGE_SIZE = 250
MAX_PAGINATION_PAGES = 100
MAX_ATTACHMENT_PAGES = 20
MICROSOFT_IMMUTABLE_ID_PREFER = 'IdType="ImmutableId"'
