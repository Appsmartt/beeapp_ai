from rest_framework import serializers


class CreateNoteShareSerializer(serializers.Serializer):
    recipient_id = serializers.UUIDField()
    expires_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )


class ReceivedNoteSharesQuerySerializer(serializers.Serializer):
    include_hidden = serializers.BooleanField(
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
