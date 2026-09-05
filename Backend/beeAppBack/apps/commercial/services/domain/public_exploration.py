from __future__ import annotations

from dataclasses import dataclass

from apps.commercial.exceptions import CommercialValidationError


ALLOWED_OFFER_TYPES = frozenset({"products", "services", "mixed"})
ALLOWED_MODALITIES = frozenset(
    {
        "at_establishment",
        "in_person",
        "virtual",
        "home_visit",
        "delivery",
        "pickup",
        "phone_call",
        "buddy_chat",
    }
)
ALLOWED_SORTS = frozenset({"featured", "recent", "relevance"})


def _optional_text(value: object, *, max_length: int, field: str) -> str | None:
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


@dataclass(frozen=True)
class PublicBusinessFilters:
    country_code: str | None
    city: str | None
    category_id: str | None
    offer_type: str | None
    modality: str | None
    verified_only: bool
    delivery_only: bool
    search: str | None
    ordering: str
    page: int
    page_size: int


def parse_boolean(value: object, *, field: str) -> bool:
    if isinstance(value, bool):
        return value

    if value is None:
        return False

    normalized = str(value).strip().lower()

    if normalized in {"", "0", "false", "no"}:
        return False

    if normalized in {"1", "true", "yes"}:
        return True

    raise CommercialValidationError(
        code=f"{field}_invalid",
        message=f"{field} must be a boolean.",
    )


def parse_positive_int(
    value: object,
    *,
    field: str,
    default: int,
    minimum: int,
    maximum: int,
) -> int:
    if value is None or str(value).strip() == "":
        return default

    try:
        parsed = int(str(value))
    except (TypeError, ValueError) as exc:
        raise CommercialValidationError(
            code=f"{field}_invalid",
            message=f"{field} must be an integer.",
        ) from exc

    if parsed < minimum or parsed > maximum:
        raise CommercialValidationError(
            code=f"{field}_out_of_range",
            message=f"{field} must be between {minimum} and {maximum}.",
        )

    return parsed


def parse_public_business_filters(query: dict[str, object]) -> PublicBusinessFilters:
    country_code = _optional_text(
        query.get("country_code"),
        max_length=2,
        field="country_code",
    )
    if country_code:
        country_code = country_code.upper()
        if not country_code.isalpha() or len(country_code) != 2:
            raise CommercialValidationError(
                code="country_code_invalid",
                message="country_code must be a two-letter ISO country code.",
            )

    city = _optional_text(query.get("city"), max_length=120, field="city")
    category_id = _optional_text(
        query.get("category_id"),
        max_length=64,
        field="category_id",
    )

    offer_type = _optional_text(
        query.get("offer_type"),
        max_length=20,
        field="offer_type",
    )
    if offer_type and offer_type not in ALLOWED_OFFER_TYPES:
        raise CommercialValidationError(
            code="offer_type_invalid",
            message="offer_type must be products, services or mixed.",
        )

    modality = _optional_text(
        query.get("modality"),
        max_length=40,
        field="modality",
    )
    if modality and modality not in ALLOWED_MODALITIES:
        raise CommercialValidationError(
            code="modality_invalid",
            message="modality is not supported.",
        )

    ordering = _optional_text(
        query.get("ordering"),
        max_length=20,
        field="ordering",
    ) or "featured"

    if ordering not in ALLOWED_SORTS:
        raise CommercialValidationError(
            code="ordering_invalid",
            message="ordering must be featured, recent or relevance.",
        )

    return PublicBusinessFilters(
        country_code=country_code,
        city=city,
        category_id=category_id,
        offer_type=offer_type,
        modality=modality,
        verified_only=parse_boolean(
            query.get("verified_only"),
            field="verified_only",
        ),
        delivery_only=parse_boolean(
            query.get("delivery_only"),
            field="delivery_only",
        ),
        search=_optional_text(query.get("search"), max_length=160, field="search"),
        ordering=ordering,
        page=parse_positive_int(
            query.get("page"),
            field="page",
            default=1,
            minimum=1,
            maximum=10_000,
        ),
        page_size=parse_positive_int(
            query.get("page_size"),
            field="page_size",
            default=20,
            minimum=1,
            maximum=50,
        ),
    )
