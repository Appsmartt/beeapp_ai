from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from apps.commercial.exceptions import CommercialValidationError


REQUEST_TYPE_PRODUCT_ORDER = "product_order"
REQUEST_TYPE_SERVICE_REQUEST = "service_request"
REQUEST_TYPE_BOOKING_REQUEST = "booking_request"

REQUEST_TYPES = frozenset(
    {
        REQUEST_TYPE_PRODUCT_ORDER,
        REQUEST_TYPE_SERVICE_REQUEST,
        REQUEST_TYPE_BOOKING_REQUEST,
    }
)

DELIVERY_FEE_MODES = frozenset(
    {
        "not_offered",
        "free",
        "fixed",
        "to_be_confirmed",
    }
)

DELIVERY_MODALITY = "delivery"


def _required_string(value: object, *, field: str, max_length: int) -> str:
    normalized = str(value or "").strip()

    if not normalized:
        raise CommercialValidationError(
            code=f"{field}_required",
            message=f"{field} is required.",
        )

    if len(normalized) > max_length:
        raise CommercialValidationError(
            code=f"{field}_too_long",
            message=f"{field} exceeds {max_length} characters.",
        )

    return normalized


def _optional_string(value: object, *, field: str, max_length: int) -> str | None:
    if value is None:
        return None

    normalized = str(value).strip()

    if not normalized:
        return None

    if len(normalized) > max_length:
        raise CommercialValidationError(
            code=f"{field}_too_long",
            message=f"{field} exceeds {max_length} characters.",
        )

    return normalized


def _positive_integer(value: object, *, field: str) -> int:
    if isinstance(value, bool):
        raise CommercialValidationError(
            code=f"{field}_invalid",
            message=f"{field} must be a positive integer.",
        )

    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise CommercialValidationError(
            code=f"{field}_invalid",
            message=f"{field} must be a positive integer.",
        ) from exc

    if parsed < 1:
        raise CommercialValidationError(
            code=f"{field}_invalid",
            message=f"{field} must be a positive integer.",
        )

    return parsed


def _non_negative_integer(value: object, *, field: str) -> int:
    if isinstance(value, bool):
        raise CommercialValidationError(
            code=f"{field}_invalid",
            message=f"{field} must be a non-negative integer.",
        )

    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise CommercialValidationError(
            code=f"{field}_invalid",
            message=f"{field} must be a non-negative integer.",
        ) from exc

    if parsed < 0:
        raise CommercialValidationError(
            code=f"{field}_invalid",
            message=f"{field} must be a non-negative integer.",
        )

    return parsed


@dataclass(frozen=True)
class RequestDraftItem:
    commercial_offer_id: str
    commercial_profile_id: str
    offer_kind: str
    title: str
    quantity: int
    unit_price_amount: int | None
    line_total_amount: int | None
    pricing_strategy: str
    requested_modality: str | None
    requires_booking: bool
    payment_policy: str | None
    duration_minutes: int | None
    offer_snapshot: dict[str, Any]


@dataclass(frozen=True)
class RequestDraft:
    request_type: str
    commercial_profile_id: str
    requested_modality: str | None
    customer_note: str | None
    delivery_address: str | None
    delivery_reference: str | None
    subtotal_amount: int | None
    delivery_fee_amount: int | None
    total_amount: int | None
    currency_code: str
    delivery_fee_mode: str
    items: tuple[RequestDraftItem, ...]


