from typing import Any

from apps.commercial.exceptions import CommercialValidationError

from .constants import MOBILE_PAYMENT_METHOD_TYPES


def build_update_payload(
    *,
    current_payment_method: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    current_type = current_payment_method["payment_method_type"]
    payload_for_upsert = {
        "payment_method_type": current_type,
        "display_name": payload["display_name"],
        "sort_order": payload["sort_order"],
        "mobile_account": payload.get("mobile_account"),
        "bank_account": payload.get("bank_account"),
    }

    if current_type in MOBILE_PAYMENT_METHOD_TYPES:
        mobile_account = payload_for_upsert["mobile_account"]

        if not mobile_account:
            raise CommercialValidationError(
                "Mobile account data is required.",
                code=(
                    "COMMERCIAL_PAYMENT_METHOD_MOBILE_ACCOUNT_REQUIRED"
                ),
            )

        if mobile_account.get("wallet_type") != current_type:
            raise CommercialValidationError(
                "wallet_type cannot change.",
                code="COMMERCIAL_PAYMENT_METHOD_TYPE_IMMUTABLE",
            )

        if payload_for_upsert["bank_account"] is not None:
            raise CommercialValidationError(
                "Bank account data is not allowed.",
                code=(
                    "COMMERCIAL_PAYMENT_METHOD_ACCOUNT_TYPE_INVALID"
                ),
            )
    elif current_type == "bank_account":
        if not payload_for_upsert["bank_account"]:
            raise CommercialValidationError(
                "Bank account data is required.",
                code=(
                    "COMMERCIAL_PAYMENT_METHOD_BANK_ACCOUNT_REQUIRED"
                ),
            )

        if payload_for_upsert["mobile_account"] is not None:
            raise CommercialValidationError(
                "Mobile account data is not allowed.",
                code=(
                    "COMMERCIAL_PAYMENT_METHOD_ACCOUNT_TYPE_INVALID"
                ),
            )
    else:
        raise CommercialValidationError(
            "Payment method type is not supported.",
            code="COMMERCIAL_PAYMENT_METHOD_TYPE_INVALID",
        )

    return payload_for_upsert
