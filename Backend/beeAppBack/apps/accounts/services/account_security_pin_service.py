import hashlib
import hmac

from django.conf import settings

from beeAppBack.core.supabase_client import get_supabase_admin_client


class AccountSecurityPinStorageError(Exception):
    pass


def _pin_digest(pin: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        ("beeapp-account-security-pin:v1:" + pin).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def account_security_pin_is_configured(*, user_id: str) -> bool:
    try:
        response = (
            get_supabase_admin_client()
            .table("account_security_pins")
            .select("user_id")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        return bool(response.data)
    except Exception as error:
        raise AccountSecurityPinStorageError(
            "Could not read PIN configuration."
        ) from error


def configure_account_security_pin(*, user_id: str, pin: str) -> bool:
    try:
        response = (
            get_supabase_admin_client()
            .rpc(
                "configure_account_security_pin",
                {
                    "p_user_id": user_id,
                    "p_pin_digest": _pin_digest(pin),
                },
            )
            .execute()
        )
        if not isinstance(response.data, bool):
            raise AccountSecurityPinStorageError(
                "Unexpected PIN configuration response."
            )
        return response.data
    except AccountSecurityPinStorageError:
        raise
    except Exception as error:
        raise AccountSecurityPinStorageError(
            "Could not configure PIN."
        ) from error


def verify_account_security_pin(*, user_id: str, pin: str) -> str:
    try:
        response = (
            get_supabase_admin_client()
            .rpc(
                "verify_account_security_pin",
                {
                    "p_user_id": user_id,
                    "p_pin_digest": _pin_digest(pin),
                },
            )
            .execute()
        )
        if response.data not in (
            "verified", "invalid", "locked", "not_configured"
        ):
            raise AccountSecurityPinStorageError(
                "Unexpected PIN verification response."
            )
        return response.data
    except AccountSecurityPinStorageError:
        raise
    except Exception as error:
        raise AccountSecurityPinStorageError(
            "Could not verify PIN."
        ) from error