def _validate_item(
    raw_item: object,
    *,
    expected_business_id: str | None,
) -> RequestDraftItem:
    if not isinstance(raw_item, dict):
        raise CommercialValidationError(
            code="request_item_invalid",
            message="Each request item must be an object.",
        )

    commercial_profile_id = _required_string(
        raw_item.get("commercial_profile_id"),
        field="commercial_profile_id",
        max_length=64,
    )

    if expected_business_id and commercial_profile_id != expected_business_id:
        raise CommercialValidationError(
            code="mixed_business_cart",
            message="All request items must belong to the same business.",
        )

    offer_kind = _required_string(
        raw_item.get("offer_kind"),
        field="offer_kind",
        max_length=20,
    )

    if offer_kind not in {"product", "service"}:
        raise CommercialValidationError(
            code="offer_kind_invalid",
            message="offer_kind must be product or service.",
        )

    pricing_strategy = _required_string(
        raw_item.get("pricing_strategy"),
        field="pricing_strategy",
        max_length=40,
    )

    if pricing_strategy not in {"fixed", "starting_at", "free", "to_be_confirmed"}:
        raise CommercialValidationError(
            code="pricing_strategy_invalid",
            message="pricing_strategy is not supported.",
        )

    quantity = _positive_integer(raw_item.get("quantity", 1), field="quantity")

    raw_price = raw_item.get("unit_price_amount")
    unit_price_amount = (
        _non_negative_integer(raw_price, field="unit_price_amount")
        if raw_price is not None
        else None
    )

    if pricing_strategy == "fixed" and unit_price_amount is None:
        raise CommercialValidationError(
            code="unit_price_amount_required",
            message="Fixed-price offers require unit_price_amount.",
        )

    if pricing_strategy == "free" and unit_price_amount not in {None, 0}:
        raise CommercialValidationError(
            code="free_offer_price_invalid",
            message="Free offers cannot have a price.",
        )

    if unit_price_amount is None:
        line_total_amount = None
    else:
        line_total_amount = unit_price_amount * quantity

    raw_offer_snapshot = raw_item.get("offer_snapshot", {})
    if not isinstance(raw_offer_snapshot, dict):
        raise CommercialValidationError(
            code="offer_snapshot_invalid",
            message="offer_snapshot must be an object.",
        )

    raw_requires_booking = raw_item.get("requires_booking", False)
    if not isinstance(raw_requires_booking, bool):
        raise CommercialValidationError(
            code="requires_booking_invalid",
            message="requires_booking must be a boolean.",
        )

    duration_minutes = raw_item.get("duration_minutes")
    if duration_minutes is not None:
        duration_minutes = _positive_integer(
            duration_minutes,
            field="duration_minutes",
        )

    if offer_kind == "product" and raw_requires_booking:
        raise CommercialValidationError(
            code="product_booking_not_allowed",
            message="Products cannot require booking.",
        )

    if raw_requires_booking and duration_minutes is None:
        raise CommercialValidationError(
            code="booking_duration_required",
            message="Bookable services require duration_minutes.",
        )

    return RequestDraftItem(
        commercial_offer_id=_required_string(
            raw_item.get("commercial_offer_id"),
            field="commercial_offer_id",
            max_length=64,
        ),
        commercial_profile_id=commercial_profile_id,
        offer_kind=offer_kind,
        title=_required_string(
            raw_item.get("title"),
            field="title",
            max_length=200,
        ),
        quantity=quantity,
        unit_price_amount=unit_price_amount,
        line_total_amount=line_total_amount,
        pricing_strategy=pricing_strategy,
        requested_modality=_optional_string(
            raw_item.get("requested_modality"),
            field="requested_modality",
            max_length=40,
        ),
        requires_booking=raw_requires_booking,
        payment_policy=_optional_string(
            raw_item.get("payment_policy"),
            field="payment_policy",
            max_length=50,
        ),
        duration_minutes=duration_minutes,
        offer_snapshot=raw_offer_snapshot,
    )


