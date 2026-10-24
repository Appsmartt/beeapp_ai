from typing import Any

from apps.commercial.exceptions import CommercialOperationError

from .constants import MOBILE_PAYMENT_METHOD_TYPES


def _first_child(
    payment_method: dict[str, Any],
    relation_name: str,
) -> dict[str, Any] | None:
    relation = payment_method.get(relation_name)

    if isinstance(relation, list):
        return relation[0] if relation else None

    if isinstance(relation, dict):
        return relation

    return None


def serialize_owned_payment_method(
    payment_method: dict[str, Any],
) -> dict[str, Any]:
    payment_method_type = payment_method["payment_method_type"]
    mobile_account = _first_child(
        payment_method,
        "commercial_mobile_payment_accounts",
    )
    bank_account = _first_child(
        payment_method,
        "commercial_bank_accounts",
    )

    serialized_mobile_account = None
    serialized_bank_account = None

    if payment_method_type in MOBILE_PAYMENT_METHOD_TYPES:
        if not mobile_account:
            raise CommercialOperationError(
                "Mobile payment account details are missing.",
                code="COMMERCIAL_PAYMENT_METHOD_DETAILS_MISSING",
            )

        serialized_mobile_account = {
            "wallet_type": mobile_account["wallet_type"],
            "payment_key": mobile_account["payment_key"],
            "account_holder_name": mobile_account.get(
                "account_holder_name"
            ),
        }
    elif payment_method_type == "bank_account":
        if not bank_account:
            raise CommercialOperationError(
                "Bank account details are missing.",
                code="COMMERCIAL_PAYMENT_METHOD_DETAILS_MISSING",
            )

        serialized_bank_account = {
            "account_holder_name": bank_account[
                "account_holder_name"
            ],
            "account_holder_document_type": bank_account[
                "account_holder_document_type"
            ],
            "account_holder_document_number": bank_account[
                "account_holder_document_number"
            ],
            "bank_name": bank_account["bank_name"],
            "account_type": bank_account["account_type"],
            "account_number": bank_account["account_number"],
        }
    else:
        raise CommercialOperationError(
            "Payment method type is not supported.",
            code="COMMERCIAL_PAYMENT_METHOD_TYPE_INVALID",
        )

    return {
        "id": str(payment_method["id"]),
        "commercial_profile_id": str(
            payment_method["commercial_profile_id"]
        ),
        "payment_method_type": payment_method_type,
        "display_name": payment_method["display_name"],
        "sort_order": int(payment_method.get("sort_order") or 0),
        "status": payment_method["status"],
        "archived_at": payment_method.get("archived_at"),
        "created_at": payment_method.get("created_at"),
        "updated_at": payment_method.get("updated_at"),
        "mobile_account": serialized_mobile_account,
        "bank_account": serialized_bank_account,
    }


def serialize_upserted_payment_method(
    payment_method: dict[str, Any],
) -> dict[str, Any]:
    return {
        "id": str(payment_method["id"]),
        "commercial_profile_id": str(
            payment_method["commercial_profile_id"]
        ),
        "payment_method_type": payment_method["payment_method_type"],
        "display_name": payment_method["display_name"],
        "sort_order": int(payment_method["sort_order"]),
        "status": payment_method["status"],
        "archived_at": payment_method.get("archived_at"),
        "created_at": payment_method.get("created_at"),
        "updated_at": payment_method.get("updated_at"),
        "mobile_account": payment_method.get("mobile_account"),
        "bank_account": payment_method.get("bank_account"),
    }


def serialize_public_payment_method(
    payment_method: dict[str, Any],
) -> dict[str, Any]:
    return {
        "id": str(payment_method["id"]),
        "commercial_profile_id": str(
            payment_method["commercial_profile_id"]
        ),
        "payment_method_type": payment_method[
            "payment_method_type"
        ],
        "display_name": payment_method["display_name"],
        "sort_order": int(payment_method.get("sort_order") or 0),
    }
