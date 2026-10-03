from __future__ import annotations

from typing import Any

from apps.commercial.exceptions import (
    CommercialProfileCreateError,
    CommercialProfileValidationError,
)
from apps.chat.exceptions import ChatIdentityError


def rollback_created_commercial_profile(
    *,
    get_user_client,
    user_id: str,
    access_token: str,
    profile_id: str | None,
    created_category_ids: list[str],
) -> None:
    try:
        supabase = get_user_client(access_token=access_token)

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


def create_commercial_profile(
    *,
    get_user_client,
    validate_categories,
    normalize_category_name,
    validate_logo,
    resolve_new_categories,
    replace_categories,
    sync_chat_identities,
    get_profile_with_token,
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
            normalize_category_name(category_name)
            for category_name in (
                payload.get("new_category_names") or []
            )
        ]

        if offer_type == "mixed" and new_category_names:
            raise CommercialProfileValidationError(
                "No se pueden crear categorías nuevas "
                "para Servicios y productos."
            )

        if len(category_ids) + len(new_category_names) > 5:
            raise CommercialProfileValidationError(
                "Select or add up to 5 categories in total."
            )

        if category_ids:
            category_ids = validate_categories(
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
            validate_logo(
                user_id=str(user_id),
                logo_file_id=logo_file_id,
            )

        supabase = get_user_client(
            access_token=normalized_access_token,
        )
        (
            new_category_ids,
            created_category_ids,
        ) = resolve_new_categories(
            supabase=supabase,
            category_names=new_category_names,
            offer_type=offer_type,
        )
        category_ids = [*category_ids, *new_category_ids]

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
            "category_id": category_ids[0] if category_ids else None,
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
            "publication_status": "paused",
            "is_public": False,
            "is_available": False,
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

        replace_categories(
            supabase=supabase,
            commercial_profile_id=created_profile_id,
            category_ids=category_ids,
        )

        _create_profile_modalities(
            supabase=supabase,
            profile_id=created_profile_id,
            modalities=payload["modalities"],
        )
        _create_profile_hours(
            supabase=supabase,
            profile_id=created_profile_id,
            hours=payload["hours"],
        )
        _create_profile_social_links(
            supabase=supabase,
            profile_id=created_profile_id,
            social_links=payload.get("social_links") or [],
        )

        try:
            sync_chat_identities(user_id=str(user_id))
        except ChatIdentityError as error:
            raise CommercialProfileCreateError(
                "Could not initialize the chat identity "
                "for the new commercial profile."
            ) from error

        return get_profile_with_token(
            access_token=normalized_access_token,
            profile_id=created_profile_id,
        )
    except (
        CommercialProfileCreateError,
        CommercialProfileValidationError,
    ):
        rollback_created_commercial_profile(
            get_user_client=get_user_client,
            user_id=str(user_id),
            access_token=normalized_access_token,
            profile_id=created_profile_id,
            created_category_ids=created_category_ids,
        )
        raise
    except Exception as error:
        rollback_created_commercial_profile(
            get_user_client=get_user_client,
            user_id=str(user_id),
            access_token=normalized_access_token,
            profile_id=created_profile_id,
            created_category_ids=created_category_ids,
        )
        raise CommercialProfileCreateError(
            "Could not create the commercial profile."
        ) from error


def _create_profile_modalities(
    *,
    supabase,
    profile_id: str,
    modalities: list[str],
) -> None:
    rows = [
        {
            "commercial_profile_id": profile_id,
            "modality": modality,
        }
        for modality in modalities
    ]
    response = (
        supabase.table("commercial_profile_modalities")
        .insert(rows)
        .execute()
    )

    if len(response.data or []) != len(rows):
        raise CommercialProfileCreateError(
            "Supabase did not create all profile modalities."
        )


def _create_profile_hours(
    *,
    supabase,
    profile_id: str,
    hours: list[dict[str, Any]],
) -> None:
    rows = [
        {
            "commercial_profile_id": profile_id,
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

    if not rows:
        return

    response = (
        supabase.table("commercial_profile_hours")
        .insert(rows)
        .execute()
    )

    if len(response.data or []) != len(rows):
        raise CommercialProfileCreateError(
            "Supabase did not create all profile hours."
        )


def _create_profile_social_links(
    *,
    supabase,
    profile_id: str,
    social_links: list[dict[str, Any]],
) -> None:
    rows = [
        {
            "commercial_profile_id": profile_id,
            "platform": link["platform"],
            "url": link["url"],
        }
        for link in social_links
    ]

    if not rows:
        return

    response = (
        supabase.table("commercial_profile_social_links")
        .insert(rows)
        .execute()
    )

    if len(response.data or []) != len(rows):
        raise CommercialProfileCreateError(
            "Supabase did not create all profile social links."
        )
