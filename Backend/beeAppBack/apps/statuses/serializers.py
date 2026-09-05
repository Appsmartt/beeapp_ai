from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers


STATUS_ACTOR_TYPES = (
    "profile",
    "commercial_profile",
)

STATUS_STORY_KINDS = (
    "image",
    "video",
    "gif",
    "text",
)

MAX_STATUS_CAPTION_LENGTH = 1000
MAX_STATUS_TEXT_LENGTH = 1000
MAX_STATUS_MENTIONS = 20
MAX_STATUS_EDITOR_METADATA_BYTES = 100_000

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


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized_value = value.strip()
    return normalized_value or None


def _normalize_editor_metadata(value) -> dict:
    if value is None:
        return {}

    if not isinstance(value, dict):
        raise serializers.ValidationError(
            "editor_metadata must be a JSON object."
        )

    return value


def _validate_editor_metadata(value: dict) -> dict:
    forbidden_keys = {
        "music",
        "audio",
        "audio_file_id",
        "audio_url",
        "product",
        "products",
    }

    present_forbidden_keys = sorted(
        key
        for key in forbidden_keys
        if key in value and value[key] not in (None, [], {}, "")
    )

    if present_forbidden_keys:
        raise serializers.ValidationError(
            {
                "editor_metadata": (
                    "Music, audio, and products are not supported "
                    "in this statuses sprint."
                )
            }
        )

    mentions = value.get("mentions", [])

    if mentions is None:
        mentions = []

    if not isinstance(mentions, list):
        raise serializers.ValidationError(
            {
                "editor_metadata": (
                    "editor_metadata.mentions must be a list."
                )
            }
        )

    if len(mentions) > MAX_STATUS_MENTIONS:
        raise serializers.ValidationError(
            {
                "editor_metadata": (
                    f"A status can mention at most "
                    f"{MAX_STATUS_MENTIONS} profiles."
                )
            }
        )

    normalized_mentions: list[str] = []

    for mention in mentions:
        try:
            normalized_mention = str(
                serializers.UUIDField().to_internal_value(mention)
            )
        except serializers.ValidationError as error:
            raise serializers.ValidationError(
                {
                    "editor_metadata": (
                        "Each mention must be a valid profile UUID."
                    )
                }
            ) from error

        normalized_mentions.append(normalized_mention)

    if len(normalized_mentions) != len(set(normalized_mentions)):
        raise serializers.ValidationError(
            {
                "editor_metadata": (
                    "Mentions cannot contain repeated profiles."
                )
            }
        )

    normalized_value = dict(value)
    normalized_value["mentions"] = normalized_mentions

    encoded_size = len(
        serializers.JSONField().to_representation(
            normalized_value
        ).__str__().encode("utf-8")
    )

    if encoded_size > MAX_STATUS_EDITOR_METADATA_BYTES:
        raise serializers.ValidationError(
            {
                "editor_metadata": (
                    "editor_metadata is too large."
                )
            }
        )

    return normalized_value


class StatusTextBackgroundSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    code = serializers.CharField(read_only=True)
    label = serializers.CharField(read_only=True)
    hex_color = serializers.RegexField(
        regex=r"^#[0-9A-Fa-f]{6}$",
        read_only=True,
    )
    sort_order = serializers.IntegerField(
        min_value=0,
        read_only=True,
    )


class StatusFollowCreateSerializer(serializers.Serializer):
    target_actor_type = serializers.ChoiceField(
        choices=STATUS_ACTOR_TYPES,
    )
    target_profile_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    target_commercial_profile_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    def validate(self, attrs: dict) -> dict:
        target_actor_type = attrs["target_actor_type"]
        target_profile_id = attrs.get("target_profile_id")
        target_commercial_profile_id = attrs.get(
            "target_commercial_profile_id"
        )

        if target_actor_type == "profile":
            if not target_profile_id:
                raise serializers.ValidationError(
                    {
                        "target_profile_id": (
                            "This field is required for profiles."
                        ),
                    }
                )

            if target_commercial_profile_id:
                raise serializers.ValidationError(
                    {
                        "target_commercial_profile_id": (
                            "This field must be omitted for profiles."
                        ),
                    }
                )

        elif target_actor_type == "commercial_profile":
            if not target_commercial_profile_id:
                raise serializers.ValidationError(
                    {
                        "target_commercial_profile_id": (
                            "This field is required for commercial profiles."
                        ),
                    }
                )

            if target_profile_id:
                raise serializers.ValidationError(
                    {
                        "target_profile_id": (
                            "This field must be omitted for commercial profiles."
                        ),
                    }
                )

        return attrs


class StatusFollowListQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(
        required=False,
        default=20,
        min_value=1,
        max_value=50,
    )
    cursor = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=200,
    )

    def validate_cursor(self, value: str) -> str:
        try:
            requested_at, follow_id = value.rsplit("|", 1)
            serializers.DateTimeField().to_internal_value(
                requested_at
            )
            serializers.UUIDField().to_internal_value(follow_id)
        except (ValueError, TypeError, serializers.ValidationError):
            raise serializers.ValidationError(
                "cursor must be requested_at|follow_id."
            )

        return value


class StatusFollowersQuerySerializer(
    StatusFollowListQuerySerializer,
):
    actor_type = serializers.ChoiceField(
        choices=STATUS_ACTOR_TYPES,
        required=False,
        default="profile",
    )
    commercial_profile_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    def validate(self, attrs: dict) -> dict:
        actor_type = attrs["actor_type"]
        commercial_profile_id = attrs.get(
            "commercial_profile_id"
        )

        if actor_type == "profile" and commercial_profile_id:
            raise serializers.ValidationError(
                {
                    "commercial_profile_id": (
                        "This field is only valid for commercial_profile."
                    ),
                }
            )

        if (
            actor_type == "commercial_profile"
            and not commercial_profile_id
        ):
            raise serializers.ValidationError(
                {
                    "commercial_profile_id": (
                        "This field is required for commercial_profile."
                    ),
                }
            )

        return attrs


class StatusFollowTargetSerializer(serializers.Serializer):
    actor_type = serializers.ChoiceField(
        choices=STATUS_ACTOR_TYPES,
        read_only=True,
    )
    profile_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    commercial_profile_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    display_name = serializers.CharField(read_only=True)
    avatar_file_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    is_available = serializers.BooleanField(read_only=True)


class StatusFollowListItemSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    state = serializers.ChoiceField(
        choices=(
            "pending",
            "accepted",
            "rejected",
        ),
        read_only=True,
    )
    requested_at = serializers.DateTimeField(read_only=True)
    responded_at = serializers.DateTimeField(
        allow_null=True,
        read_only=True,
    )
    accepted_at = serializers.DateTimeField(
        allow_null=True,
        read_only=True,
    )
    rejected_at = serializers.DateTimeField(
        allow_null=True,
        read_only=True,
    )
    target = StatusFollowTargetSerializer(read_only=True)


class StatusFollowSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    follower_profile_id = serializers.UUIDField(read_only=True)
    target_actor_type = serializers.ChoiceField(
        choices=STATUS_ACTOR_TYPES,
        read_only=True,
    )
    target_profile_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    target_commercial_profile_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    state = serializers.ChoiceField(
        choices=(
            "pending",
            "accepted",
            "rejected",
        ),
        read_only=True,
    )
    requested_at = serializers.DateTimeField(
        allow_null=True,
        read_only=True,
    )
    responded_at = serializers.DateTimeField(
        allow_null=True,
        read_only=True,
    )
    accepted_at = serializers.DateTimeField(
        allow_null=True,
        read_only=True,
    )
    rejected_at = serializers.DateTimeField(
        allow_null=True,
        read_only=True,
    )
    created_at = serializers.DateTimeField(
        allow_null=True,
        read_only=True,
    )
    updated_at = serializers.DateTimeField(
        allow_null=True,
        read_only=True,
    )


class StatusFollowDiscoverQuerySerializer(serializers.Serializer):
    q = serializers.CharField(
        min_length=2,
        max_length=100,
        trim_whitespace=True,
    )
    limit = serializers.IntegerField(
        required=False,
        default=20,
        min_value=1,
        max_value=20,
    )
    cursor = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=500,
    )

    def validate_q(self, value: str) -> str:
        normalized = value.strip().lower()

        if len(normalized) < 2:
            raise serializers.ValidationError(
                "q must contain at least 2 characters."
            )

        return normalized


