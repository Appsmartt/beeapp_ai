from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.statuses.exceptions import (
    StatusAccessError,
    StatusArchiveError,
    StatusMediaError,
    StatusMediaUploadError,
    StatusNotFoundError,
    StatusOperationError,
    StatusValidationError,
    StatusViewError,
    StatusViewerAccessError,
)
from apps.statuses.services.status_media_service import (
    STATUS_MEDIA_SIGNED_URL_TTL_SECONDS,
    create_status_avatar_signed_url,
    create_status_media_signed_url,
    delete_status_media_object_safely,
    upload_status_media,
)
from apps.statuses.services.status_notification_service import (
    create_status_mention_notifications_safely,
)


TEXT_BACKGROUND_COLUMNS = (
    "id,code,label,hex_color,is_active,sort_order,created_at"
)

STATUS_STORY_COLUMNS = (
    "id,actor_type,actor_profile_id,actor_commercial_profile_id,"
    "kind,caption,text_content,text_background_id,editor_metadata,"
    "created_at,expires_at,manually_archived_at,deleted_at,updated_at"
)

STATUS_MEDIA_COLUMNS = (
    "id,story_id,bucket_id,storage_path,original_name,mime_type,"
    "size_bytes,width,height,duration_seconds,created_at,updated_at"
)

STATUS_MEDIA_BUCKET = "beeapp-statuses"


def list_active_text_backgrounds() -> list[dict[str, Any]]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("status_text_backgrounds")
                .select(TEXT_BACKGROUND_COLUMNS)
                .eq("is_active", True)
                .order("sort_order")
                .execute()
            ),
        )

        data = _response_rows(response)

        return [
            {
                "id": str(background["id"]),
                "code": background["code"],
                "label": background["label"],
                "hex_color": background["hex_color"],
                "sort_order": int(background["sort_order"]),
            }
            for background in data
        ]

    except Exception as error:
        raise StatusOperationError(
            "Could not retrieve text backgrounds."
        ) from error


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
) -> dict[str, Any]:
    """
    Crea una sola historia.

    Para media:
    1. inserta la historia;
    2. sube el binario privado;
    3. adjunta metadatos mediante RPC;
    4. si falla 2/3, retira lógicamente la historia y elimina
       el objeto como compensación.
    """
    normalized_actor_type = _normalize_actor_type(actor_type)
    normalized_kind = _normalize_story_kind(kind)
    normalized_user_id = str(user_id)

    actor_profile_id, commercial_profile_id, owner_profile_id = (
        _resolve_owned_actor(
            user_id=normalized_user_id,
            actor_type=normalized_actor_type,
            actor_commercial_profile_id=(
                str(actor_commercial_profile_id)
                if actor_commercial_profile_id
                else None
            ),
        )
    )

    _validate_story_input(
        kind=normalized_kind,
        text_content=text_content,
        text_background_id=text_background_id,
        uploaded_file=uploaded_file,
        editor_metadata=editor_metadata,
    )

    story = None
    uploaded_media: dict[str, Any] | None = None

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_create_story",
                    {
                        "p_actor_type": normalized_actor_type,
                        "p_actor_profile_id": actor_profile_id,
                        "p_actor_commercial_profile_id": (
                            commercial_profile_id
                        ),
                        "p_kind": normalized_kind,
                        "p_caption": _normalize_optional_text(caption),
                        "p_text_content": _normalize_optional_text(
                            text_content
                        ),
                        "p_text_background_id": (
                            str(text_background_id)
                            if text_background_id
                            else None
                        ),
                        "p_editor_metadata": editor_metadata or {},
                    },
                )
                .execute()
            ),
        )

        story = _extract_first_row(response)

        if not story:
            raise StatusOperationError(
                "Supabase did not return the created story."
            )

        if normalized_kind != "text":
            uploaded_media = upload_status_media(
                owner_profile_id=owner_profile_id,
                story_id=str(story["id"]),
                uploaded_file=uploaded_file,
                kind=normalized_kind,
                duration_seconds=duration_seconds,
            )

            media_response = execute_with_supabase_admin_retry(
                lambda client: (
                    client
                    .rpc(
                        "status_attach_story_media",
                        {
                            "p_story_id": str(story["id"]),
                            "p_bucket_id": uploaded_media["bucket_id"],
                            "p_storage_path": (
                                uploaded_media["storage_path"]
                            ),
                            "p_original_name": (
                                uploaded_media["original_name"]
                            ),
                            "p_mime_type": uploaded_media["mime_type"],
                            "p_size_bytes": (
                                uploaded_media["size_bytes"]
                            ),
                            "p_width": uploaded_media["width"],
                            "p_height": uploaded_media["height"],
                            "p_duration_seconds": (
                                uploaded_media["duration_seconds"]
                            ),
                        },
                    )
                    .execute()
                ),
            )

            media = _extract_first_row(media_response)

            if not media:
                raise StatusMediaUploadError(
                    "Supabase did not attach the uploaded media."
                )

        create_status_mention_notifications_safely(
            story=story,
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
        if story:
            _archive_story_safely(
                owner_profile_id=owner_profile_id,
                story_id=str(story["id"]),
            )

        if uploaded_media:
            delete_status_media_object_safely(
                bucket_id=uploaded_media["bucket_id"],
                storage_path=uploaded_media["storage_path"],
            )

        raise

    except Exception as error:
        if story:
            _archive_story_safely(
                owner_profile_id=owner_profile_id,
                story_id=str(story["id"]),
            )

        if uploaded_media:
            delete_status_media_object_safely(
                bucket_id=uploaded_media["bucket_id"],
                storage_path=uploaded_media["storage_path"],
            )

        _raise_status_operation_error(
            error,
            default_message="Could not create status story.",
        )


def list_status_feed(
    *,
    user_id: str,
    limit: int = 50,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_list_feed",
                    {
                        "p_viewer_profile_id": str(user_id),
                        "p_limit": max(1, min(int(limit), 100)),
                    },
                )
                .execute()
            ),
        )

        authors = [
            _enrich_feed_author(row)
            for row in _response_rows(response)
        ]

        return {
            "authors": authors,
            "limit": max(1, min(int(limit), 100)),
        }

    except StatusOperationError:
        raise

    except Exception as error:
        _raise_status_operation_error(
            error,
            default_message="Could not retrieve statuses feed.",
        )


