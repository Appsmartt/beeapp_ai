from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)
from apps.statuses.exceptions import (
    StatusAccessError,
    StatusMediaError,
    StatusMediaUploadError,
    StatusOperationError,
    StatusValidationError,
)
from apps.statuses.services.status_media_refactor.deletion import (
    delete_status_media_object_safely,
)
from apps.statuses.services.status_media_refactor.uploads import (
    upload_status_media,
    upload_status_story_image_layer,
)
from apps.statuses.services.status_notification_service import (
    create_status_mention_notifications_safely,
)
from apps.statuses.services.status_refactor.actors import (
    resolve_owned_actor,
)
from apps.statuses.services.status_refactor.errors import (
    raise_status_operation_error,
)
from apps.statuses.services.status_refactor.response_utils import (
    extract_first_row,
)
from apps.statuses.services.status_refactor.validation import (
    normalize_actor_type,
    normalize_optional_text,
    normalize_story_kind,
    validate_story_input,
)


def create_status_story(
    *,
    user_id: str,
    actor_type: str,
    actor_commercial_profile_id: str | None,
    kind: str,
    caption: str | None = None,
    text_content: str | None = None,
    text_background_id: str | None = None,
    editor_metadata: dict[str, Any] | None = None,
    uploaded_file=None,
    duration_seconds: float | None = None,
    image_layer_files: list[dict[str, Any]] | None = None,
    commercial_offer_link: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized_actor_type = normalize_actor_type(actor_type)
    normalized_kind = normalize_story_kind(kind)
    normalized_user_id = str(user_id)

    actor_profile_id, commercial_profile_id, owner_profile_id = (
        resolve_owned_actor(
            user_id=normalized_user_id,
            actor_type=normalized_actor_type,
            actor_commercial_profile_id=(
                str(actor_commercial_profile_id)
                if actor_commercial_profile_id
                else None
            ),
        )
    )

    validate_story_input(
        kind=normalized_kind,
        text_content=text_content,
        text_background_id=text_background_id,
        uploaded_file=uploaded_file,
        editor_metadata=editor_metadata,
    )

    story = None
    uploaded_media: dict[str, Any] | None = None
    uploaded_image_layers: list[dict[str, Any]] = []

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.rpc(
                    "status_create_story",
                    {
                        "p_actor_type": normalized_actor_type,
                        "p_actor_profile_id": actor_profile_id,
                        "p_actor_commercial_profile_id": (
                            commercial_profile_id
                        ),
                        "p_kind": normalized_kind,
                        "p_caption": normalize_optional_text(caption),
                        "p_text_content": normalize_optional_text(
                            text_content
                        ),
                        "p_text_background_id": (
                            str(text_background_id)
                            if text_background_id
                            else None
                        ),
                        "p_editor_metadata": editor_metadata or {},
                    },
                ).execute()
            ),
        )
        story = extract_first_row(response)

        if not story:
            raise StatusOperationError(
                "Supabase did not return the created story."
            )

        uploaded_media = attach_story_media(
            story=story,
            owner_profile_id=owner_profile_id,
            kind=normalized_kind,
            uploaded_file=uploaded_file,
            duration_seconds=duration_seconds,
        )
        uploaded_image_layers = attach_story_image_layers(
            story=story,
            owner_profile_id=owner_profile_id,
            image_layer_files=image_layer_files,
        )
        attach_commercial_offer_link(
            story=story,
            commercial_offer_link=commercial_offer_link,
        )

        create_status_mention_notifications_safely(story=story)

        from apps.statuses.services.status_refactor.story_queries import (
            get_status_story,
        )

        return get_status_story(
            user_id=normalized_user_id,
            story_id=str(story["id"]),
            include_archived=False,
        )
    except (
        StatusAccessError,
        StatusMediaError,
        StatusMediaUploadError,
        StatusOperationError,
        StatusValidationError,
    ):
        rollback_story_creation(
            story=story,
            owner_profile_id=owner_profile_id,
            uploaded_media=uploaded_media,
            uploaded_image_layers=uploaded_image_layers,
        )
        raise
    except Exception as error:
        rollback_story_creation(
            story=story,
            owner_profile_id=owner_profile_id,
            uploaded_media=uploaded_media,
            uploaded_image_layers=uploaded_image_layers,
        )
        raise_status_operation_error(
            error,
            default_message="Could not create status story.",
        )


