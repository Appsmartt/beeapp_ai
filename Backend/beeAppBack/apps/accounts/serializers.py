from rest_framework import serializers


class RegisterUserSerializer(serializers.Serializer):
    first_name = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
    )
    last_name = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
    )
    email = serializers.EmailField()
    password = serializers.CharField(
        min_length=8,
        max_length=128,
        write_only=True,
        trim_whitespace=False,
    )
    phone_dial_code = serializers.CharField(
        max_length=10,
        trim_whitespace=True,
    )
    phone_number = serializers.CharField(
        max_length=20,
        trim_whitespace=True,
    )

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    def validate_phone_dial_code(self, value: str) -> str:
        normalized_value = value.replace("+", "").replace(" ", "")

        if not normalized_value.isdigit():
            raise serializers.ValidationError(
                "Phone dial code must contain only digits."
            )

        return normalized_value

    def validate_phone_number(self, value: str) -> str:
        normalized_value = (
            value.replace(" ", "")
            .replace("-", "")
            .replace("(", "")
            .replace(")", "")
        )

        if not normalized_value.isdigit():
            raise serializers.ValidationError(
                "Phone number must contain only digits."
            )

        return normalized_value


class LoginUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        min_length=8,
        max_length=128,
        write_only=True,
        trim_whitespace=False,
    )

    def validate_email(self, value: str) -> str:
        return value.strip().lower()


class UpdateOnboardingProfileSerializer(serializers.Serializer):
    occupation = serializers.CharField(
        max_length=120,
        trim_whitespace=True,
    )
    location = serializers.CharField(
        max_length=255,
        trim_whitespace=True,
    )

    def validate_occupation(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Occupation cannot be empty."
            )

        return normalized_value

    def validate_location(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Location cannot be empty."
            )

        return normalized_value


class UpdateAssistantSettingsSerializer(serializers.Serializer):
    assistant_name = serializers.CharField(
        max_length=80,
        trim_whitespace=True,
    )
    assistant_tone = serializers.CharField(
        max_length=50,
        trim_whitespace=True,
    )

    def validate_assistant_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Assistant name cannot be empty."
            )

        return normalized_value

    def validate_assistant_tone(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Assistant tone cannot be empty."
            )

        return normalized_value