from rest_framework import serializers


class RegisterPushDeviceSerializer(serializers.Serializer):
    expo_push_token = serializers.RegexField(
        regex=r"^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$",
        max_length=255,
    )
    platform = serializers.ChoiceField(
        choices=("android", "ios"),
    )
    device_id = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=255,
        trim_whitespace=True,
    )
    app_version = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=50,
        trim_whitespace=True,
    )


class NotificationListQuerySerializer(serializers.Serializer):
    module = serializers.CharField(
        required=False,
        max_length=50,
        trim_whitespace=True,
    )
    unread_only = serializers.BooleanField(
        required=False,
        default=False,
    )
    limit = serializers.IntegerField(
        required=False,
        default=50,
        min_value=1,
        max_value=100,
    )
    offset = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )