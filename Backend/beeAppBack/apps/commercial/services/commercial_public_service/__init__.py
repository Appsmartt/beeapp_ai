from __future__ import annotations

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.commercial.services.commercial_profile_service import (
    compatible_category_offer_types,
)

from . import catalogs
from . import locations
from . import media
from . import offers
from . import product_feed
from . import profile_data
from . import profile_queries
from .shared import (
    PUBLIC_CATALOG_COLUMNS,
    PUBLIC_CATEGORY_COLUMNS,
    PUBLIC_FILE_IMAGE_COLUMNS,
    PUBLIC_IMAGE_SIGNED_URL_EXPIRES_IN_SECONDS,
    PUBLIC_LOGO_FILE_COLUMNS,
    PUBLIC_MODALITY_COLUMNS,
    PUBLIC_OFFER_COLUMNS,
    PUBLIC_OFFER_IMAGE_COLUMNS,
    PUBLIC_OFFER_MODALITY_COLUMNS,
    PUBLIC_PROFILE_CATEGORY_COLUMNS,
    PUBLIC_PROFILE_COLUMNS,
    _build_postgrest_ilike_or_filter,
    _extract_first_row,
    _normalize_optional_city,
    _normalize_optional_country_code,
    _public_profile_query,
    _response_rows,
    _validate_postgrest_search_value,
)


def _get_modalities_by_profile_ids(*, profile_ids: list[str]):
    return profile_data.get_modalities_by_profile_ids(
        profile_ids=profile_ids,
        execute=execute_with_supabase_admin_retry,
    )


def _get_category_ids_by_profile_ids(*, profile_ids: list[str]):
    return profile_data.get_category_ids_by_profile_ids(
        profile_ids=profile_ids,
        execute=execute_with_supabase_admin_retry,
    )


def _get_categories_by_ids(*, category_ids: list[str]):
    return profile_data.get_categories_by_ids(
        category_ids=category_ids,
        execute=execute_with_supabase_admin_retry,
    )


def _get_logo_files_by_profile_ids(*, profiles: list[dict]):
    return profile_data.get_logo_files_by_profile_ids(
        profiles=profiles,
        execute=execute_with_supabase_admin_retry,
    )


def _extract_storage_url(response):
    return media.extract_storage_url(response)


def _create_public_file_url(*, file_record: dict):
    return media.create_public_file_url(
        file_record=file_record,
        execute=execute_with_supabase_admin_retry,
    )


def _serialize_public_profile(
    *,
    profile: dict,
    modalities: list[str],
    categories: list[dict] | None = None,
    category: dict | None = None,
    logo_file: dict | None = None,
):
    return profile_data.serialize_public_profile(
        profile=profile,
        modalities=modalities,
        categories=categories,
        category=category,
        logo_file=logo_file,
        create_file_url=_create_public_file_url,
    )


def _enrich_public_profiles(profiles: list[dict]):
    return profile_data.enrich_public_profiles(
        profiles=profiles,
        get_modalities=_get_modalities_by_profile_ids,
        get_logo_files=_get_logo_files_by_profile_ids,
        get_category_ids=_get_category_ids_by_profile_ids,
        get_categories=_get_categories_by_ids,
        serialize_profile=_serialize_public_profile,
    )


def _get_offer_modalities_by_offer_ids(*, offer_ids: list[str]):
    return offers.get_offer_modalities_by_offer_ids(
        offer_ids=offer_ids,
        execute=execute_with_supabase_admin_retry,
    )


def _get_offer_images_by_offer_ids(*, offer_ids: list[str]):
    return media.get_offer_images_by_offer_ids(
        offer_ids=offer_ids,
        execute=execute_with_supabase_admin_retry,
        create_file_url=_create_public_file_url,
    )


def _serialize_public_offer(
    *,
    offer: dict,
    modalities: list[str],
    images: list[dict],
):
    return offers.serialize_public_offer(
        offer=offer,
        modalities=modalities,
        images=images,
    )


def _enrich_public_offers(offer_rows: list[dict]):
    return offers.enrich_public_offers(
        offers=offer_rows,
        get_modalities=_get_offer_modalities_by_offer_ids,
        get_images=_get_offer_images_by_offer_ids,
        serialize_offer=_serialize_public_offer,
    )


def _require_public_commercial_profile(*, commercial_profile_id: str):
    return profile_queries.require_public_commercial_profile(
        commercial_profile_id=commercial_profile_id,
        execute=execute_with_supabase_admin_retry,
        public_profile_query=_public_profile_query,
    )


def _require_public_catalog_for_profile(
    *,
    commercial_profile_id: str,
    catalog_id: str,
):
    return catalogs.require_public_catalog_for_profile(
        commercial_profile_id=commercial_profile_id,
        catalog_id=catalog_id,
        execute=execute_with_supabase_admin_retry,
    )


