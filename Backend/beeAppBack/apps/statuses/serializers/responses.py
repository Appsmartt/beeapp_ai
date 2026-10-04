from __future__ import annotations

from rest_framework import serializers

from .metadata import (
    STATUS_ACTOR_TYPES,
    STATUS_STORY_KINDS,
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


class StatusImageLayerSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    bucket_id = serializers.CharField(read_only=True)
    storage_path = serializers.CharField(read_only=True)
    original_name = serializers.CharField(read_only=True)
    mime_type = serializers.CharField(read_only=True)
    size_bytes = serializers.IntegerField(read_only=True)
    x = serializers.DecimalField(
        max_digits=6,
        decimal_places=3,
        read_only=True,
    )
    y = serializers.DecimalField(
        max_digits=6,
        decimal_places=3,
        read_only=True,
    )
    scale = serializers.DecimalField(
        max_digits=5,
        decimal_places=3,
        read_only=True,
    )
    rotation = serializers.DecimalField(
        max_digits=6,
        decimal_places=3,
        read_only=True,
    )
    size = serializers.IntegerField(read_only=True)
    sort_order = serializers.IntegerField(read_only=True)
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
    image_layers = StatusImageLayerSerializer(
        many=True,
        read_only=True,
    )
    commercial_offer_link = serializers.JSONField(
        allow_null=True,
        required=False,
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
