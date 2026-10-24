from __future__ import annotations

import uuid
from typing import Any

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.statuses.exceptions import StatusMediaUploadError
from apps.statuses.services.status_media_refactor.shared import (
    STATUS_MEDIA_BUCKET,
)
from apps.statuses.services.status_media_refactor.validation import (
    safe_extension,
    validate_status_media_file,
)


def upload_status_media(
    *,
    owner_profile_id: str,
    story_id: str,
    uploaded_file,
    kind: str,
    duration_seconds: float | None = None,
) -> dict[str, Any]:
    validated = validate_status_media_file(
        uploaded_file=uploaded_file,
        kind=kind,
        duration_seconds=duration_seconds,
    )
    extension = safe_extension(
        filename=validated["original_name"],
        mime_type=validated["mime_type"],
    )
    storage_path = (
        f"{owner_profile_id}/stories/{story_id}/"
        f"{uuid.uuid4().hex}.{extension}"
    )

    try:
        uploaded_file.seek(0)
        response = (
            get_supabase_admin_client()
            .storage.from_(STATUS_MEDIA_BUCKET)
            .upload(
                path=storage_path,
                file=uploaded_file.read(),
                file_options={
                    "content-type": validated["mime_type"],
                    "upsert": "false",
                },
            )
        )
        if not response:
            raise StatusMediaUploadError(
                "Supabase Storage did not confirm the media upload."
            )
        return {
            "bucket_id": STATUS_MEDIA_BUCKET,
            "storage_path": storage_path,
            **validated,
            "width": None,
            "height": None,
        }
    except StatusMediaUploadError:
        raise
    except Exception as error:
        raise StatusMediaUploadError(
            f"Could not upload status media: {error}"
        ) from error


def upload_status_story_image_layer(
    *,
    owner_profile_id: str,
    story_id: str,
    uploaded_file,
    sort_order: int,
) -> dict[str, Any]:
    validated = validate_status_media_file(
        uploaded_file=uploaded_file,
        kind="image",
    )
    extension = safe_extension(
        filename=validated["original_name"],
        mime_type=validated["mime_type"],
    )
    storage_path = (
        f"{owner_profile_id}/stories/{story_id}/layers/"
        f"{sort_order}-{uuid.uuid4().hex}.{extension}"
    )

    try:
        uploaded_file.seek(0)
        response = (
            get_supabase_admin_client()
            .storage.from_(STATUS_MEDIA_BUCKET)
            .upload(
                path=storage_path,
                file=uploaded_file.read(),
                file_options={
                    "content-type": validated["mime_type"],
                    "upsert": "false",
                },
            )
        )
        if not response:
            raise StatusMediaUploadError(
                "Supabase Storage did not confirm the image layer upload."
            )
        return {
            "bucket_id": STATUS_MEDIA_BUCKET,
            "storage_path": storage_path,
            **validated,
        }
    except StatusMediaUploadError:
        raise
    except Exception as error:
        raise StatusMediaUploadError(
            f"Could not upload status image layer: {error}"
        ) from error
