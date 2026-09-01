from __future__ import annotations

from rest_framework import serializers


STATUS_ACTOR_TYPES = (
    "profile",
    "commercial_profile",
)


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