def get_my_statuses(
    *,
    user_id: str,
    include_archived: bool = False,
) -> dict[str, Any]:
    """
    Devuelve activos propios y, opcionalmente, archivo privado.

    Cada sección conserva perfil personal y perfiles comerciales para
    que el frontend pueda presentarlos en pestañas o listas separadas.
    """
    normalized_user_id = str(user_id)

    active_profile = list_author_status_stories(
        user_id=normalized_user_id,
        actor_type="profile",
        actor_id=normalized_user_id,
        scope="active",
    )

    archived_profile = (
        list_author_status_stories(
            user_id=normalized_user_id,
            actor_type="profile",
            actor_id=normalized_user_id,
            scope="archive",
        )
        if include_archived
        else None
    )

    commercial_profiles = _list_owned_commercial_profiles(
        user_id=normalized_user_id,
    )

    active_commercial_profiles: list[dict[str, Any]] = []
    archived_commercial_profiles: list[dict[str, Any]] = []

    for commercial_profile in commercial_profiles:
        commercial_id = str(commercial_profile["id"])
        actor = _enrich_actor(
            {
                "actor_type": "commercial_profile",
                "actor_id": commercial_id,
                "profile_id": None,
                "commercial_profile_id": commercial_id,
                "display_name": commercial_profile["display_name"],
                "avatar_file_id": commercial_profile.get(
                    "logo_file_id"
                ),
            }
        )

        active_commercial_profiles.append(
            {
                "actor": actor,
                "stories": list_author_status_stories(
                    user_id=normalized_user_id,
                    actor_type="commercial_profile",
                    actor_id=commercial_id,
                    scope="active",
                )["stories"],
            }
        )

        if include_archived:
            archived_commercial_profiles.append(
                {
                    "actor": actor,
                    "stories": list_author_status_stories(
                        user_id=normalized_user_id,
                        actor_type="commercial_profile",
                        actor_id=commercial_id,
                        scope="archive",
                    )["stories"],
                }
            )

    return {
        "active": {
            "profile": active_profile,
            "commercial_profiles": active_commercial_profiles,
        },
        "archive": (
            {
                "profile": archived_profile,
                "commercial_profiles": archived_commercial_profiles,
            }
            if include_archived
            else None
        ),
    }


