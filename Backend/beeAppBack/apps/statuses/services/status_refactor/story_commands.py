from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)
from apps.statuses.exceptions import (
    StatusAccessError,
    StatusArchiveError,
    StatusNotFoundError,
    StatusViewError,
)
from apps.statuses.services.status_refactor.response_utils import (
    extract_first_row,
)


def register_status_story_view(
    *,
    user_id: str,
    story_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.rpc(
                    "status_register_story_view",
                    {
                        "p_viewer_profile_id": str(user_id),
                        "p_story_id": str(story_id),
                    },
                ).execute()
            ),
        )
        row = extract_first_row(response)

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


def archive_status_story(
    *,
    user_id: str,
    story_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.rpc(
                    "status_archive_story",
                    {
                        "p_owner_profile_id": str(user_id),
                        "p_story_id": str(story_id),
                    },
                ).execute()
            ),
        )
        story = extract_first_row(response)

        if not story:
            raise StatusArchiveError(
                "Supabase did not return the archived story."
            )

        from apps.statuses.services.status_refactor.story_queries import (
            get_status_story,
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
