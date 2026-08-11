from apps.accounts.services.auth_user_service import (
    create_auth_user,
    delete_auth_user,
)
from apps.accounts.services.profile_service import create_profile


def create_complete_user(
    *,
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    phone_dial_code: str,
    phone_number: str,
):
    auth_user = create_auth_user(
        email=email,
        password=password,
        phone_dial_code=phone_dial_code,
        phone_number=phone_number,
    )

    try:
        profile = create_profile(
            auth_user_id=str(auth_user.id),
            first_name=first_name,
            last_name=last_name,
            phone_dial_code=phone_dial_code,
            phone_number=phone_number,
        )

    except Exception:
        delete_auth_user(auth_user_id=str(auth_user.id))
        raise

    return {
        "auth_user_id": str(auth_user.id),
        "email": auth_user.email,
        "phone": auth_user.phone,
        "profile": profile,
    }