def list_author_status_stories(
    *,
    user_id: str,
    actor_type: str,
    actor_id: str,
    scope: str = "active",
) -> dict[str, Any]:
    normalized_actor_type = _normalize_actor_type(actor_type)
    normalized_scope = str(scope or "active").strip().lower()

    if normalized_scope not in {"active", "archive", "all"}:
        raise StatusValidationError(
            "scope must be active, archive, or all."
        )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_list_author_stories_by_scope",
                    {
                        "p_viewer_profile_id": str(user_id),
                        "p_actor_type": normalized_actor_type,
                        "p_actor_id": str(actor_id),
                        "p_scope": normalized_scope,
                    },
                )
                .execute()
            ),
        )

        stories = [
            _enrich_story(_unwrap_story_payload(row))
            for row in _response_rows(response)
            if _unwrap_story_payload(row) is not None
        ]

        actor = (
            stories[0]["actor"]
            if stories
            else _get_actor_presentation(
                actor_type=normalized_actor_type,
                actor_id=str(actor_id),
            )
        )

        if not actor:
            raise StatusNotFoundError(
                "Status author was not found."
            )

        return {
            "actor": actor,
            "stories": stories,
            "scope": normalized_scope,
        }

    except (
        StatusNotFoundError,
        StatusOperationError,
        StatusValidationError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if "STATUS_ARCHIVE_REQUIRES_OWNER" in message:
            raise StatusAccessError(
                "Only the owner can access archived stories."
            ) from error

        _raise_status_operation_error(
            error,
            default_message="Could not retrieve author stories.",
        )

def get_status_story(
    *,
    user_id: str,
    story_id: str,
    include_archived: bool = False,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_get_story",
                    {
                        "p_viewer_profile_id": str(user_id),
                        "p_story_id": str(story_id),
                        "p_include_archived": bool(
                            include_archived
                        ),
                    },
                )
                .execute()
            ),
        )

        payload = _extract_json_payload(response)

        if not payload:
            raise StatusNotFoundError(
                "Status story was not found or is unavailable."
            )

        return _enrich_story(payload)

    except StatusNotFoundError:
        raise

    except Exception as error:
        message = str(error)

        if "STATUS_ARCHIVE_REQUIRES_OWNER" in message:
            raise StatusAccessError(
                "Only the owner can access archived stories."
            ) from error

        _raise_status_operation_error(
            error,
            default_message="Could not retrieve status story.",
        )


def register_status_story_view(
    *,
    user_id: str,
    story_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_register_story_view",
                    {
                        "p_viewer_profile_id": str(user_id),
                        "p_story_id": str(story_id),
                    },
                )
                .execute()
            ),
        )

        row = _extract_first_row(response)

        if not row:
            raise StatusViewError(
                "Supabase did not return the view result."
            )

        return {
            "story_id": str(story_id),
            "viewed": bool(row.get("viewed", True)),
            "created": bool(row.get("created", False)),
            "viewed_at": row.get("viewed_at"),
        }

    except StatusViewError:
        raise

    except Exception as error:
        message = str(error)

        if (
            "STATUS_STORY_NOT_AVAILABLE" in message
            or "STATUS_OWNER_CANNOT_VIEW_OWN_STORY" in message
        ):
            raise StatusNotFoundError(
                "Status story was not found or is unavailable."
            ) from error

        raise StatusViewError(
            f"Could not register status story view: {message}"
        ) from error


