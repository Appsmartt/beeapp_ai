from __future__ import annotations

import re
import unicodedata

from datetime import UTC, datetime
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
    get_supabase_user_client,
)

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialCategoryLookupError,
    CommercialOperationError,
    CommercialProfileCreateError,
    CommercialProfileNotFoundError,
    CommercialProfileUpdateError,
    CommercialProfileValidationError,
    CommercialStateError,
)
from apps.commercial.services.commercial_authorization_service import (
    require_commercial_profile_owner,
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
    "is_available,publication_status,verification_status,"
    "verification_badge_visible,timezone,booking_hold_minutes,"
    "delivery_fee_mode,delivery_fee_amount,delivery_currency_code,"
    "archived_at,suspended_at,suspension_reason,"
    "inventory_hold_minutes,created_at,updated_at"
)

PRIVATE_COMMERCIAL_PROFILE_COLUMNS = (
    COMMERCIAL_PROFILE_COLUMNS
)

COMMERCIAL_MODALITY_COLUMNS = (
    "id,commercial_profile_id,modality,created_at"
)

COMMERCIAL_HOUR_COLUMNS = (
    "id,commercial_profile_id,day_of_week,opens_at,closes_at,"
    "is_closed,created_at,updated_at"
)

COMMERCIAL_PROFILE_CATEGORY_COLUMNS = (
    "commercial_profile_id,commercial_category_id,sort_order"
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

        if parent_id is not None:
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


def normalize_commercial_category_name(value: str) -> str:
    normalized_value = re.sub(
        r"\s+",
        " ",
        str(value or "").strip(),
    )

    if not normalized_value:
        raise CommercialProfileValidationError(
            "New category names cannot be empty."
        )

    return normalized_value


def commercial_category_name_key(value: str) -> str:
    normalized_value = normalize_commercial_category_name(value)
    normalized_unicode = unicodedata.normalize(
        "NFKD",
        normalized_value,
    )
    without_accents = "".join(
        character
        for character in normalized_unicode
        if not unicodedata.combining(character)
    )

    return without_accents.casefold()


def build_commercial_category_slug(value: str) -> str:
    normalized_value = commercial_category_name_key(value)
    slug = re.sub(
        r"[^a-z0-9]+",
        "-",
        normalized_value,
    ).strip("-")

    if not slug:
        raise CommercialProfileValidationError(
            "New category name must include letters or numbers."
        )

    return slug[:100]


def compatible_category_offer_types(
    offer_type: str,
) -> list[str]:
    if offer_type == "mixed":
        return ["products", "services", "mixed"]

    return [offer_type, "mixed"]


def find_existing_commercial_category_by_name(
    *,
    supabase,
    category_name: str,
    offer_type: str,
) -> dict[str, Any] | None:
    expected_key = commercial_category_name_key(category_name)

    response = (
        supabase.table("commercial_categories")
        .select(COMMERCIAL_CATEGORY_COLUMNS)
        .eq("is_active", True)
        .in_(
            "offer_type",
            compatible_category_offer_types(offer_type),
        )
        .order("sort_order")
        .order("name")
        .execute()
    )

    for category in response.data or []:
        if commercial_category_name_key(
            category["name"],
        ) == expected_key:
            return category

    return None


def build_unique_commercial_category_slug(
    *,
    supabase,
    category_name: str,
) -> str:
    base_slug = build_commercial_category_slug(category_name)
    candidate_slug = base_slug
    suffix = 2

    while True:
        response = (
            supabase.table("commercial_categories")
            .select("id")
            .eq("slug", candidate_slug)
            .maybe_single()
            .execute()
        )

        if not response or not response.data:
            return candidate_slug

        candidate_slug = f"{base_slug[:90]}-{suffix}"
        suffix += 1


def is_commercial_category_unique_violation(
    error: Exception,
) -> bool:
    error_message = str(error).casefold()

    return (
        "23505" in error_message
        or "duplicate key" in error_message
        or "unique constraint" in error_message
        or (
            "commercial_categories_active_offer_type_"
            "normalized_name_key" in error_message
        )
    )

def resolve_new_commercial_categories(
    *,
    supabase,
    category_names: list[str],
    offer_type: str,
) -> tuple[list[str], list[str]]:
    resolved_category_ids: list[str] = []
    created_category_ids: list[str] = []

    for raw_category_name in category_names:
        category_name = normalize_commercial_category_name(
            raw_category_name,
        )

        existing_category = (
            find_existing_commercial_category_by_name(
                supabase=supabase,
                category_name=category_name,
                offer_type=offer_type,
            )
        )

        if existing_category:
            resolved_category_ids.append(
                str(existing_category["id"])
            )
            continue

        try:
            category_response = (
                supabase.table("commercial_categories")
                .insert(
                    {
                        "parent_id": None,
                        "offer_type": offer_type,
                        "name": category_name,
                        "slug": (
                            build_unique_commercial_category_slug(
                                supabase=supabase,
                                category_name=category_name,
                            )
                        ),
                        "is_active": True,
                        "sort_order": 0,
                    }
                )
                .execute()
            )
        except Exception as error:
            if not is_commercial_category_unique_violation(error):
                raise

            existing_category = (
                find_existing_commercial_category_by_name(
                    supabase=supabase,
                    category_name=category_name,
                    offer_type=offer_type,
                )
            )

            if not existing_category:
                raise CommercialProfileCreateError(
                    "Could not resolve the duplicated category."
                ) from error

            resolved_category_ids.append(
                str(existing_category["id"])
            )
            continue

        if not category_response.data:
            raise CommercialProfileCreateError(
                "Supabase did not create the new category."
            )

        created_category_id = str(
            category_response.data[0]["id"]
        )
        resolved_category_ids.append(created_category_id)
        created_category_ids.append(created_category_id)

    return resolved_category_ids, created_category_ids

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



def validate_commercial_categories(
    *,
    category_ids: list[str],
    offer_type: str,
) -> list[str]:
    normalized_ids = [str(category_id) for category_id in category_ids]

    if not 1 <= len(normalized_ids) <= 5:
        raise CommercialProfileValidationError(
            "Select between 1 and 5 categories."
        )

    if len(normalized_ids) != len(set(normalized_ids)):
        raise CommercialProfileValidationError(
            "Categories cannot be repeated."
        )

    for category_id in normalized_ids:
        validate_commercial_category(
            category_id=category_id,
            offer_type=offer_type,
        )

    return normalized_ids


def replace_commercial_profile_categories(
    *,
    supabase,
    commercial_profile_id: str,
    category_ids: list[str],
) -> None:
    supabase.table("commercial_profile_categories").delete().eq(
        "commercial_profile_id",
        commercial_profile_id,
    ).execute()

    rows = [
        {
            "commercial_profile_id": commercial_profile_id,
            "commercial_category_id": category_id,
            "sort_order": index,
        }
        for index, category_id in enumerate(category_ids)
    ]


    if not rows:
        return
    response = (
        supabase.table("commercial_profile_categories")
        .insert(rows)
        .execute()
    )

    if len(response.data or []) != len(rows):
        raise CommercialProfileCreateError(
            "Supabase did not create all profile categories."
        )


def create_commercial_profile(
    *,
    user_id: str,
    access_token: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    created_profile_id: str | None = None
    created_category_ids: list[str] = []

    normalized_access_token = str(access_token or "").strip()

    if not normalized_access_token:
        raise CommercialProfileCreateError(
            "A valid access token is required."
        )

    try:
        offer_type = payload["offer_type"]
        category_ids = [
            str(category_id)
            for category_id in (
                payload.get("category_ids") or []
            )
        ]
        new_category_names = [
            normalize_commercial_category_name(category_name)
            for category_name in (
                payload.get("new_category_names") or []
            )
        ]

        if offer_type == "mixed" and new_category_names:
            raise CommercialProfileValidationError(
                "No se pueden crear categorías nuevas "
                "para Servicios y productos."
            )

        if (
            len(category_ids) + len(new_category_names)
            > 5
        ):
            raise CommercialProfileValidationError(
                "Select or add up to 5 categories in total."
            )

        if category_ids:
            category_ids = validate_commercial_categories(
                category_ids=category_ids,
                offer_type=offer_type,
            )

        raw_logo_file_id = payload.get("logo_file_id")
        logo_file_id = (
            str(raw_logo_file_id)
            if raw_logo_file_id is not None
            else None
        )

        if logo_file_id is not None:
            validate_commercial_logo(
                user_id=str(user_id),
                logo_file_id=logo_file_id,
            )

        supabase = get_supabase_user_client(
            access_token=normalized_access_token,
        )

        (
            new_category_ids,
            created_category_ids,
        ) = resolve_new_commercial_categories(
            supabase=supabase,
            category_names=new_category_names,
            offer_type=offer_type,
        )

        category_ids = [
            *category_ids,
            *new_category_ids,
        ]

        if not category_ids and not payload.get(
            "custom_activity_text"
        ):
            raise CommercialProfileValidationError(
                "Select at least one category or provide a "
                "custom activity."
            )

        profile_data = {
            "owner_id": str(user_id),
            "offer_type": offer_type,
            "category_id": (
                category_ids[0]
                if category_ids
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

        replace_commercial_profile_categories(
            supabase=supabase,
            commercial_profile_id=created_profile_id,
            category_ids=category_ids,
        )

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
            created_category_ids=created_category_ids,
        )
        raise

    except Exception as error:
        _rollback_created_commercial_profile(
            user_id=str(user_id),
            access_token=normalized_access_token,
            profile_id=created_profile_id,
            created_category_ids=created_category_ids,
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
    created_category_ids: list[str],
) -> None:
    try:
        supabase = get_supabase_user_client(
            access_token=access_token,
        )

        if profile_id:
            (
                supabase.table("commercial_profiles")
                .delete()
                .eq("id", str(profile_id))
                .eq("owner_id", str(user_id))
                .execute()
            )

        for category_id in created_category_ids:
            (
                supabase.table("commercial_categories")
                .delete()
                .eq("id", str(category_id))
                .execute()
            )
    except Exception:
        pass

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

    has_category_ids = "category_ids" in payload
    has_modalities = "modalities" in payload
    has_hours = "hours" in payload

    profile_payload = {
        key: (
            str(value)
            if key == "logo_file_id" and value is not None
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

        category_ids = (
            [
                str(category_id)
                for category_id in payload["category_ids"]
            ]
            if has_category_ids
            else [
                str(category_id)
                for category_id in current_profile.get(
                    "category_ids",
                    [],
                )
            ]
        )

        user_supabase = get_supabase_user_client(
            access_token=normalized_access_token,
        )

        merged_profile = {
            **current_profile,
            **profile_payload,
            "category_ids": category_ids,
        }

        _validate_merged_profile_payload(
            user_id=str(user_id),
            profile_id=str(profile_id),
            merged_profile=merged_profile,
        )

        if has_category_ids:
            profile_payload["category_id"] = None

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

        if has_category_ids:
            replace_commercial_profile_categories(
                supabase=user_supabase,
                commercial_profile_id=str(profile_id),
                category_ids=category_ids,
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

def _write_profile_audit_event(
    *,
    supabase,
    commercial_profile_id: str,
    actor_profile_id: str,
    action: str,
    previous_state: str | None,
    new_state: str | None,
    reason_code: str | None,
    reason_text: str | None,
    metadata: dict[str, Any],
) -> None:
    try:
        response = (
            supabase.rpc(
                "commerce_write_audit_event",
                {
                    "p_commercial_profile_id": str(
                        commercial_profile_id
                    ),
                    "p_actor_profile_id": str(actor_profile_id),
                    "p_entity_type": "commercial_profile",
                    "p_entity_id": str(commercial_profile_id),
                    "p_action": action,
                    "p_previous_state": previous_state,
                    "p_new_state": new_state,
                    "p_reason_code": reason_code,
                    "p_reason_text": reason_text,
                    "p_reference_type": None,
                    "p_reference_id": None,
                    "p_metadata": metadata,
                },
            )
            .execute()
        )

        if not getattr(response, "data", None):
            raise CommercialOperationError(
                "Could not write commercial profile audit event.",
                code="COMMERCIAL_PROFILE_AUDIT_FAILED",
            )
    except CommercialOperationError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not write commercial profile audit event.",
            code="COMMERCIAL_PROFILE_AUDIT_FAILED",
        ) from error


def update_commercial_profile_publication(
    *,
    user_id: str,
    access_token: str,
    profile_id: str,
    publication_status: str,
    reason_code: str | None = None,
    reason_text: str | None = None,
) -> dict[str, Any]:
    normalized_access_token = str(access_token or "").strip()

    if not normalized_access_token:
        raise CommercialAccessError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )

    current_profile = require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(profile_id),
    )
    current_status = str(
        current_profile.get("publication_status") or ""
    )
    target_status = str(publication_status or "").strip()

    if current_status == "suspended":
        raise CommercialStateError(
            "Suspended commercial profiles cannot be changed by the owner.",
            code="COMMERCIAL_PROFILE_SUSPENDED",
        )

    if target_status == "archived":
        if current_status == "archived":
            raise CommercialStateError(
                "Commercial profile is already deactivated.",
                code="COMMERCIAL_PROFILE_ALREADY_ARCHIVED",
            )

        if not str(reason_text or "").strip():
            raise CommercialStateError(
                "A deactivation reason is required.",
                code="COMMERCIAL_PROFILE_ARCHIVE_REASON_REQUIRED",
            )

        update_payload = {
            "publication_status": "archived",
            "archived_at": datetime.now(UTC).isoformat(),
            "is_available": False,
            "is_public": False,
        }
        action = "commercial_profile.archived"
        new_state = "archived"
    elif target_status == "paused":
        if current_status != "archived":
            raise CommercialStateError(
                "Only deactivated commercial profiles can be restored.",
                code="COMMERCIAL_PROFILE_NOT_ARCHIVED",
            )

        update_payload = {
            "publication_status": "paused",
            "archived_at": None,
            "is_available": False,
            "is_public": False,
        }
        action = "commercial_profile.restored"
        new_state = "paused"
    elif target_status == "published":
        if current_status != "paused":
            raise CommercialStateError(
                "Only paused commercial profiles can be activated.",
                code="COMMERCIAL_PROFILE_NOT_PAUSED",
            )

        update_payload = {
            "publication_status": "published",
            "archived_at": None,
            "is_available": True,
            "is_public": True,
        }
        action = "commercial_profile.published"
        new_state = "published"
    else:
        raise CommercialStateError(
            "Only archived, paused, or published publication changes "
            "are allowed here.",
            code="COMMERCIAL_PROFILE_PUBLICATION_TRANSITION_INVALID",
        )

    try:
        supabase = get_supabase_user_client(
            access_token=normalized_access_token,
        )
        response = (
            supabase.table("commercial_profiles")
            .update(update_payload)
            .eq("id", str(profile_id))
            .eq("owner_id", str(user_id))
            .eq("publication_status", current_status)
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial profile publication could not be updated.",
                code="COMMERCIAL_PROFILE_PUBLICATION_UPDATE_FAILED",
            )

        _write_profile_audit_event(
            supabase=supabase,
            commercial_profile_id=str(profile_id),
            actor_profile_id=str(user_id),
            action=action,
            previous_state=current_status,
            new_state=new_state,
            reason_code=reason_code,
            reason_text=(
                str(reason_text).strip()
                if reason_text is not None
                else None
            ),
            metadata={
                "source": "owner_businesses",
            },
        )

        return get_owned_commercial_profile_with_access_token(
            access_token=normalized_access_token,
            profile_id=str(profile_id),
        )
    except (
        CommercialAccessError,
        CommercialOperationError,
        CommercialProfileNotFoundError,
        CommercialStateError,
    ):
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not update commercial profile publication.",
            code="COMMERCIAL_PROFILE_PUBLICATION_UPDATE_FAILED",
        ) from error


def _attach_profile_relations(
    *,
    profile: dict[str, Any],
) -> dict[str, Any]:
    profile_id = str(profile["id"])
    enriched_profile = dict(profile)
    admin_supabase = get_supabase_admin_client()

    categories_response = (
        admin_supabase.table("commercial_profile_categories")
        .select(COMMERCIAL_PROFILE_CATEGORY_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("sort_order")
        .execute()
    )
    modalities_response = (
        admin_supabase.table("commercial_profile_modalities")
        .select(COMMERCIAL_MODALITY_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("created_at")
        .execute()
    )
    hours_response = (
        admin_supabase.table("commercial_profile_hours")
        .select(COMMERCIAL_HOUR_COLUMNS)
        .eq("commercial_profile_id", profile_id)
        .order("day_of_week")
        .order("opens_at")
        .execute()
    )

    categories = categories_response.data or []
    category_ids = [
        str(row["commercial_category_id"])
        for row in categories
        if row.get("commercial_category_id")
    ]
    categories_by_id: dict[str, dict[str, Any]] = {}

    if category_ids:
        category_details_response = (
            admin_supabase.table("commercial_categories")
            .select(COMMERCIAL_CATEGORY_COLUMNS)
            .in_("id", category_ids)
            .eq("is_active", True)
            .execute()
        )
        categories_by_id = {
            str(category["id"]): category
            for category in (category_details_response.data or [])
            if category.get("id")
        }

    enriched_categories = [
        {
            **row,
            "category": categories_by_id.get(
                str(row.get("commercial_category_id") or "")
            ),
        }
        for row in categories
    ]

    enriched_profile["category_ids"] = category_ids
    enriched_profile["categories"] = enriched_categories
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
        validate_commercial_categories(
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
