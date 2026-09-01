from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.notifications.services.notification_service import (
    create_module_notification,
)


MAX_STATUS_MENTIONS = 20


def create_status_mention_notifications_safely(
    *,
    story: dict[str, Any],
) -> None:
    """
    Notifica menciones personales sin bloquear la publicación.

    Las menciones se validan de nuevo contra la base de datos, aunque
    el serializer ya haya validado UUIDs. Esto evita notificar perfiles
    inexistentes, al propio autor, personas bloqueadas o que no tengan
    follow accepted hacia el actor del estado.
    """
    try:
        story_id = str(story.get("id") or "").strip()

        if not story_id:
            return

        editor_metadata = story.get("editor_metadata") or {}

        if not isinstance(editor_metadata, dict):
            return

        mention_ids = _normalize_mention_ids(
            editor_metadata.get("mentions")
        )

        if not mention_ids:
            return

        actor_owner_id = _get_story_actor_owner_id(
            story=story,
        )

        if not actor_owner_id:
            return

        eligible_profile_ids = _get_eligible_mentioned_profiles(
            story_id=story_id,
            mention_ids=mention_ids,
            actor_owner_id=actor_owner_id,
        )

        if not eligible_profile_ids:
            return

        actor_display_name = _get_story_actor_display_name(
            story=story,
        )

        for profile_id in eligible_profile_ids:
            try:
                create_module_notification(
                    recipient_id=profile_id,
                    module="statuses",
                    notification_type="status_mention",
                    title="Te mencionaron en un estado",
                    body=(
                        f"{actor_display_name} te mencionó en un "
                        "estado."
                    ),
                    metadata={
                        "action": "open_status",
                        "status_id": story_id,
                        "actor_type": story.get("actor_type"),
                        "actor_profile_id": (
                            story.get("actor_profile_id")
                        ),
                        "actor_commercial_profile_id": (
                            story.get(
                                "actor_commercial_profile_id"
                            )
                        ),
                    },
                    send_push=True,
                )
            except Exception:
                continue

    except Exception:
        return


def _normalize_mention_ids(
    value,
) -> list[str]:
    if not isinstance(value, list):
        return []

    normalized_ids = [
        str(mention_id).strip()
        for mention_id in value
        if str(mention_id).strip()
    ]

    return list(
        dict.fromkeys(normalized_ids)
    )[:MAX_STATUS_MENTIONS]


def _get_story_actor_owner_id(
    *,
    story: dict[str, Any],
) -> str | None:
    actor_type = str(story.get("actor_type") or "").strip()

    if actor_type == "profile":
        actor_profile_id = story.get("actor_profile_id")
        return (
            str(actor_profile_id)
            if actor_profile_id
            else None
        )

    if actor_type != "commercial_profile":
        return None

    commercial_profile_id = story.get(
        "actor_commercial_profile_id"
    )

    if not commercial_profile_id:
        return None

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("commercial_profiles")
                .select("owner_id")
                .eq("id", str(commercial_profile_id))
                .maybe_single()
                .execute()
            ),
        )

        commercial = getattr(response, "data", None)

        if not isinstance(commercial, dict):
            return None

        owner_id = commercial.get("owner_id")

        return str(owner_id) if owner_id else None

    except Exception:
        return None


def _get_story_actor_display_name(
    *,
    story: dict[str, Any],
) -> str:
    actor_type = str(story.get("actor_type") or "").strip()

    if actor_type == "profile":
        profile_id = story.get("actor_profile_id")

        if profile_id:
            try:
                response = execute_with_supabase_admin_retry(
                    lambda client: (
                        client
                        .table("profile")
                        .select("first_name,last_name")
                        .eq("id", str(profile_id))
                        .maybe_single()
                        .execute()
                    ),
                )

                profile = getattr(response, "data", None)

                if isinstance(profile, dict):
                    display_name = " ".join(
                        part.strip()
                        for part in (
                            str(
                                profile.get("first_name") or ""
                            ),
                            str(
                                profile.get("last_name") or ""
                            ),
                        )
                        if part and part.strip()
                    )

                    if display_name:
                        return display_name
            except Exception:
                pass

        return "Alguien"

    commercial_profile_id = story.get(
        "actor_commercial_profile_id"
    )

    if commercial_profile_id:
        try:
            response = execute_with_supabase_admin_retry(
                lambda client: (
                    client
                    .table("commercial_profiles")
                    .select("display_name")
                    .eq("id", str(commercial_profile_id))
                    .maybe_single()
                    .execute()
                ),
            )

            commercial = getattr(response, "data", None)

            if isinstance(commercial, dict):
                display_name = str(
                    commercial.get("display_name") or ""
                ).strip()

                if display_name:
                    return display_name
        except Exception:
            pass

    return "Un comercio"


def _get_eligible_mentioned_profiles(
    *,
    story_id: str,
    mention_ids: list[str],
    actor_owner_id: str,
) -> list[str]:
    candidate_ids = [
        profile_id
        for profile_id in mention_ids
        if profile_id != actor_owner_id
    ]

    if not candidate_ids:
        return []

    try:
        profiles_response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("profile")
                .select("id")
                .in_("id", candidate_ids)
                .execute()
            ),
        )

        existing_profile_ids = {
            str(profile["id"])
            for profile in (
                getattr(profiles_response, "data", None) or []
            )
            if isinstance(profile, dict) and profile.get("id")
        }

        if not existing_profile_ids:
            return []

        eligible_ids: list[str] = []

        for profile_id in candidate_ids:
            if profile_id not in existing_profile_ids:
                continue

            visibility_response = (
                execute_with_supabase_admin_retry(
                    lambda client: (
                        client
                        .rpc(
                            "status_user_can_view_story",
                            {
                                "p_story_id": story_id,
                                "p_user_id": profile_id,
                            },
                        )
                        .execute()
                    ),
                )
            )

            can_view = getattr(
                visibility_response,
                "data",
                False,
            )

            if can_view is True:
                eligible_ids.append(profile_id)

        return eligible_ids

    except Exception:
        return []