def list_status_story_viewers(
    *,
    user_id: str,
    story_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_list_story_viewers",
                    {
                        "p_owner_profile_id": str(user_id),
                        "p_story_id": str(story_id),
                    },
                )
                .execute()
            ),
        )

        viewers = [
            _enrich_viewer(row)
            for row in _response_rows(response)
        ]

        return {
            "story_id": str(story_id),
            "viewers": viewers,
            "count": len(viewers),
        }

    except Exception as error:
        message = str(error)

        if "STATUS_VIEWERS_REQUIRE_OWNER" in message:
            raise StatusViewerAccessError(
                "Only the owner can view status viewers."
            ) from error

        raise StatusOperationError(
            f"Could not retrieve story viewers: {message}"
        ) from error


def archive_status_story(
    *,
    user_id: str,
    story_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_archive_story",
                    {
                        "p_owner_profile_id": str(user_id),
                        "p_story_id": str(story_id),
                    },
                )
                .execute()
            ),
        )

        story = _extract_first_row(response)

        if not story:
            raise StatusArchiveError(
                "Supabase did not return the archived story."
            )

        return get_status_story(
            user_id=str(user_id),
            story_id=str(story_id),
            include_archived=True,
        )

    except (
        StatusArchiveError,
        StatusAccessError,
        StatusNotFoundError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if "STATUS_STORY_NOT_FOUND" in message:
            raise StatusNotFoundError(
                "Status story was not found."
            ) from error

        if "STATUS_ARCHIVE_REQUIRES_OWNER" in message:
            raise StatusArchiveError(
                "Only the owner can archive this status story."
            ) from error

        raise StatusArchiveError(
            f"Could not archive status story: {message}"
        ) from error


def _resolve_owned_actor(
    *,
    user_id: str,
    actor_type: str,
    actor_commercial_profile_id: str | None,
) -> tuple[str | None, str | None, str]:
    if actor_type == "profile":
        if actor_commercial_profile_id is not None:
            raise StatusValidationError(
                "Personal status stories cannot select a commercial "
                "profile."
            )

        _require_profile_exists(profile_id=user_id)

        return str(user_id), None, str(user_id)

    if not actor_commercial_profile_id:
        raise StatusValidationError(
            "Commercial status stories require "
            "actor_commercial_profile_id."
        )

    commercial = _get_owned_commercial_profile(
        user_id=user_id,
        commercial_profile_id=actor_commercial_profile_id,
    )

    return (
        None,
        str(commercial["id"]),
        str(commercial["owner_id"]),
    )


def _require_profile_exists(
    *,
    profile_id: str,
) -> None:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("profile")
                .select("id")
                .eq("id", str(profile_id))
                .maybe_single()
                .execute()
            ),
        )

        if not _extract_first_row(response):
            raise StatusAccessError(
                "The authenticated profile is unavailable."
            )

    except StatusAccessError:
        raise

    except Exception as error:
        raise StatusOperationError(
            "Could not verify the authenticated profile."
        ) from error


def _get_owned_commercial_profile(
    *,
    user_id: str,
    commercial_profile_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("commercial_profiles")
                .select(
                    "id,owner_id,display_name,logo_file_id,"
                    "is_public,is_available"
                )
                .eq("id", str(commercial_profile_id))
                .eq("owner_id", str(user_id))
                .maybe_single()
                .execute()
            ),
        )

        commercial = _extract_first_row(response)

        if not commercial:
            raise StatusAccessError(
                "The commercial profile is unavailable."
            )

        return commercial

    except StatusAccessError:
        raise

    except Exception as error:
        raise StatusOperationError(
            "Could not verify the commercial profile."
        ) from error


