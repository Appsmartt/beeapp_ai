from __future__ import annotations

from typing import Any

from apps.chat.services.chat_conversation.clients import (
    _extract_first_row,
    _supabase,
)


def _attach_inbox_avatar_urls(
    *,
    conversations: list[dict[str, Any]],
) -> None:
    from apps.statuses.services.status_media_service import (
        create_status_avatar_signed_url,
    )

    for conversation in conversations:
        conversation["avatar_url"] = None
        is_group = conversation.get("conversation_type") == "group"
        avatar_file_id = (
            conversation.get("group_image_file_id")
            if is_group
            else conversation.get("other_logo_file_id")
        )
        if not avatar_file_id:
            continue

        if not is_group:
            commercial_id = (
                conversation.get("other_commercial_profile_id")
                or (conversation.get("commercial") or {}).get(
                    "commercial_profile_id"
                )
            )
            profile_id = conversation.get("other_profile_id")
            actor_type = (
                "commercial_profile" if commercial_id else "profile"
            )
            actor_id = commercial_id or profile_id
            conversation["avatar_url"] = (
                create_status_avatar_signed_url(
                    avatar_file_id=str(avatar_file_id),
                    actor_type=actor_type,
                    actor_id=str(actor_id) if actor_id else None,
                )
            )
            continue

        try:
            reference_response = (
                _supabase()
                .table("chat_conversations")
                .select("created_by_identity_id")
                .eq("id", str(conversation["id"]))
                .eq("image_file_id", str(avatar_file_id))
                .eq("conversation_type", "group")
                .maybe_single()
                .execute()
            )
            reference = _extract_first_row(reference_response)
            if not reference or not reference.get(
                "created_by_identity_id"
            ):
                continue

            identity_response = (
                _supabase()
                .table("chat_identities")
                .select("owner_id")
                .eq(
                    "id",
                    str(reference["created_by_identity_id"]),
                )
                .maybe_single()
                .execute()
            )
            identity = _extract_first_row(identity_response)
            if not identity or not identity.get("owner_id"):
                continue

            file_response = (
                _supabase()
                .table("files")
                .select("bucket_id,storage_path")
                .eq("id", str(avatar_file_id))
                .eq("owner_id", str(identity["owner_id"]))
                .eq("kind", "image")
                .eq("status", "ready")
                .is_("trashed_at", "null")
                .maybe_single()
                .execute()
            )
            file_record = _extract_first_row(file_response)
            if not file_record or not all((
                file_record.get("bucket_id"),
                file_record.get("storage_path"),
            )):
                continue

            signed_response = (
                _supabase()
                .storage.from_(file_record["bucket_id"])
                .create_signed_url(
                    file_record["storage_path"],
                    300,
                )
            )
            signed_url = getattr(
                signed_response,
                "signed_url",
                None,
            )
            if not signed_url and isinstance(
                signed_response,
                dict,
            ):
                signed_url = (
                    signed_response.get("signedURL")
                    or signed_response.get("signed_url")
                )

            conversation["avatar_url"] = signed_url or None
        except Exception:
            continue
