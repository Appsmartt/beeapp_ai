STATUS_MEDIA_BUCKET = "beeapp-statuses"
STATUS_MEDIA_SIGNED_URL_TTL_SECONDS = 300

MAX_STATUS_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
MAX_STATUS_GIF_SIZE_BYTES = 10 * 1024 * 1024
MAX_STATUS_VIDEO_SIZE_BYTES = 40 * 1024 * 1024
MAX_STATUS_VIDEO_DURATION_SECONDS = 90

STATUS_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
STATUS_GIF_MIME_TYPES = {
    "image/gif",
}
STATUS_VIDEO_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",
}

MIME_TYPES_BY_KIND = {
    "image": STATUS_IMAGE_MIME_TYPES,
    "gif": STATUS_GIF_MIME_TYPES,
    "video": STATUS_VIDEO_MIME_TYPES,
}
MAX_SIZE_BY_KIND = {
    "image": MAX_STATUS_IMAGE_SIZE_BYTES,
    "gif": MAX_STATUS_GIF_SIZE_BYTES,
    "video": MAX_STATUS_VIDEO_SIZE_BYTES,
}
EXTENSIONS_BY_MIME_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
}
