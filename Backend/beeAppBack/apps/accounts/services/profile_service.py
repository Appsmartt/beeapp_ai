from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.exceptions import (
    ProfileCreationError,
    ProfileLookupError,
    ProfileUpdateError,
)


def create_profile(
    *,
    auth_user_id: str,
    first_name: str,
    last_name: str,
    phone_dial_code: str,
    phone_number: str,
):
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("profile")
            .insert(
                {
                    "id": auth_user_id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone_dial_code": phone_dial_code,
                    "phone_number": phone_number,
                    "role": "USER",
                }
            )
            .execute()
        )

        if not response.data:
            raise ProfileCreationError(
                "Supabase did not return the created profile."
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

        response = (
            supabase.table("profile")
            .select(
                (
                    "id,first_name,last_name,phone_dial_code,"
                    "phone_number,role,occupation,location"
                )
            )
            .eq("id", auth_user_id)
            .single()
            .execute()
        )

        if not response.data:
            raise ProfileLookupError(
                "Supabase did not return the requested profile."
            )

        return response.data

    except ProfileLookupError:
        raise

    except Exception as error:
        raise ProfileLookupError(
            "Could not retrieve the BeeApp profile."
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