def list_public_countries():
    return locations.list_public_countries(
        execute=execute_with_supabase_admin_retry,
        public_profile_query=_public_profile_query,
        response_rows=_response_rows,
    )


def list_public_cities(*, country_code: str):
    return locations.list_public_cities(
        country_code=country_code,
        execute=execute_with_supabase_admin_retry,
        public_profile_query=_public_profile_query,
        response_rows=_response_rows,
    )


def _normalize_category_search(value: str | None):
    return locations.normalize_category_search(value)


def list_public_categories(
    *,
    country_code: str | None = None,
    city: str | None = None,
    offer_type: str | None = None,
    search: str | None = None,
    limit: int = 5,
):
    return locations.list_public_categories(
        country_code=country_code,
        city=city,
        offer_type=offer_type,
        search=search,
        limit=limit,
        execute=execute_with_supabase_admin_retry,
        response_rows=_response_rows,
        compatible_offer_types=compatible_category_offer_types,
    )


def list_public_commercial_profiles(
    *,
    country_code: str | None = None,
    city: str | None = None,
    category_id: str | None = None,
    offer_type: str | None = None,
    modality: str | None = None,
    verified_only: bool = False,
    delivery_only: bool = False,
    search: str | None = None,
    ordering: str = "recent",
    limit: int = 20,
    offset: int = 0,
):
    return profile_queries.list_public_commercial_profiles(
        country_code=country_code,
        city=city,
        category_id=category_id,
        offer_type=offer_type,
        modality=modality,
        verified_only=verified_only,
        delivery_only=delivery_only,
        search=search,
        ordering=ordering,
        limit=limit,
        offset=offset,
        execute=execute_with_supabase_admin_retry,
        public_profile_query=_public_profile_query,
        response_rows=_response_rows,
        normalize_country_code=_normalize_optional_country_code,
        normalize_city=_normalize_optional_city,
        validate_search=_validate_postgrest_search_value,
        build_search_filter=_build_postgrest_ilike_or_filter,
        get_modalities=_get_modalities_by_profile_ids,
        enrich_profiles=_enrich_public_profiles,
    )


def get_public_commercial_profile(*, commercial_profile_id: str):
    return profile_queries.get_public_commercial_profile(
        commercial_profile_id=commercial_profile_id,
        execute=execute_with_supabase_admin_retry,
        public_profile_query=_public_profile_query,
        enrich_profiles=_enrich_public_profiles,
    )


def list_public_commercial_catalogs(*, commercial_profile_id: str):
    return catalogs.list_public_commercial_catalogs(
        commercial_profile_id=commercial_profile_id,
        execute=execute_with_supabase_admin_retry,
        require_public_profile=_require_public_commercial_profile,
    )


def list_public_commercial_product_feed(
    *,
    search: str | None = None,
    seed: str | None = None,
    limit: int = 4,
    offset: int = 0,
):
    return product_feed.list_public_commercial_product_feed(
        search=search,
        seed=seed,
        limit=limit,
        offset=offset,
        execute=execute_with_supabase_admin_retry,
        validate_search=_validate_postgrest_search_value,
        public_profile_query=_public_profile_query,
        response_rows=_response_rows,
        enrich_offers=_enrich_public_offers,
        enrich_profiles=_enrich_public_profiles,
    )


def list_public_commercial_offers(
    *,
    commercial_profile_id: str,
    catalog_id: str | None = None,
    offer_kind: str | None = None,
    modality: str | None = None,
    requires_booking: bool | None = None,
    limit: int = 20,
    offset: int = 0,
):
    return offers.list_public_commercial_offers(
        commercial_profile_id=commercial_profile_id,
        catalog_id=catalog_id,
        offer_kind=offer_kind,
        modality=modality,
        requires_booking=requires_booking,
        limit=limit,
        offset=offset,
        execute=execute_with_supabase_admin_retry,
        response_rows=_response_rows,
        require_public_profile=_require_public_commercial_profile,
        require_public_catalog=_require_public_catalog_for_profile,
        get_modalities=_get_offer_modalities_by_offer_ids,
        enrich_offers=_enrich_public_offers,
    )


def get_public_commercial_offer(*, commercial_offer_id: str):
    return offers.get_public_commercial_offer(
        commercial_offer_id=commercial_offer_id,
        execute=execute_with_supabase_admin_retry,
        require_public_profile=_require_public_commercial_profile,
        enrich_offers=_enrich_public_offers,
    )


__all__ = [
    "get_public_commercial_offer",
    "get_public_commercial_profile",
    "list_public_categories",
    "list_public_cities",
    "list_public_commercial_catalogs",
    "list_public_commercial_offers",
    "list_public_commercial_product_feed",
    "list_public_commercial_profiles",
    "list_public_countries",
]
