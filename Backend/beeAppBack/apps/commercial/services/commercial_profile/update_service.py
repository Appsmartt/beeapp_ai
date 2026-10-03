from __future__ import annotations

from typing import Any

from apps.commercial.exceptions import (
    CommercialProfileCreateError,
    CommercialProfileUpdateError,
    CommercialProfileValidationError,
)


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


def replace_commercial_profile_modalities(
    *,
    get_user_client,
    access_token: str,
    profile_id: str,
    modalities: list[str],
) -> None:
    try:
        supabase = get_user_client(access_token=access_token)
        (
            supabase.table("commercial_profile_modalities")
            .delete()
            .eq("commercial_profile_id", str(profile_id))
            .execute()
        )

        if not modalities:
            return

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


def replace_commercial_profile_social_links(
    *,
    get_user_client,
    access_token: str,
    profile_id: str,
    social_links: list[dict[str, Any]],
) -> None:
    try:
        supabase = get_user_client(access_token=access_token)
        (
            supabase.table("commercial_profile_social_links")
            .delete()
            .eq("commercial_profile_id", str(profile_id))
            .execute()
        )

        if not social_links:
            return

        response = (
            supabase.table("commercial_profile_social_links")
            .insert(
                [
                    {
                        "commercial_profile_id": str(profile_id),
                        "platform": link["platform"],
                        "url": link["url"],
                    }
                    for link in social_links
                ]
            )
            .execute()
        )

        if len(response.data or []) != len(social_links):
            raise CommercialProfileUpdateError(
                "Could not update all profile social links."
            )
    except CommercialProfileUpdateError:
        raise
    except Exception as error:
        raise CommercialProfileUpdateError(
            "Could not update profile social links."
        ) from error


def replace_commercial_profile_hours(
    *,
    get_user_client,
    access_token: str,
    profile_id: str,
    hours: list[dict[str, Any]],
) -> None:
    try:
        supabase = get_user_client(access_token=access_token)
        (
            supabase.table("commercial_profile_hours")
            .delete()
            .eq("commercial_profile_id", str(profile_id))
            .execute()
        )

        if not hours:
            return

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


def update_commercial_profile(
    *,
    get_user_client,
    get_owned_profile,
    get_profile_with_token,
    validate_merged_payload,
    replace_categories,
    replace_modalities,
    replace_hours,
    replace_social_links,
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
        "cash_on_delivery_enabled",
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
    has_social_links = "social_links" in payload
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
        current_profile = get_owned_profile(
            user_id=str(user_id),
            profile_id=str(profile_id),
        )
        category_ids = (
            [str(category_id) for category_id in payload["category_ids"]]
            if has_category_ids
            else [
                str(category_id)
                for category_id in current_profile.get(
                    "category_ids",
                    [],
                )
            ]
        )
        user_supabase = get_user_client(
            access_token=normalized_access_token,
        )
        merged_profile = {
            **current_profile,
            **profile_payload,
            "category_ids": category_ids,
        }
        validate_merged_payload(
            user_id=str(user_id),
            profile_id=str(profile_id),
            merged_profile=merged_profile,
        )

        if has_category_ids:
            profile_payload["category_id"] = category_ids[0]

        if profile_payload:
            response = (
                user_supabase.table("commercial_profiles")
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
            replace_categories(
                supabase=user_supabase,
                commercial_profile_id=str(profile_id),
                category_ids=category_ids,
            )

        if has_modalities:
            replace_modalities(
                get_user_client=get_user_client,
                access_token=normalized_access_token,
                profile_id=str(profile_id),
                modalities=payload["modalities"],
            )

        if has_hours:
            replace_hours(
                get_user_client=get_user_client,
                access_token=normalized_access_token,
                profile_id=str(profile_id),
                hours=payload["hours"],
            )

        if has_social_links:
            replace_social_links(
                get_user_client=get_user_client,
                access_token=normalized_access_token,
                profile_id=str(profile_id),
                social_links=payload["social_links"],
            )

        return get_profile_with_token(
            access_token=normalized_access_token,
            profile_id=str(profile_id),
        )
    except (
        CommercialProfileUpdateError,
        CommercialProfileValidationError,
    ):
        raise
    except Exception as error:
        raise CommercialProfileUpdateError(
            "Could not update commercial profile."
        ) from error