def attach_story_media(
    *,
    story: dict[str, Any],
    owner_profile_id: str,
    kind: str,
    uploaded_file,
    duration_seconds: float | None,
) -> dict[str, Any] | None:
    if kind == "text":
        return None

    uploaded_media = upload_status_media(
        owner_profile_id=owner_profile_id,
        story_id=str(story["id"]),
        uploaded_file=uploaded_file,
        kind=kind,
        duration_seconds=duration_seconds,
    )
    response = execute_with_supabase_admin_retry(
        lambda client: (
            client.rpc(
                "status_attach_story_media",
                {
                    "p_story_id": str(story["id"]),
                    "p_bucket_id": uploaded_media["bucket_id"],
                    "p_storage_path": uploaded_media["storage_path"],
                    "p_original_name": uploaded_media["original_name"],
                    "p_mime_type": uploaded_media["mime_type"],
                    "p_size_bytes": uploaded_media["size_bytes"],
                    "p_width": uploaded_media["width"],
                    "p_height": uploaded_media["height"],
                    "p_duration_seconds": (
                        uploaded_media["duration_seconds"]
                    ),
                },
            ).execute()
        ),
    )

    if not extract_first_row(response):
        raise StatusMediaUploadError(
            "Supabase did not attach the uploaded media."
        )

    return uploaded_media


def attach_story_image_layers(
    *,
    story: dict[str, Any],
    owner_profile_id: str,
    image_layer_files: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    uploaded_image_layers: list[dict[str, Any]] = []

    for image_layer_input in image_layer_files or []:
        metadata = image_layer_input["metadata"]
        uploaded_layer = upload_status_story_image_layer(
            owner_profile_id=owner_profile_id,
            story_id=str(story["id"]),
            uploaded_file=image_layer_input["file"],
            sort_order=int(metadata["sort_order"]),
        )
        uploaded_image_layers.append(uploaded_layer)

        response = execute_with_supabase_admin_retry(
            lambda client, metadata=metadata, uploaded_layer=uploaded_layer: (
                client.rpc(
                    "status_attach_story_image_layer",
                    {
                        "p_story_id": str(story["id"]),
                        "p_bucket_id": uploaded_layer["bucket_id"],
                        "p_storage_path": uploaded_layer["storage_path"],
                        "p_original_name": uploaded_layer[
                            "original_name"
                        ],
                        "p_mime_type": uploaded_layer["mime_type"],
                        "p_size_bytes": uploaded_layer["size_bytes"],
                        "p_x": metadata["x"],
                        "p_y": metadata["y"],
                        "p_scale": metadata["scale"],
                        "p_rotation": metadata["rotation"],
                        "p_size": metadata["size"],
                        "p_sort_order": metadata["sort_order"],
                    },
                ).execute()
            ),
        )

        if not extract_first_row(response):
            raise StatusMediaUploadError(
                "Supabase did not attach the uploaded image layer."
            )

    return uploaded_image_layers


def attach_commercial_offer_link(
    *,
    story: dict[str, Any],
    commercial_offer_link: dict[str, Any] | None,
) -> None:
    if not commercial_offer_link:
        return

    response = execute_with_supabase_admin_retry(
        lambda client: (
            client.rpc(
                "status_attach_story_commercial_offer",
                {
                    "p_story_id": str(story["id"]),
                    "p_commercial_offer_id": commercial_offer_link[
                        "commercial_offer_id"
                    ],
                    "p_commercial_offer_image_id": (
                        commercial_offer_link[
                            "commercial_offer_image_id"
                        ]
                    ),
                    "p_image_layer_id": commercial_offer_link[
                        "image_layer_id"
                    ],
                    "p_x": commercial_offer_link["x"],
                    "p_y": commercial_offer_link["y"],
                    "p_scale": commercial_offer_link["scale"],
                    "p_rotation": commercial_offer_link["rotation"],
                    "p_size": commercial_offer_link["size"],
                },
            ).execute()
        ),
    )

    if not extract_first_row(response):
        raise StatusOperationError(
            "Supabase did not attach the commercial offer link."
        )


def rollback_story_creation(
    *,
    story: dict[str, Any] | None,
    owner_profile_id: str,
    uploaded_media: dict[str, Any] | None,
    uploaded_image_layers: list[dict[str, Any]],
) -> None:
    if story:
        archive_story_safely(
            owner_profile_id=owner_profile_id,
            story_id=str(story["id"]),
        )

    if uploaded_media:
        delete_status_media_object_safely(
            bucket_id=uploaded_media["bucket_id"],
            storage_path=uploaded_media["storage_path"],
        )

    for uploaded_layer in uploaded_image_layers:
        delete_status_media_object_safely(
            bucket_id=uploaded_layer["bucket_id"],
            storage_path=uploaded_layer["storage_path"],
        )


def archive_story_safely(
    *,
    owner_profile_id: str,
    story_id: str,
) -> None:
    try:
        execute_with_supabase_admin_retry(
            lambda client: (
                client.rpc(
                    "status_archive_story",
                    {
                        "p_owner_profile_id": str(owner_profile_id),
                        "p_story_id": str(story_id),
                    },
                ).execute()
            ),
        )
    except Exception:
        return