def _list_owned_commercial_profiles(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("commercial_profiles")
                .select(
                    "id,owner_id,display_name,logo_file_id,"
                    "is_public,is_available"
                )
                .eq("owner_id", str(user_id))
                .order("created_at")
                .execute()
            ),
        )

        return _response_rows(response)

    except Exception as error:
        raise StatusOperationError(
            "Could not retrieve owned commercial profiles."
        ) from error


def _get_actor_presentation(
    *,
    actor_type: str,
    actor_id: str,
) -> dict[str, Any] | None:
    try:
        if actor_type == "profile":
            response = execute_with_supabase_admin_retry(
                lambda client: (
                    client
                    .table("profile")
                    .select(
                        "id,first_name,last_name,avatar_file_id"
                    )
                    .eq("id", str(actor_id))
                    .maybe_single()
                    .execute()
                ),
            )
            profile = _extract_first_row(response)

            if not profile:
                return None

            return _enrich_actor(
                {
                    "actor_type": "profile",
                    "actor_id": str(profile["id"]),
                    "profile_id": str(profile["id"]),
                    "commercial_profile_id": None,
                    "display_name": _display_name_for_profile(profile),
                    "avatar_file_id": profile.get("avatar_file_id"),
                }
            )

        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("commercial_profiles")
                .select("id,display_name,logo_file_id")
                .eq("id", str(actor_id))
                .maybe_single()
                .execute()
            ),
        )
        commercial = _extract_first_row(response)

        if not commercial:
            return None

        return _enrich_actor(
            {
                "actor_type": "commercial_profile",
                "actor_id": str(commercial["id"]),
                "profile_id": None,
                "commercial_profile_id": str(commercial["id"]),
                "display_name": commercial["display_name"],
                "avatar_file_id": commercial.get("logo_file_id"),
            }
        )

    except Exception as error:
        raise StatusOperationError(
            "Could not retrieve status author."
        ) from error


def _validate_story_input(
    *,
    kind: str,
    text_content: str | None,
    text_background_id: str | None,
    uploaded_file,
    editor_metadata: dict[str, Any] | None,
) -> None:
    if kind == "text":
        if not _normalize_optional_text(text_content):
            raise StatusValidationError(
                "Text stories require non-empty text_content."
            )

        if not text_background_id:
            raise StatusValidationError(
                "Text stories require text_background_id."
            )

        if uploaded_file is not None:
            raise StatusValidationError(
                "Text stories cannot include media."
            )
    else:
        if uploaded_file is None:
            raise StatusValidationError(
                "Media stories require a file."
            )

        if _normalize_optional_text(text_content):
            raise StatusValidationError(
                "Only text stories can include text_content."
            )

        if text_background_id is not None:
            raise StatusValidationError(
                "Only text stories can include text_background_id."
            )

    if editor_metadata is not None and not isinstance(
        editor_metadata,
        dict,
    ):
        raise StatusValidationError(
            "editor_metadata must be a JSON object."
        )


def _normalize_actor_type(value: str) -> str:
    normalized_value = str(value or "").strip()

    if normalized_value not in {
        "profile",
        "commercial_profile",
    }:
        raise StatusValidationError(
            "actor_type must be profile or commercial_profile."
        )

    return normalized_value


def _normalize_story_kind(value: str) -> str:
    normalized_value = str(value or "").strip()

    if normalized_value not in {
        "image",
        "video",
        "gif",
        "text",
    }:
        raise StatusValidationError(
            "kind must be image, video, gif, or text."
        )

    return normalized_value


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized_value = str(value).strip()
    return normalized_value or None


def _archive_story_safely(
    *,
    owner_profile_id: str,
    story_id: str,
) -> None:
    try:
        execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_archive_story",
                    {
                        "p_owner_profile_id": str(owner_profile_id),
                        "p_story_id": str(story_id),
                    },
                )
                .execute()
            ),
        )
    except Exception:
        return