class StatusFollowDiscoverItemSerializer(serializers.Serializer):
    actor_type = serializers.ChoiceField(
        choices=STATUS_ACTOR_TYPES,
        read_only=True,
    )
    profile_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    commercial_profile_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    display_name = serializers.CharField(read_only=True)
    avatar_file_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    follow_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    follow_state = serializers.ChoiceField(
        choices=(
            "pending",
            "accepted",
            "rejected",
        ),
        allow_null=True,
        read_only=True,
    )


class StatusFeedQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(
        required=False,
        default=50,
        min_value=1,
        max_value=100,
    )


class StatusMineQuerySerializer(serializers.Serializer):
    include_archived = serializers.BooleanField(
        required=False,
        default=False,
    )


class StatusDetailQuerySerializer(serializers.Serializer):
    include_archived = serializers.BooleanField(
        required=False,
        default=False,
    )


class StatusCreateSerializer(serializers.Serializer):
    actor_type = serializers.ChoiceField(
        choices=STATUS_ACTOR_TYPES,
        required=False,
        default="profile",
    )
    actor_commercial_profile_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    kind = serializers.ChoiceField(
        choices=STATUS_STORY_KINDS,
    )
    caption = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=MAX_STATUS_CAPTION_LENGTH,
        trim_whitespace=True,
    )
    text_content = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=MAX_STATUS_TEXT_LENGTH,
        trim_whitespace=True,
    )
    text_background_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    editor_metadata = serializers.JSONField(
        required=False,
        default=dict,
    )
    file = serializers.FileField(
        required=False,
        allow_empty_file=False,
    )
    duration_seconds = serializers.DecimalField(
        required=False,
        allow_null=True,
        max_digits=8,
        decimal_places=3,
        min_value=Decimal("0.001"),
    )

    def validate_caption(self, value: str | None) -> str | None:
        return _normalize_optional_text(value)

    def validate_text_content(
        self,
        value: str | None,
    ) -> str | None:
        return _normalize_optional_text(value)

    def validate_editor_metadata(self, value) -> dict:
        normalized = _normalize_editor_metadata(value)
        return _validate_editor_metadata(normalized)

    def validate(self, attrs: dict) -> dict:
        actor_type = attrs["actor_type"]
        commercial_profile_id = attrs.get(
            "actor_commercial_profile_id"
        )
        kind = attrs["kind"]
        uploaded_file = attrs.get("file")
        duration_seconds = attrs.get("duration_seconds")
        text_content = attrs.get("text_content")
        text_background_id = attrs.get("text_background_id")

        if actor_type == "profile" and commercial_profile_id:
            raise serializers.ValidationError(
                {
                    "actor_commercial_profile_id": (
                        "This field must be omitted for profile stories."
                    )
                }
            )

        if (
            actor_type == "commercial_profile"
            and not commercial_profile_id
        ):
            raise serializers.ValidationError(
                {
                    "actor_commercial_profile_id": (
                        "This field is required for commercial stories."
                    )
                }
            )

        if kind == "text":
            if not text_content:
                raise serializers.ValidationError(
                    {
                        "text_content": (
                            "Text stories require non-empty content."
                        )
                    }
                )

            if not text_background_id:
                raise serializers.ValidationError(
                    {
                        "text_background_id": (
                            "Text stories require an active background."
                        )
                    }
                )

            if uploaded_file is not None:
                raise serializers.ValidationError(
                    {
                        "file": (
                            "Text stories cannot include a media file."
                        )
                    }
                )

            if duration_seconds is not None:
                raise serializers.ValidationError(
                    {
                        "duration_seconds": (
                            "Text stories cannot include duration_seconds."
                        )
                    }
                )

        else:
            if uploaded_file is None:
                raise serializers.ValidationError(
                    {
                        "file": (
                            "Image, GIF, and video stories require a file."
                        )
                    }
                )

            if text_content is not None:
                raise serializers.ValidationError(
                    {
                        "text_content": (
                            "Only text stories can include text_content."
                        )
                    }
                )

            if text_background_id is not None:
                raise serializers.ValidationError(
                    {
                        "text_background_id": (
                            "Only text stories can include "
                            "text_background_id."
                        )
                    }
                )

            if kind == "video" and duration_seconds is None:
                raise serializers.ValidationError(
                    {
                        "duration_seconds": (
                            "Video stories require duration_seconds."
                        )
                    }
                )

            if kind != "video" and duration_seconds is not None:
                raise serializers.ValidationError(
                    {
                        "duration_seconds": (
                            "Only video stories can include "
                            "duration_seconds."
                        )
                    }
                )

        return attrs


