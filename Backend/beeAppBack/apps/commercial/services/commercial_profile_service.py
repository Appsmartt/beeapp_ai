from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
    get_supabase_user_client,
)

from apps.commercial.exceptions import (
    CommercialCategoryLookupError,
    CommercialProfileCreateError,
    CommercialProfileNotFoundError,
    CommercialProfileUpdateError,
    CommercialProfileValidationError,
)
from apps.storage.exceptions import (
    StorageFileNotFoundError,
)
from apps.storage.services.storage_file_service import (
    get_owned_file,
)


COMMERCIAL_CATEGORY_COLUMNS = (
    "id,parent_id,offer_type,name,slug,is_active,sort_order,"
    "created_at,updated_at"
)

COMMERCIAL_PROFILE_COLUMNS = (
    "id,owner_id,offer_type,category_id,custom_activity_text,"
    "display_name,description,country_code,city,address,"
    "neighborhood,location_reference,is_address_public,"
    "phone_dial_code,phone_number,is_phone_public,"
    "public_email,is_email_public,logo_file_id,is_public,"
    "is_available,created_at,updated_at"
)

COMMERCIAL_MODALITY_COLUMNS = (
    "id,commercial_profile_id,modality,created_at"
)

COMMERCIAL_HOUR_COLUMNS = (
    "id,commercial_profile_id,day_of_week,opens_at,closes_at,"
    "is_closed,created_at,updated_at"
)


def list_commercial_categories(
    *,
    offer_type: str | None = None,
    parent_id: str | None = None,
    include_inactive: bool = False,
) -> list[dict[str, Any]]:
    try:
        supabase = get_supabase_admin_client()

        query = (
            supabase.table("commercial_categories")
            .select(COMMERCIAL_CATEGORY_COLUMNS)
            .order("sort_order")
            .order("name")
        )

        if offer_type:
            query = query.eq("offer_type", offer_type)

        if parent_id is None:
            query = query.is_("parent_id", "null")
        else:
            query = query.eq("parent_id", str(parent_id))

        if not include_inactive:
            query = query.eq("is_active", True)

        response = query.execute()

        return response.data or []

    except Exception as error:
        raise CommercialCategoryLookupError(
            "Could not retrieve commercial categories."
        ) from error


def validate_commercial_category(
    *,
    category_id: str,
    offer_type: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .table("commercial_categories")
            .select(COMMERCIAL_CATEGORY_COLUMNS)
            .eq("id", str(category_id))
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )

        category = response.data

        if not category:
            raise CommercialProfileValidationError(
                "The selected category is unavailable."
            )

        category_offer_type = category["offer_type"]

        if (
            offer_type != "mixed"
            and category_offer_type != offer_type
        ):
            raise CommercialProfileValidationError(
                "The selected category does not match the offer type."
            )

        return category

    except CommercialProfileValidationError:
        raise

    except Exception as error:
        raise CommercialProfileValidationError(
            "Could not validate the selected category."
        ) from error


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