def _enrich_feed_author(
    author: dict[str, Any],
) -> dict[str, Any]:
    return _enrich_actor(
        {
            "actor_type": author.get("actor_type"),
            "actor_id": author.get("actor_id"),
            "profile_id": author.get("profile_id"),
            "commercial_profile_id": author.get(
                "commercial_profile_id"
            ),
            "display_name": author.get("display_name"),
            "avatar_file_id": author.get("avatar_file_id"),
            "active_story_count": int(
                author.get("active_story_count") or 0
            ),
            "unseen_story_count": int(
                author.get("unseen_story_count") or 0
            ),
            "has_unseen": bool(author.get("has_unseen")),
            "latest_story_at": author.get("latest_story_at"),
        }
    )


def _enrich_story(
    story: dict[str, Any],
) -> dict[str, Any]:
    if not isinstance(story, dict):
        raise StatusOperationError(
            "Invalid status story payload."
        )

    enriched_story = dict(story)
    enriched_story["actor"] = _enrich_actor(
        dict(enriched_story.get("actor") or {})
    )

    media = enriched_story.get("media")

    if isinstance(media, dict):
        enriched_media = dict(media)
        enriched_media["url"] = create_status_media_signed_url(
            bucket_id=str(enriched_media.get("bucket_id") or ""),
            storage_path=str(
                enriched_media.get("storage_path") or ""
            ),
        )
        enriched_media["url_expires_in_seconds"] = (
            STATUS_MEDIA_SIGNED_URL_TTL_SECONDS
            if enriched_media["url"]
            else None
        )
        enriched_story["media"] = enriched_media
    else:
        enriched_story["media"] = None

    if enriched_story.get("is_owner") is True:
        enriched_story["viewer_count"] = _get_story_viewer_count(
            story_id=str(enriched_story["id"]),
        )
    else:
        enriched_story["viewer_count"] = None

    enriched_story["reply_allowed"] = bool(
        enriched_story.get("is_owner") is False
        and enriched_story.get("manually_archived_at") is None
        and enriched_story.get("deleted_at") is None
        and _is_future_datetime(enriched_story.get("expires_at"))
    )

    return enriched_story


def _enrich_actor(
    actor: dict[str, Any],
) -> dict[str, Any]:
    enriched_actor = dict(actor)

    avatar_file_id = enriched_actor.get("avatar_file_id")

    enriched_actor["avatar_file_id"] = (
        str(avatar_file_id)
        if avatar_file_id
        else None
    )
    enriched_actor["avatar_url"] = (
        create_status_avatar_signed_url(
            avatar_file_id=enriched_actor["avatar_file_id"],
        )
        if enriched_actor["avatar_file_id"]
        else None
    )
    enriched_actor["avatar_url_expires_in_seconds"] = (
        STATUS_MEDIA_SIGNED_URL_TTL_SECONDS
        if enriched_actor["avatar_url"]
        else None
    )

    return enriched_actor


def _enrich_viewer(
    viewer: dict[str, Any],
) -> dict[str, Any]:
    enriched_viewer = dict(viewer)

    avatar_file_id = enriched_viewer.get("avatar_file_id")

    enriched_viewer["avatar_file_id"] = (
        str(avatar_file_id)
        if avatar_file_id
        else None
    )
    enriched_viewer["avatar_url"] = (
        create_status_avatar_signed_url(
            avatar_file_id=enriched_viewer["avatar_file_id"],
        )
        if enriched_viewer["avatar_file_id"]
        else None
    )
    enriched_viewer["avatar_url_expires_in_seconds"] = (
        STATUS_MEDIA_SIGNED_URL_TTL_SECONDS
        if enriched_viewer["avatar_url"]
        else None
    )

    return enriched_viewer


