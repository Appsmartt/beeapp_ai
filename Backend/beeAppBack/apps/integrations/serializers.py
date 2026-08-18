from rest_framework import serializers


SUPPORTED_PROVIDERS = (
    "google",
)


class StartIntegrationAuthorizationSerializer(
    serializers.Serializer,
):
    provider = serializers.ChoiceField(
        choices=SUPPORTED_PROVIDERS,
    )
    capabilities = serializers.ListField(
        child=serializers.CharField(
            min_length=1,
            max_length=80,
            trim_whitespace=True,
        ),
        required=False,
        allow_empty=True,
        max_length=20,
    )

    def validate_capabilities(
        self,
        value: list[str],
    ) -> list[str]:
        normalized_capabilities = []

        for capability in value:
            normalized_capability = capability.strip().lower()

            if (
                normalized_capability
                and normalized_capability
                not in normalized_capabilities
            ):
                normalized_capabilities.append(
                    normalized_capability
                )

        return normalized_capabilities


class ReauthorizeIntegrationSerializer(serializers.Serializer):
    capabilities = serializers.ListField(
        child=serializers.CharField(
            min_length=1,
            max_length=80,
            trim_whitespace=True,
        ),
        required=False,
        allow_empty=True,
        max_length=20,
    )

    def validate_capabilities(
        self,
        value: list[str],
    ) -> list[str]:
        normalized_capabilities = []

        for capability in value:
            normalized_capability = capability.strip().lower()

            if (
                normalized_capability
                and normalized_capability
                not in normalized_capabilities
            ):
                normalized_capabilities.append(
                    normalized_capability
                )

        return normalized_capabilities