def create_commercial_profile(
    *,
    user_id: str,
    access_token: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    created_profile_id: str | None = None

    normalized_access_token = str(access_token or "").strip()

    if not normalized_access_token:
        raise CommercialProfileCreateError(
            "A valid access token is required."
        )

    try:
        offer_type = payload["offer_type"]
        category_id = payload.get("category_id")
        logo_file_id = str(payload["logo_file_id"])

        if category_id is not None:
            validate_commercial_category(
                category_id=str(category_id),
                offer_type=offer_type,
            )

        validate_commercial_logo(
            user_id=str(user_id),
            logo_file_id=logo_file_id,
        )

        profile_data = {
            "owner_id": str(user_id),
            "offer_type": offer_type,
            "category_id": (
                str(category_id)
                if category_id is not None
                else None
            ),
            "custom_activity_text": payload.get(
                "custom_activity_text"
            ),
            "display_name": payload["display_name"],
            "description": payload["description"],
            "country_code": payload["country_code"],
            "city": payload["city"],
            "address": payload.get("address"),
            "neighborhood": payload.get("neighborhood"),
            "location_reference": payload.get(
                "location_reference"
            ),
            "is_address_public": payload["is_address_public"],
            "phone_dial_code": payload.get(
                "phone_dial_code"
            ),
            "phone_number": payload.get("phone_number"),
            "is_phone_public": payload["is_phone_public"],
            "public_email": payload.get("public_email"),
            "is_email_public": payload["is_email_public"],
            "logo_file_id": logo_file_id,
            "is_public": payload["is_public"],
            "is_available": payload["is_available"],
        }

        supabase = get_supabase_user_client(
            access_token=normalized_access_token,
        )

        profile_response = (
            supabase.table("commercial_profiles")
            .insert(profile_data)
            .execute()
        )

        if not profile_response.data:
            raise CommercialProfileCreateError(
                "Supabase did not return the created profile."
            )

        profile = profile_response.data[0]
        created_profile_id = str(profile["id"])

        modalities_to_insert = [
            {
                "commercial_profile_id": created_profile_id,
                "modality": modality,
            }
            for modality in payload["modalities"]
        ]

        modalities_response = (
            supabase.table("commercial_profile_modalities")
            .insert(modalities_to_insert)
            .execute()
        )

        if (
            len(modalities_response.data or [])
            != len(modalities_to_insert)
        ):
            raise CommercialProfileCreateError(
                "Supabase did not create all profile modalities."
            )

        hours_to_insert = [
            {
                "commercial_profile_id": created_profile_id,
                "day_of_week": hour["day_of_week"],
                "opens_at": (
                    hour["opens_at"].isoformat()
                    if hour.get("opens_at") is not None
                    else None
                ),
                "closes_at": (
                    hour["closes_at"].isoformat()
                    if hour.get("closes_at") is not None
                    else None
                ),
                "is_closed": hour["is_closed"],
            }
            for hour in payload["hours"]
        ]

        if hours_to_insert:
            hours_response = (
                supabase.table("commercial_profile_hours")
                .insert(hours_to_insert)
                .execute()
            )

            if (
                len(hours_response.data or [])
                != len(hours_to_insert)
            ):
                raise CommercialProfileCreateError(
                    "Supabase did not create all profile hours."
                )

        return get_owned_commercial_profile_with_access_token(
            access_token=normalized_access_token,
            profile_id=created_profile_id,
        )

    except (
        CommercialProfileCreateError,
        CommercialProfileValidationError,
    ):
        _rollback_created_commercial_profile(
            user_id=str(user_id),
            access_token=normalized_access_token,
            profile_id=created_profile_id,
        )
        raise

    except Exception as error:
        _rollback_created_commercial_profile(
            user_id=str(user_id),
            access_token=normalized_access_token,
            profile_id=created_profile_id,
        )

        raise CommercialProfileCreateError(
            "Could not create the commercial profile."
        ) from error


def get_commercial_profile(
    *,
    user_id: str,
    profile_id: str,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        profile_response = (
            supabase.table("commercial_profiles")
            .select(COMMERCIAL_PROFILE_COLUMNS)
            .eq("id", str(profile_id))
            .eq("owner_id", str(user_id))
            .maybe_single()
            .execute()
        )

        profile = profile_response.data

        if not profile:
            raise CommercialProfileNotFoundError(
                "The requested commercial profile was not found."
            )

        modalities_response = (
            supabase.table("commercial_profile_modalities")
            .select(COMMERCIAL_MODALITY_COLUMNS)
            .eq("commercial_profile_id", str(profile_id))
            .order("created_at")
            .execute()
        )

        hours_response = (
            supabase.table("commercial_profile_hours")
            .select(COMMERCIAL_HOUR_COLUMNS)
            .eq("commercial_profile_id", str(profile_id))
            .order("day_of_week")
            .order("opens_at")
            .execute()
        )

        profile["modalities"] = modalities_response.data or []
        profile["hours"] = hours_response.data or []

        return profile

    except CommercialProfileNotFoundError:
        raise

    except Exception as error:
        raise CommercialProfileNotFoundError(
            "Could not retrieve the commercial profile."
        ) from error


def _rollback_created_commercial_profile(
    *,
    user_id: str,
    access_token: str,
    profile_id: str | None,
) -> None:
    if not profile_id:
        return

    try:
        (
            get_supabase_user_client(
                access_token=access_token,
            )
            .table("commercial_profiles")
            .delete()
            .eq("id", str(profile_id))
            .eq("owner_id", str(user_id))
            .execute()
        )
    except Exception:
        pass

PRIVATE_COMMERCIAL_PROFILE_COLUMNS = (
    COMMERCIAL_PROFILE_COLUMNS
    + ",publication_status,verification_status,"
    "verification_badge_visible,timezone,booking_hold_minutes,"
    "delivery_fee_mode,delivery_fee_amount,delivery_currency_code,"
    "archived_at,suspended_at,suspension_reason,"
    "inventory_hold_minutes"
)


def list_owned_commercial_profiles(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            get_supabase_admin_client()
            .table("commercial_profiles")
            .select(PRIVATE_COMMERCIAL_PROFILE_COLUMNS)
            .eq("owner_id", str(user_id))
            .order("created_at", desc=True)
            .execute()
        )

        profiles = response.data or []

        return [
            _attach_profile_relations(
                profile=profile,
            )
            for profile in profiles
        ]

    except Exception as error:
        raise CommercialProfileNotFoundError(
            "Could not retrieve commercial profiles."
        ) from error


def get_owned_commercial_profile(
    *,
    user_id: str,
    profile_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .table("commercial_profiles")
            .select(PRIVATE_COMMERCIAL_PROFILE_COLUMNS)
            .eq("id", str(profile_id))
            .eq("owner_id", str(user_id))
            .maybe_single()
            .execute()
        )

        profile = response.data

        if not profile:
            raise CommercialProfileNotFoundError(
                "The requested commercial profile was not found."
            )

        return _attach_profile_relations(profile=profile)

    except CommercialProfileNotFoundError:
        raise

    except Exception as error:
        raise CommercialProfileNotFoundError(
            "Could not retrieve commercial profile."
        ) from error


def update_commercial_profile(
    *,
    user_id: str,
    access_token: str,
    profile_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    mutable_fields = {
        "offer_type",
        "category_id",
        "custom_activity_text",
        "display_name",
        "description",
        "country_code",
        "city",
        "address",
        "neighborhood",
        "location_reference",
        "is_address_public",
        "phone_dial_code",
        "phone_number",
        "is_phone_public",
        "public_email",
        "is_email_public",
        "logo_file_id",
        "is_available",
        "timezone",
        "booking_hold_minutes",
        "inventory_hold_minutes",
        "delivery_fee_mode",
        "delivery_fee_amount",
        "delivery_currency_code",
    }

    has_modalities = "modalities" in payload
    has_hours = "hours" in payload

    profile_payload = {
        key: (
            str(value)
            if key in {"category_id", "logo_file_id"}
            and value is not None
            else value
        )
        for key, value in payload.items()
        if key in mutable_fields
    }

    normalized_access_token = str(access_token or "").strip()

    if not normalized_access_token:
        raise CommercialProfileUpdateError(
            "A valid access token is required."
        )

    try:
        current_profile = get_owned_commercial_profile(
            user_id=str(user_id),
            profile_id=str(profile_id),
        )

        user_supabase = get_supabase_user_client(
            access_token=normalized_access_token,
        )

        merged_profile = {
            **current_profile,
            **profile_payload,
        }

        _validate_merged_profile_payload(
            user_id=str(user_id),
            profile_id=str(profile_id),
            merged_profile=merged_profile,
        )

        if profile_payload:
            response = (
                user_supabase
                .table("commercial_profiles")
                .update(profile_payload)
                .eq("id", str(profile_id))
                .eq("owner_id", str(user_id))
                .execute()
            )

            if not response.data:
                raise CommercialProfileUpdateError(
                    "Supabase did not return the updated profile."
                )

        if has_modalities:
            _replace_commercial_profile_modalities(
                user_id=str(user_id),
                access_token=normalized_access_token,
                profile_id=str(profile_id),
                modalities=payload["modalities"],
            )

        if has_hours:
            _replace_commercial_profile_hours(
                user_id=str(user_id),
                access_token=normalized_access_token,
                profile_id=str(profile_id),
                hours=payload["hours"],
            )

        return get_owned_commercial_profile_with_access_token(
            access_token=normalized_access_token,
            profile_id=str(profile_id),
        )

    except (
        CommercialProfileNotFoundError,
        CommercialProfileUpdateError,
        CommercialProfileValidationError,
    ):
        raise

    except Exception as error:
        raise CommercialProfileUpdateError(
            "Could not update commercial profile."
        ) from error


def _attach_profile_relations(
    *,
    profile: dict[str, Any],
) -> dict[str, Any]:
    profile_id = str(profile["id"])
    enriched_profile = dict(profile)

    modalities_response = (
        get_supabase_admin_client()
        .table("commercial_profile_modalities")
        .select(COMMERCIAL_MODALITY_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("created_at")
        .execute()
    )

    hours_response = (
        get_supabase_admin_client()
        .table("commercial_profile_hours")
        .select(COMMERCIAL_HOUR_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("day_of_week")
        .order("opens_at")
        .execute()
    )

    enriched_profile["modalities"] = (
        modalities_response.data or []
    )
    enriched_profile["hours"] = hours_response.data or []

    return enriched_profile


def _validate_merged_profile_payload(
    *,
    user_id: str,
    profile_id: str,
    merged_profile: dict[str, Any],
) -> None:
    category_id = merged_profile.get("category_id")
    custom_activity_text = (
        str(
            merged_profile.get("custom_activity_text") or ""
        ).strip()
        or None
    )

    if category_id is None and not custom_activity_text:
        raise CommercialProfileValidationError(
            "Select a category or provide a custom activity."
        )

    if category_id is not None and custom_activity_text:
        raise CommercialProfileValidationError(
            "Provide a custom activity only when no category is selected."
        )

    if category_id is not None:
        validate_commercial_category(
            category_id=str(category_id),
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

    if (
        merged_profile.get("is_phone_public")
        and not phone_number
    ):
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


def _replace_commercial_profile_modalities(
    *,
    user_id: str,
    access_token: str,
    profile_id: str,
    modalities: list[str],
) -> None:
    try:
        del user_id

        supabase = get_supabase_user_client(
            access_token=access_token,
        )

        (
            supabase.table("commercial_profile_modalities")
            .delete()
            .eq("commercial_profile_id", str(profile_id))
            .execute()
        )

        if modalities:
            response = (
                supabase.table("commercial_profile_modalities")
                .insert(
                    [
                        {
                            "commercial_profile_id": str(profile_id),
                            "modality": modality,
                        }
                        for modality in modalities
                    ]
                )
                .execute()
            )

            if len(response.data or []) != len(modalities):
                raise CommercialProfileUpdateError(
                    "Could not update all profile modalities."
                )

    except CommercialProfileUpdateError:
        raise

    except Exception as error:
        raise CommercialProfileUpdateError(
            "Could not update profile modalities."
        ) from error


def _replace_commercial_profile_hours(
    *,
    user_id: str,
    access_token: str,
    profile_id: str,
    hours: list[dict[str, Any]],
) -> None:
    try:
        del user_id

        supabase = get_supabase_user_client(
            access_token=access_token,
        )

        (
            supabase.table("commercial_profile_hours")
            .delete()
            .eq("commercial_profile_id", str(profile_id))
            .execute()
        )

        if hours:
            response = (
                supabase.table("commercial_profile_hours")
                .insert(
                    [
                        {
                            "commercial_profile_id": str(profile_id),
                            "day_of_week": hour["day_of_week"],
                            "opens_at": (
                                hour["opens_at"].isoformat()
                                if hour.get("opens_at") is not None
                                else None
                            ),
                            "closes_at": (
                                hour["closes_at"].isoformat()
                                if hour.get("closes_at") is not None
                                else None
                            ),
                            "is_closed": hour["is_closed"],
                        }
                        for hour in hours
                    ]
                )
                .execute()
            )

            if len(response.data or []) != len(hours):
                raise CommercialProfileUpdateError(
                    "Could not update all profile hours."
                )

    except CommercialProfileUpdateError:
        raise

    except Exception as error:
        raise CommercialProfileUpdateError(
            "Could not update profile hours."
        ) from error


def get_owned_commercial_profile_with_access_token(
    *,
    access_token: str,
    profile_id: str,
) -> dict[str, Any]:
    normalized_access_token = str(access_token or "").strip()

    if not normalized_access_token:
        raise CommercialProfileNotFoundError(
            "A valid access token is required."
        )

    try:
        supabase = get_supabase_user_client(
            access_token=normalized_access_token,
        )

        response = (
            supabase.table("commercial_profiles")
            .select(PRIVATE_COMMERCIAL_PROFILE_COLUMNS)
            .eq("id", str(profile_id))
            .maybe_single()
            .execute()
        )

        profile = response.data

        if not profile:
            raise CommercialProfileNotFoundError(
                "The requested commercial profile was not found."
            )

        return _attach_profile_relations_with_access_token(
            access_token=normalized_access_token,
            profile=profile,
        )

    except CommercialProfileNotFoundError:
        raise

    except Exception as error:
        raise CommercialProfileNotFoundError(
            "Could not retrieve commercial profile."
        ) from error


def _attach_profile_relations_with_access_token(
    *,
    access_token: str,
    profile: dict[str, Any],
) -> dict[str, Any]:
    profile_id = str(profile["id"])
    enriched_profile = dict(profile)

    supabase = get_supabase_user_client(
        access_token=access_token,
    )

    modalities_response = (
        supabase.table("commercial_profile_modalities")
        .select(COMMERCIAL_MODALITY_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("created_at")
        .execute()
    )

    hours_response = (
        supabase.table("commercial_profile_hours")
        .select(COMMERCIAL_HOUR_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("day_of_week")
        .order("opens_at")
        .execute()
    )

    enriched_profile["modalities"] = (
        modalities_response.data or []
    )
    enriched_profile["hours"] = hours_response.data or []

    return enriched_profile
