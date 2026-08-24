import re
from urllib.parse import urlparse

from rest_framework import serializers


SOCIAL_PLATFORMS = (
    "instagram",
    "facebook",
    "linkedin",
    "tiktok",
    "youtube",
    "threads",
    "website",
)


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


class RefreshSessionSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(
        required=False,
        min_length=20,
        write_only=True,
        trim_whitespace=True,
    )
    session_token = serializers.CharField(
        required=False,
        min_length=20,
        write_only=True,
        trim_whitespace=True,
    )

    def validate(self, attrs: dict) -> dict:
        refresh_token = attrs.get("refresh_token")
        session_token = attrs.get("session_token")

        if bool(refresh_token) == bool(session_token):
            raise serializers.ValidationError(
                "Provide exactly one session token."
            )

        return attrs


class RequestPhoneOtpSerializer(serializers.Serializer):
    phone = serializers.CharField(
        min_length=8,
        max_length=16,
        trim_whitespace=True,
    )

    def validate_phone(self, value: str) -> str:
        normalized_value = value.strip()

        if not re.fullmatch(
            r"\+[1-9]\d{7,14}",
            normalized_value,
        ):
            raise serializers.ValidationError(
                "Phone must use E.164 format, "
                "for example +573001234567."
            )

        return normalized_value


class VerifyPhoneOtpSerializer(RequestPhoneOtpSerializer):
    code = serializers.CharField(
        min_length=6,
        max_length=6,
        trim_whitespace=True,
    )

    def validate_code(self, value: str) -> str:
        normalized_value = value.strip()

        if not re.fullmatch(r"\d{6}", normalized_value):
            raise serializers.ValidationError(
                "Code must contain exactly 6 digits."
            )

        return normalized_value


class PasswordResetRequestSerializer(RequestPhoneOtpSerializer):
    """Validates the phone used to request a password reset."""


class PasswordResetVerifySerializer(VerifyPhoneOtpSerializer):
    """Validates a password reset phone and OTP code."""


class PasswordResetConfirmSerializer(serializers.Serializer):
    reset_token = serializers.CharField(
        min_length=32,
        max_length=128,
        write_only=True,
        trim_whitespace=True,
    )
    new_password = serializers.CharField(
        min_length=8,
        max_length=128,
        write_only=True,
        trim_whitespace=False,
    )
    confirm_password = serializers.CharField(
        min_length=8,
        max_length=128,
        write_only=True,
        trim_whitespace=False,
    )

    def validate_reset_token(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Reset token is required."
            )

        return normalized_value

    def validate(self, attrs: dict) -> dict:
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {
                    "confirm_password": "Passwords do not match.",
                }
            )

        return attrs


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


class ProfileSocialLinkSerializer(serializers.Serializer):
    platform = serializers.ChoiceField(
        choices=SOCIAL_PLATFORMS,
    )
    url = serializers.URLField(
        max_length=2048,
        trim_whitespace=True,
    )

    def validate_url(self, value: str) -> str:
        normalized_value = value.strip()

        parsed_url = urlparse(normalized_value)

        if (
            parsed_url.scheme not in ("http", "https")
            or not parsed_url.netloc
        ):
            raise serializers.ValidationError(
                "A complete HTTP or HTTPS URL is required."
            )

        return normalized_value


class UpdateProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
    )
    last_name = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
    )
    email = serializers.EmailField()
    phone_dial_code = serializers.CharField(
        max_length=10,
        trim_whitespace=True,
    )
    phone_number = serializers.CharField(
        max_length=20,
        trim_whitespace=True,
    )
    occupation = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=120,
        trim_whitespace=True,
    )
    location = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=255,
        trim_whitespace=True,
    )
    social_links = ProfileSocialLinkSerializer(
        many=True,
        required=False,
    )

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    def validate_first_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "First name cannot be empty."
            )

        return normalized_value

    def validate_last_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Last name cannot be empty."
            )

        return normalized_value

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

    def validate_social_links(self, value: list[dict]) -> list[dict]:
        platforms = [link["platform"] for link in value]

        if len(platforms) != len(set(platforms)):
            raise serializers.ValidationError(
                "Only one URL is allowed for each platform."
            )

        return value


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


class UpdateProfileAvatarSerializer(serializers.Serializer):
    avatar_file_id = serializers.UUIDField()