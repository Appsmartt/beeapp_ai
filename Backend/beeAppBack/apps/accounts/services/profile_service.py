from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.exceptions import (
    AssistantSettingsUpdateError,
    ProfileCreationError,
    ProfileLookupError,
    ProfileUpdateError,
)


PROFILE_COLUMNS = (
    "id,email,first_name,last_name,phone_dial_code,"
    "phone_number,normalized_phone,timezone,role,"
    "occupation,location,assistant_name,assistant_tone,"
    "updated_at"
)

SOCIAL_LINK_COLUMNS = "platform,url"


def create_profile(
    *,
    auth_user_id: str,
    email: str,
    first_name: str,
    last_name: str,
    phone_dial_code: str,
    phone_number: str,
    timezone: str = "America/Bogota",
):
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("profile")
            .insert(
                {
                    "id": auth_user_id,
                    "email": email.strip().lower(),
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone_dial_code": phone_dial_code,
                    "phone_number": phone_number,
                    "timezone": timezone,
                    "role": "USER",
                }
            )
            .execute()
        )

        if not response.data:
            raise ProfileCreationError(
                "Supabase did not return the created profile."
            )

        quota_response = (
            supabase.table("storage_quotas")
            .upsert(
                {
                    "user_id": auth_user_id,
                    "quota_bytes": 5368709120,
                    "used_bytes": 0,
                    "reserved_bytes": 0,
                },
                on_conflict="user_id",
            )
            .execute()
        )

        if quota_response.data is None:
            raise ProfileCreationError(
                "Supabase did not return the storage quota."
            )

        return response.data[0]

    except ProfileCreationError:
        raise

    except Exception as error:
        raise ProfileCreationError(
            "Could not create the BeeApp profile."
        ) from error


def get_profile(*, auth_user_id: str) -> dict:
    try:
        supabase = get_supabase_admin_client()

        profile_response = (
            supabase.table("profile")
            .select(PROFILE_COLUMNS)
            .eq("id", auth_user_id)
            .single()
            .execute()
        )

        if not profile_response.data:
            raise ProfileLookupError(
                "Supabase did not return the requested profile."
            )

        social_links_response = (
            supabase.table("profile_social_links")
            .select(SOCIAL_LINK_COLUMNS)
            .eq("profile_id", auth_user_id)
            .order("platform")
            .execute()
        )

        profile = profile_response.data
        profile["social_links"] = social_links_response.data or []

        return profile

    except ProfileLookupError:
        raise

    except Exception as error:
        raise ProfileLookupError(
            "Could not retrieve the BeeApp profile."
        ) from error


def update_profile(
    *,
    auth_user_id: str,
    first_name: str,
    last_name: str,
    phone_dial_code: str,
    phone_number: str,
    occupation: str | None = None,
    location: str | None = None,
    social_links: list[dict] | None = None,
) -> dict:
    try:
        supabase = get_supabase_admin_client()

        profile_data = {
            "first_name": first_name,
            "last_name": last_name,
            "phone_dial_code": phone_dial_code,
            "phone_number": phone_number,
            "occupation": occupation,
            "location": location,
        }

        profile_response = (
            supabase.table("profile")
            .update(profile_data)
            .eq("id", auth_user_id)
            .execute()
        )

        if not profile_response.data:
            raise ProfileUpdateError(
                "Supabase did not return the updated profile."
            )

        if social_links is not None:
            (
                supabase.table("profile_social_links")
                .delete()
                .eq("profile_id", auth_user_id)
                .execute()
            )

            if social_links:
                links_to_insert = [
                    {
                        "profile_id": auth_user_id,
                        "platform": link["platform"],
                        "url": link["url"],
                    }
                    for link in social_links
                ]

                links_response = (
                    supabase.table("profile_social_links")
                    .insert(links_to_insert)
                    .execute()
                )

                if len(links_response.data or []) != len(links_to_insert):
                    raise ProfileUpdateError(
                        "Supabase did not return all social links."
                    )

        return get_profile(auth_user_id=auth_user_id)

    except ProfileUpdateError:
        raise

    except Exception as error:
        raise ProfileUpdateError(
            "Could not update the BeeApp profile."
        ) from error


def update_onboarding_profile(
    *,
    auth_user_id: str,
    occupation: str,
    location: str,
) -> dict:
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("profile")
            .update(
                {
                    "occupation": occupation,
                    "location": location,
                }
            )
            .eq("id", auth_user_id)
            .execute()
        )

        if not response.data:
            raise ProfileUpdateError(
                "Supabase did not return the updated profile."
            )

        return response.data[0]

    except ProfileUpdateError:
        raise

    except Exception as error:
        raise ProfileUpdateError(
            "Could not update the BeeApp profile."
        ) from error


def update_assistant_settings(
    *,
    auth_user_id: str,
    assistant_name: str,
    assistant_tone: str,
) -> dict:
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("profile")
            .update(
                {
                    "assistant_name": assistant_name,
                    "assistant_tone": assistant_tone,
                }
            )
            .eq("id", auth_user_id)
            .execute()
        )

        if not response.data:
            raise AssistantSettingsUpdateError(
                "Supabase did not return updated assistant settings."
            )

        return response.data[0]

    except AssistantSettingsUpdateError:
        raise

    except Exception as error:
        raise AssistantSettingsUpdateError(
            "Could not update assistant settings."
        ) from error