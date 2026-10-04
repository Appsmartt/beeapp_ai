from rest_framework import serializers


class NoteTemplateListQuerySerializer(serializers.Serializer):
    include_inactive = serializers.BooleanField(
        required=False,
        default=False,
    )
