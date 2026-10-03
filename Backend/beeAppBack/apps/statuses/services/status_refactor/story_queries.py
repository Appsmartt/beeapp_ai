from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)
from apps.statuses.exceptions import (
    StatusAccessError,
    StatusNotFoundError,
    StatusOperationError,
    StatusValidationError,
    StatusViewerAccessError,
)
from apps.statuses.services.status_refactor.actors import (
    get_actor_presentation,
    list_owned_commercial_profiles,
)
from apps.statuses.services.status_refactor.enrichment import (
    enrich_actor,
    enrich_feed_author,
    enrich_story,
    enrich_viewer,
    display_name_for_profile,
)
from apps.statuses.services.status_refactor.errors import (
    raise_status_operation_error,
)
from apps.statuses.services.status_refactor.response_utils import (
    extract_json_payload,
    response_rows,
    unwrap_story_payload,
)
from apps.statuses.services.status_refactor.validation import (
    normalize_actor_type,
)


TEXT_BACKGROUND_COLUMNS = (
    "id,code,label,hex_color,is_active,sort_order,created_at"
)


def list_active_text_backgrounds() -> list[dict[str, Any]]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("status_text_backgrounds")
                .select(TEXT_BACKGROUND_COLUMNS)
                .eq("is_active", True)
                .order("sort_order")
                .execute()
            ),
        )
        return [
            {
                "id": str(background["id"]),
                "code": background["code"],
                "label": background["label"],
                "hex_color": background["hex_color"],
                "sort_order": int(background["sort_order"]),
            }
            for background in response_rows(response)
        ]
    except Exception as error:
        raise StatusOperationError(
            "Could not retrieve text backgrounds."
        ) from error


def list_status_feed(
    *,
    user_id: str,
    limit: int = 50,
) -> dict[str, Any]:
    normalized_limit = max(1, min(int(limit), 100))

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.rpc(
                    "status_list_feed",
                    {
                        "p_viewer_profile_id": str(user_id),
                        "p_limit": normalized_limit,
                    },
                ).execute()
            ),
        )
        authors = [
            enrich_feed_author(row)
            for row in response_rows(response)
        ]
        items = [
            {
                "author": author,
                "stories": list_author_status_stories(
                    user_id=str(user_id),
                    actor_type=str(author["actor_type"]),
                    actor_id=str(author["actor_id"]),
                    scope="active",
                )["stories"],
            }
            for author in authors
        ]
        return {
            "items": items,
            "limit": normalized_limit,
        }
    except StatusOperationError:
        raise
    except Exception as error:
        raise_status_operation_error(
            error,
            default_message="Could not retrieve statuses feed.",
        )


def get_my_statuses(
    *,
    user_id: str,
    include_archived: bool = False,
) -> dict[str, Any]:
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

    active_commercial_profiles = []
    archived_commercial_profiles = []

    for commercial_profile in list_owned_commercial_profiles(
        user_id=normalized_user_id,
    ):
        commercial_id = str(commercial_profile["id"])
        actor = enrich_actor(
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
    normalized_actor_type = normalize_actor_type(actor_type)
    normalized_scope = str(scope or "active").strip().lower()

    if normalized_scope not in {"active", "archive", "all"}:
        raise StatusValidationError(
            "scope must be active, archive, or all."
        )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.rpc(
                    "status_list_author_stories_by_scope",
                    {
                        "p_viewer_profile_id": str(user_id),
                        "p_actor_type": normalized_actor_type,
                        "p_actor_id": str(actor_id),
                        "p_scope": normalized_scope,
                    },
                ).execute()
            ),
        )
        stories = [
            enrich_story(unwrap_story_payload(row))
            for row in response_rows(response)
            if unwrap_story_payload(row) is not None
        ]
        actor = (
            stories[0]["actor"]
            if stories
            else get_actor_presentation(
                actor_type=normalized_actor_type,
                actor_id=str(actor_id),
                enrich_actor=enrich_actor,
                display_name_for_profile=display_name_for_profile,
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
        if "STATUS_ARCHIVE_REQUIRES_OWNER" in str(error):
            raise StatusAccessError(
                "Only the owner can access archived stories."
            ) from error

        raise_status_operation_error(
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
                client.rpc(
                    "status_get_story",
                    {
                        "p_viewer_profile_id": str(user_id),
                        "p_story_id": str(story_id),
                        "p_include_archived": bool(include_archived),
                    },
                ).execute()
            ),
        )
        payload = extract_json_payload(response)

        if not payload:
            raise StatusNotFoundError(
                "Status story was not found or is unavailable."
            )

        return enrich_story(payload)
    except StatusNotFoundError:
        raise
    except Exception as error:
        if "STATUS_ARCHIVE_REQUIRES_OWNER" in str(error):
            raise StatusAccessError(
                "Only the owner can access archived stories."
            ) from error

        raise_status_operation_error(
            error,
            default_message="Could not retrieve status story.",
        )


def list_status_story_viewers(
    *,
    user_id: str,
    story_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.rpc(
                    "status_list_story_viewers",
                    {
                        "p_owner_profile_id": str(user_id),
                        "p_story_id": str(story_id),
                    },
                ).execute()
            ),
        )
        viewers = [
            enrich_viewer(row)
            for row in response_rows(response)
        ]
        return {
            "story_id": str(story_id),
            "viewers": viewers,
            "count": len(viewers),
        }
    except Exception as error:
        if "STATUS_VIEWERS_REQUIRE_OWNER" in str(error):
            raise StatusViewerAccessError(
                "Only the owner can view status viewers."
            ) from error

        raise StatusOperationError(
            f"Could not retrieve story viewers: {error}"
        ) from error
