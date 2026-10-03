from __future__ import annotations

from typing import Any

from apps.commercial.exceptions import (
    CommercialProfileValidationError,
)
from apps.storage.exceptions import (
    StorageFileNotFoundError,
)
from apps.storage.services.storage_file_service import (
    get_owned_file,
)



def validate_commercial_logo(
    *,
    user_id: str,
    logo_file_id: str,
) -> dict[str, Any]:
    try:
        file_record = get_owned_file(
            user_id=str(user_id),
            file_id=str(logo_file_id),
            include_trashed=True,
        )

        if file_record.get("status") != "ready":
            raise CommercialProfileValidationError(
                "The selected logo file is not ready."
            )

        if file_record.get("kind") != "image":
            raise CommercialProfileValidationError(
                "The selected logo file must be an image."
            )

        if file_record.get("trashed_at") is not None:
            raise CommercialProfileValidationError(
                "The selected logo file is in trash."
            )

        return file_record
    except CommercialProfileValidationError:
        raise
    except StorageFileNotFoundError as error:
        raise CommercialProfileValidationError(
            "The selected logo file was not found."
        ) from error
    except Exception as error:
        raise CommercialProfileValidationError(
            "Could not validate the selected logo file."
        ) from error


def validate_merged_profile_payload(
    *,
    user_id: str,
    profile_id: str,
    merged_profile: dict[str, Any],
    validate_categories,
) -> None:
    del profile_id

    category_ids = [
        str(category_id)
        for category_id in (
            merged_profile.get("category_ids") or []
        )
    ]
    custom_activity_text = (
        str(
            merged_profile.get("custom_activity_text") or ""
        ).strip()
        or None
    )

    if not category_ids and not custom_activity_text:
        raise CommercialProfileValidationError(
            "Select at least one category or provide a custom activity."
        )

    if category_ids and custom_activity_text:
        raise CommercialProfileValidationError(
            "Provide a custom activity only when no category is selected."
        )

    if category_ids:
        validate_categories(
            category_ids=category_ids,
            offer_type=merged_profile["offer_type"],
        )

    logo_file_id = merged_profile.get("logo_file_id")
    if logo_file_id:
        validate_commercial_logo(
            user_id=str(user_id),
            logo_file_id=str(logo_file_id),
        )

    phone_dial_code = merged_profile.get("phone_dial_code")
    phone_number = merged_profile.get("phone_number")

    if bool(phone_dial_code) != bool(phone_number):
        raise CommercialProfileValidationError(
            "Phone dial code and phone number must be provided together."
        )

    if merged_profile.get("is_phone_public") and not phone_number:
        raise CommercialProfileValidationError(
            "A public phone number is required when phone visibility is enabled."
        )

    if (
        merged_profile.get("is_email_public")
        and not merged_profile.get("public_email")
    ):
        raise CommercialProfileValidationError(
            "A public email is required when email visibility is enabled."
        )

    if (
        merged_profile.get("delivery_fee_mode") == "fixed"
        and merged_profile.get("delivery_fee_amount") is None
    ):
        raise CommercialProfileValidationError(
            "A fixed delivery fee requires an amount."
        )

    if (
        merged_profile.get("delivery_fee_mode")
        in {
            "not_offered",
            "free",
            "to_be_confirmed",
        }
        and merged_profile.get("delivery_fee_amount") is not None
    ):
        raise CommercialProfileValidationError(
            "Only fixed delivery fees can include an amount."
        )
