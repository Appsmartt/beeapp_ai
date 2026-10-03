from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)
from apps.statuses.exceptions import StatusOperationError
from apps.statuses.services.status_media_service import (
    STATUS_MEDIA_SIGNED_URL_TTL_SECONDS,
    create_status_avatar_signed_url,
    create_status_media_signed_url,
    create_status_offer_image_signed_url,
)


def enrich_feed_author(author: dict[str, Any]) -> dict[str, Any]:
    return enrich_actor(
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


def enrich_story(story: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(story, dict):
        raise StatusOperationError("Invalid status story payload.")

    enriched_story = dict(story)
    enriched_story["actor"] = enrich_actor(
        dict(enriched_story.get("actor") or {})
    )

    media = enriched_story.get("media")
    enriched_story["media"] = enrich_media(media)

    enriched_story["image_layers"] = enrich_image_layers(
        enriched_story.get("image_layers")
    )
    enriched_story["commercial_offer_link"] = enrich_offer_link(
        enriched_story.get("commercial_offer_link")
    )

    enriched_story["viewer_count"] = (
        get_story_viewer_count(story_id=str(enriched_story["id"]))
        if enriched_story.get("is_owner") is True
        else None
    )
    enriched_story["reply_allowed"] = bool(
        enriched_story.get("is_owner") is False
        and enriched_story.get("manually_archived_at") is None
        and enriched_story.get("deleted_at") is None
        and is_future_datetime(enriched_story.get("expires_at"))
    )

    return enriched_story


def enrich_media(media: Any) -> dict[str, Any] | None:
    if not isinstance(media, dict):
        return None

    enriched_media = dict(media)
    enriched_media["url"] = create_status_media_signed_url(
        bucket_id=str(enriched_media.get("bucket_id") or ""),
        storage_path=str(enriched_media.get("storage_path") or ""),
    )
    enriched_media["url_expires_in_seconds"] = (
        STATUS_MEDIA_SIGNED_URL_TTL_SECONDS
        if enriched_media["url"]
        else None
    )

    return enriched_media


def enrich_image_layers(raw_image_layers: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_image_layers, list):
        return []

    layers = []
    for raw_layer in raw_image_layers:
        if not isinstance(raw_layer, dict):
            continue

        layer = dict(raw_layer)
        layer["url"] = create_status_media_signed_url(
            bucket_id=str(layer.get("bucket_id") or ""),
            storage_path=str(layer.get("storage_path") or ""),
        )
        layer["url_expires_in_seconds"] = (
            STATUS_MEDIA_SIGNED_URL_TTL_SECONDS
            if layer["url"]
            else None
        )
        layers.append(layer)

    return layers


def enrich_offer_link(
    commercial_offer_link: Any,
) -> dict[str, Any] | None:
    if not isinstance(commercial_offer_link, dict):
        return None

    enriched_link = dict(commercial_offer_link)
    enriched_link["image_url"] = create_status_offer_image_signed_url(
        commercial_profile_id=str(
            enriched_link.get("commercial_profile_id") or ""
        ),
        image_file_id=str(enriched_link.get("image_file_id") or ""),
        bucket_id=str(enriched_link.get("image_bucket_id") or ""),
        storage_path=str(
            enriched_link.get("image_storage_path") or ""
        ),
    )
    enriched_link["image_url_expires_in_seconds"] = (
        STATUS_MEDIA_SIGNED_URL_TTL_SECONDS
        if enriched_link["image_url"]
        else None
    )

    return enriched_link


def enrich_actor(actor: dict[str, Any]) -> dict[str, Any]:
    enriched_actor = dict(actor)
    avatar_file_id = enriched_actor.get("avatar_file_id")

    enriched_actor["avatar_file_id"] = (
        str(avatar_file_id) if avatar_file_id else None
    )
    enriched_actor["avatar_url"] = (
        create_status_avatar_signed_url(
            avatar_file_id=enriched_actor["avatar_file_id"],
            actor_type=str(enriched_actor.get("actor_type") or ""),
            actor_id=str(
                enriched_actor.get("commercial_profile_id")
                or enriched_actor.get("profile_id")
                or ""
            ),
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


def enrich_viewer(viewer: dict[str, Any]) -> dict[str, Any]:
    enriched_viewer = dict(viewer)
    avatar_file_id = enriched_viewer.get("avatar_file_id")

    enriched_viewer["avatar_file_id"] = (
        str(avatar_file_id) if avatar_file_id else None
    )
    enriched_viewer["avatar_url"] = (
        create_status_avatar_signed_url(
            avatar_file_id=enriched_viewer["avatar_file_id"],
            actor_type="profile",
            actor_id=str(enriched_viewer.get("profile_id") or ""),
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


def get_story_viewer_count(*, story_id: str) -> int:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("status_story_views")
                .select("id", count="exact")
                .eq("story_id", str(story_id))
                .execute()
            ),
        )

        return int(getattr(response, "count", 0) or 0)
    except Exception:
        return 0


def is_future_datetime(value: Any) -> bool:
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


def display_name_for_profile(profile: dict[str, Any]) -> str:
    return " ".join(
        part.strip()
        for part in (
            str(profile.get("first_name") or ""),
            str(profile.get("last_name") or ""),
        )
        if part and part.strip()
    ) or "Usuario"