def _get_story_viewer_count(
    *,
    story_id: str,
) -> int:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("status_story_views")
                .select("id", count="exact")
                .eq("story_id", str(story_id))
                .execute()
            ),
        )

        return int(getattr(response, "count", 0) or 0)

    except Exception:
        return 0


def _display_name_for_profile(
    profile: dict[str, Any],
) -> str:
    return " ".join(
        part.strip()
        for part in (
            str(profile.get("first_name") or ""),
            str(profile.get("last_name") or ""),
        )
        if part and part.strip()
    ) or "Usuario"


def _unwrap_story_payload(
    row: dict[str, Any],
) -> dict[str, Any] | None:
    if not isinstance(row, dict):
        return None

    payload = row.get("story")

    if isinstance(payload, dict):
        return payload

    return row if row.get("id") else None


def _extract_json_payload(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, dict):
        return data

    if isinstance(data, list):
        if not data:
            return None

        first = data[0]

        if isinstance(first, dict):
            if isinstance(first.get("status_get_story"), dict):
                return first["status_get_story"]

            return first

    return None


def _extract_first_row(
    response,
) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return [
            row
            for row in data
            if isinstance(row, dict)
        ]

    if isinstance(data, dict):
        return [data]

    return []


def _is_future_datetime(value: Any) -> bool:
    if isinstance(value, datetime):
        parsed_value = value
    elif isinstance(value, str):
        try:
            parsed_value = datetime.fromisoformat(
                value.replace("Z", "+00:00")
            )
        except ValueError:
            return False
    else:
        return False

    if parsed_value.tzinfo is None:
        parsed_value = parsed_value.replace(tzinfo=timezone.utc)

    return parsed_value > datetime.now(timezone.utc)


def _raise_status_operation_error(
    error: Exception,
    *,
    default_message: str,
) -> None:
    message = str(error)

    if "STATUS_STORY_LIMIT_30_PER_24_HOURS" in message:
        raise StatusValidationError(
            "You can publish at most 30 stories in 24 hours."
        ) from error

    if "STATUS_TEXT_CONTENT_REQUIRED" in message:
        raise StatusValidationError(
            "Text stories require non-empty content."
        ) from error

    if "STATUS_TEXT_BACKGROUND_MUST_BE_ACTIVE" in message:
        raise StatusValidationError(
            "Text stories require an active background."
        ) from error

    if "STATUS_NON_TEXT_CANNOT_HAVE_TEXT_FIELDS" in message:
        raise StatusValidationError(
            "Media stories cannot include text story fields."
        ) from error

    if "STATUS_EDITOR_METADATA_MUST_BE_OBJECT" in message:
        raise StatusValidationError(
            "editor_metadata must be a JSON object."
        ) from error

    if (
        "STATUS_ACTOR_NOT_OWNED_BY_USER" in message
        or "STATUS_STORY_NOT_OWNED_BY_USER" in message
        or "STATUS_ACTOR_NOT_FOUND" in message
    ):
        raise StatusAccessError(
            "The selected status author is unavailable."
        ) from error

    if (
        "STATUS_IMAGE_MIME_TYPE_NOT_ALLOWED" in message
        or "STATUS_VIDEO_MIME_TYPE_NOT_ALLOWED" in message
        or "STATUS_GIF_MIME_TYPE_NOT_ALLOWED" in message
        or "STATUS_IMAGE_MAX_SIZE_10_MB" in message
        or "STATUS_VIDEO_MAX_SIZE_50_MB" in message
        or "STATUS_GIF_MAX_SIZE_10_MB" in message
        or "STATUS_VIDEO_DURATION_MAX_120_SECONDS" in message
        or "STATUS_GIF_DURATION_MAX_120_SECONDS" in message
    ):
        raise StatusMediaError(
            "The selected media does not meet story requirements."
        ) from error

    raise StatusOperationError(
        f"{default_message} {message}"
    ) from error
