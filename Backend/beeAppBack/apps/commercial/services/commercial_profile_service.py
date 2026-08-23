from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.commercial.exceptions import (
    CommercialCategoryLookupError,
    CommercialProfileCreateError,
    CommercialProfileNotFoundError,
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
    payload: dict[str, Any],
) -> dict[str, Any]:
    created_profile_id: str | None = None

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

        supabase = get_supabase_admin_client()

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

        return get_commercial_profile(
            user_id=str(user_id),
            profile_id=created_profile_id,
        )

    except (
        CommercialProfileCreateError,
        CommercialProfileValidationError,
    ):
        _rollback_created_commercial_profile(
            user_id=str(user_id),
            profile_id=created_profile_id,
        )
        raise

    except Exception as error:
        _rollback_created_commercial_profile(
            user_id=str(user_id),
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
    profile_id: str | None,
) -> None:
    if not profile_id:
        return

    try:
        (
            get_supabase_admin_client()
            .table("commercial_profiles")
            .delete()
            .eq("id", str(profile_id))
            .eq("owner_id", str(user_id))
            .execute()
        )
    except Exception:
        pass