class StatusReplySerializer(serializers.Serializer):
    sender_identity_id = serializers.UUIDField()
    body = serializers.CharField(
        max_length=10_000,
        trim_whitespace=True,
    )

    def validate_body(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "A status reply requires non-empty content."
            )

        return normalized_value


class StatusActorSerializer(serializers.Serializer):
    actor_type = serializers.ChoiceField(
        choices=STATUS_ACTOR_TYPES,
        read_only=True,
    )
    actor_id = serializers.UUIDField(read_only=True)
    profile_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    commercial_profile_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    display_name = serializers.CharField(read_only=True)
    avatar_file_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    avatar_url = serializers.URLField(
        allow_null=True,
        read_only=True,
    )
    avatar_url_expires_in_seconds = serializers.IntegerField(
        allow_null=True,
        read_only=True,
    )


class StatusMediaSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    bucket_id = serializers.CharField(read_only=True)
    storage_path = serializers.CharField(read_only=True)
    original_name = serializers.CharField(read_only=True)
    mime_type = serializers.CharField(read_only=True)
    size_bytes = serializers.IntegerField(read_only=True)
    width = serializers.IntegerField(
        allow_null=True,
        read_only=True,
    )
    height = serializers.IntegerField(
        allow_null=True,
        read_only=True,
    )
    duration_seconds = serializers.DecimalField(
        max_digits=12,
        decimal_places=3,
        allow_null=True,
        read_only=True,
    )
    url = serializers.URLField(
        allow_null=True,
        read_only=True,
    )
    url_expires_in_seconds = serializers.IntegerField(
        allow_null=True,
        read_only=True,
    )


class StatusStorySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    actor = StatusActorSerializer(read_only=True)
    kind = serializers.ChoiceField(
        choices=STATUS_STORY_KINDS,
        read_only=True,
    )
    caption = serializers.CharField(
        allow_null=True,
        read_only=True,
    )
    text_content = serializers.CharField(
        allow_null=True,
        read_only=True,
    )
    text_background_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    editor_metadata = serializers.JSONField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    expires_at = serializers.DateTimeField(read_only=True)
    manually_archived_at = serializers.DateTimeField(
        allow_null=True,
        read_only=True,
    )
    deleted_at = serializers.DateTimeField(
        allow_null=True,
        read_only=True,
    )
    is_owner = serializers.BooleanField(read_only=True)
    is_viewed = serializers.BooleanField(read_only=True)
    media = StatusMediaSerializer(
        allow_null=True,
        read_only=True,
    )
    viewer_count = serializers.IntegerField(
        required=False,
        read_only=True,
    )
    reply_allowed = serializers.BooleanField(
        required=False,
        read_only=True,
    )


class StatusFeedAuthorSerializer(serializers.Serializer):
    actor_type = serializers.ChoiceField(
        choices=STATUS_ACTOR_TYPES,
        read_only=True,
    )
    actor_id = serializers.UUIDField(read_only=True)
    profile_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    commercial_profile_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    display_name = serializers.CharField(read_only=True)
    avatar_file_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    avatar_url = serializers.URLField(
        allow_null=True,
        read_only=True,
    )
    avatar_url_expires_in_seconds = serializers.IntegerField(
        allow_null=True,
        read_only=True,
    )
    active_story_count = serializers.IntegerField(read_only=True)
    unseen_story_count = serializers.IntegerField(read_only=True)
    has_unseen = serializers.BooleanField(read_only=True)
    latest_story_at = serializers.DateTimeField(read_only=True)


class StatusViewerSerializer(serializers.Serializer):
    profile_id = serializers.UUIDField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    avatar_file_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )
    avatar_url = serializers.URLField(
        allow_null=True,
        read_only=True,
    )
    avatar_url_expires_in_seconds = serializers.IntegerField(
        allow_null=True,
        read_only=True,
    )
    viewed_at = serializers.DateTimeField(read_only=True)