def build_request_draft(payload: dict[str, Any]) -> RequestDraft:
    if not isinstance(payload, dict):
        raise CommercialValidationError(
            code="request_payload_invalid",
            message="Request payload must be an object.",
        )

    request_type = _required_string(
        payload.get("request_type"),
        field="request_type",
        max_length=40,
    )

    if request_type not in REQUEST_TYPES:
        raise CommercialValidationError(
            code="request_type_invalid",
            message="request_type is not supported.",
        )

    commercial_profile_id = _required_string(
        payload.get("commercial_profile_id"),
        field="commercial_profile_id",
        max_length=64,
    )

    raw_items = payload.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        raise CommercialValidationError(
            code="request_items_required",
            message="At least one request item is required.",
        )

    items = tuple(
        _validate_item(
            raw_item,
            expected_business_id=commercial_profile_id,
        )
        for raw_item in raw_items
    )

    kinds = {item.offer_kind for item in items}

    if request_type == REQUEST_TYPE_PRODUCT_ORDER:
        if kinds != {"product"}:
            raise CommercialValidationError(
                code="product_order_items_invalid",
                message="product_order accepts only product items.",
            )
    else:
        if len(items) != 1 or kinds != {"service"}:
            raise CommercialValidationError(
                code="service_request_items_invalid",
                message="Service and booking requests require one service item.",
            )

    if request_type == REQUEST_TYPE_BOOKING_REQUEST and not items[0].requires_booking:
        raise CommercialValidationError(
            code="booking_offer_required",
            message="booking_request requires a service configured for booking.",
        )

    if request_type == REQUEST_TYPE_SERVICE_REQUEST and items[0].requires_booking:
        raise CommercialValidationError(
            code="booking_request_required",
            message="Bookable services must use booking_request.",
        )

    requested_modality = _optional_string(
        payload.get("requested_modality"),
        field="requested_modality",
        max_length=40,
    )

    delivery_fee_mode = _required_string(
        payload.get("delivery_fee_mode", "not_offered"),
        field="delivery_fee_mode",
        max_length=40,
    )

    if delivery_fee_mode not in DELIVERY_FEE_MODES:
        raise CommercialValidationError(
            code="delivery_fee_mode_invalid",
            message="delivery_fee_mode is not supported.",
        )

    delivery_address = _optional_string(
        payload.get("delivery_address"),
        field="delivery_address",
        max_length=1000,
    )

    delivery_reference = _optional_string(
        payload.get("delivery_reference"),
        field="delivery_reference",
        max_length=1000,
    )

    if requested_modality == DELIVERY_MODALITY and not delivery_address:
        raise CommercialValidationError(
            code="delivery_address_required",
            message="delivery_address is required for delivery.",
        )

    if requested_modality != DELIVERY_MODALITY:
        delivery_address = None
        delivery_reference = None

    known_line_totals = [item.line_total_amount for item in items]
    subtotal_amount = (
        sum(total for total in known_line_totals if total is not None)
        if all(total is not None for total in known_line_totals)
        else None
    )

    raw_delivery_fee = payload.get("delivery_fee_amount")
    delivery_fee_amount: int | None = None

    if delivery_fee_mode == "free":
        if raw_delivery_fee not in {None, 0, "0"}:
            raise CommercialValidationError(
                code="free_delivery_fee_invalid",
                message="Free delivery cannot have a fee.",
            )
        delivery_fee_amount = 0
    elif delivery_fee_mode == "fixed":
        delivery_fee_amount = _non_negative_integer(
            raw_delivery_fee,
            field="delivery_fee_amount",
        )
    elif delivery_fee_mode == "not_offered":
        if requested_modality == DELIVERY_MODALITY:
            raise CommercialValidationError(
                code="delivery_not_offered",
                message="Delivery is not offered by this business.",
            )
        delivery_fee_amount = None
    elif delivery_fee_mode == "to_be_confirmed":
        delivery_fee_amount = None

    total_amount = (
        subtotal_amount + delivery_fee_amount
        if subtotal_amount is not None and delivery_fee_amount is not None
        else None
    )

    currency_code = _required_string(
        payload.get("currency_code", "COP"),
        field="currency_code",
        max_length=3,
    ).upper()

    if len(currency_code) != 3 or not currency_code.isalpha():
        raise CommercialValidationError(
            code="currency_code_invalid",
            message="currency_code must be a three-letter ISO code.",
        )

    return RequestDraft(
        request_type=request_type,
        commercial_profile_id=commercial_profile_id,
        requested_modality=requested_modality,
        customer_note=_optional_string(
            payload.get("customer_note"),
            field="customer_note",
            max_length=3000,
        ),
        delivery_address=delivery_address,
        delivery_reference=delivery_reference,
        subtotal_amount=subtotal_amount,
        delivery_fee_amount=delivery_fee_amount,
        total_amount=total_amount,
        currency_code=currency_code,
        delivery_fee_mode=delivery_fee_mode,
        items=items,
    )
