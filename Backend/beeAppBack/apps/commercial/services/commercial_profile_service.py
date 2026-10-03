from __future__ import annotations

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
    get_supabase_user_client,
)

from apps.chat.services.chat_identity_service import (
    sync_chat_identities_for_user,
)
from apps.commercial.services.commercial_authorization_service import (
    require_commercial_profile_owner,
)
from apps.commercial.services.commercial_profile import (
    category_service,
    constants,
    creation_service,
    publication_service,
    query_service,
    relation_service,
    update_service,
    validation_service,
)

COMMERCIAL_CATEGORY_COLUMNS = constants.COMMERCIAL_CATEGORY_COLUMNS
COMMERCIAL_PROFILE_COLUMNS = constants.COMMERCIAL_PROFILE_COLUMNS
PRIVATE_COMMERCIAL_PROFILE_COLUMNS = (
    constants.PRIVATE_COMMERCIAL_PROFILE_COLUMNS
)
COMMERCIAL_MODALITY_COLUMNS = constants.COMMERCIAL_MODALITY_COLUMNS
COMMERCIAL_HOUR_COLUMNS = constants.COMMERCIAL_HOUR_COLUMNS
COMMERCIAL_PROFILE_CATEGORY_COLUMNS = (
    constants.COMMERCIAL_PROFILE_CATEGORY_COLUMNS
)
COMMERCIAL_PROFILE_SOCIAL_LINK_COLUMNS = (
    constants.COMMERCIAL_PROFILE_SOCIAL_LINK_COLUMNS
)

list_commercial_categories = (
    category_service.list_commercial_categories
)
validate_commercial_category = (
    category_service.validate_commercial_category
)
normalize_commercial_category_name = (
    category_service.normalize_commercial_category_name
)
commercial_category_name_key = (
    category_service.commercial_category_name_key
)
build_commercial_category_slug = (
    category_service.build_commercial_category_slug
)
compatible_category_offer_types = (
    category_service.compatible_category_offer_types
)
find_existing_commercial_category_by_name = (
    category_service.find_existing_commercial_category_by_name
)
build_unique_commercial_category_slug = (
    category_service.build_unique_commercial_category_slug
)
is_commercial_category_unique_violation = (
    category_service.is_commercial_category_unique_violation
)
resolve_new_commercial_categories = (
    category_service.resolve_new_commercial_categories
)
validate_commercial_logo = validation_service.validate_commercial_logo
validate_commercial_categories = (
    category_service.validate_commercial_categories
)
replace_commercial_profile_categories = (
    update_service.replace_commercial_profile_categories
)


def create_commercial_profile(*, user_id, access_token, payload):
    return creation_service.create_commercial_profile(
        get_user_client=get_supabase_user_client,
        validate_categories=validate_commercial_categories,
        normalize_category_name=normalize_commercial_category_name,
        validate_logo=validate_commercial_logo,
        resolve_new_categories=resolve_new_commercial_categories,
        replace_categories=replace_commercial_profile_categories,
        sync_chat_identities=sync_chat_identities_for_user,
        get_profile_with_token=(
            get_owned_commercial_profile_with_access_token
        ),
        user_id=user_id,
        access_token=access_token,
        payload=payload,
    )


def get_commercial_profile(*, user_id, profile_id):
    return query_service.get_commercial_profile(
        user_id=user_id,
        profile_id=profile_id,
    )


def _rollback_created_commercial_profile(
    *,
    user_id,
    access_token,
    profile_id,
    created_category_ids,
):
    return creation_service.rollback_created_commercial_profile(
        get_user_client=get_supabase_user_client,
        user_id=user_id,
        access_token=access_token,
        profile_id=profile_id,
        created_category_ids=created_category_ids,
    )


def list_owned_commercial_profiles(*, user_id):
    return query_service.list_owned_commercial_profiles(user_id=user_id)


def get_owned_commercial_profile(*, user_id, profile_id):
    return query_service.get_owned_commercial_profile(
        user_id=user_id,
        profile_id=profile_id,
    )


def get_owned_commercial_profile_with_access_token(
    *,
    access_token,
    profile_id,
):
    return query_service.get_owned_commercial_profile_with_access_token(
        access_token=access_token,
        profile_id=profile_id,
    )


def update_commercial_profile(
    *,
    user_id,
    access_token,
    profile_id,
    payload,
):
    return update_service.update_commercial_profile(
        get_user_client=get_supabase_user_client,
        get_owned_profile=get_owned_commercial_profile,
        get_profile_with_token=(
            get_owned_commercial_profile_with_access_token
        ),
        validate_merged_payload=_validate_merged_profile_payload,
        replace_categories=replace_commercial_profile_categories,
        replace_modalities=_replace_commercial_profile_modalities,
        replace_hours=_replace_commercial_profile_hours,
        replace_social_links=(
            _replace_commercial_profile_social_links
        ),
        user_id=user_id,
        access_token=access_token,
        profile_id=profile_id,
        payload=payload,
    )


def _write_profile_audit_event(**kwargs):
    return publication_service.write_profile_audit_event(**kwargs)


def update_commercial_profile_publication(
    *,
    user_id,
    access_token,
    profile_id,
    publication_status,
    reason_code=None,
    reason_text=None,
):
    return publication_service.update_commercial_profile_publication(
        get_user_client=get_supabase_user_client,
        require_profile_owner=require_commercial_profile_owner,
        get_profile_with_token=(
            get_owned_commercial_profile_with_access_token
        ),
        write_audit_event=_write_profile_audit_event,
        user_id=user_id,
        access_token=access_token,
        profile_id=profile_id,
        publication_status=publication_status,
        reason_code=reason_code,
        reason_text=reason_text,
    )


def _attach_commercial_logo_url(*, profile):
    return relation_service.attach_commercial_logo_url(profile=profile)


def _attach_profile_relations(*, profile):
    return relation_service.attach_profile_relations(profile=profile)


def _validate_merged_profile_payload(
    *,
    user_id,
    profile_id,
    merged_profile,
):
    return validation_service.validate_merged_profile_payload(
        user_id=user_id,
        profile_id=profile_id,
        merged_profile=merged_profile,
        validate_categories=validate_commercial_categories,
    )


def _replace_commercial_profile_modalities(
    *,
    user_id,
    access_token,
    profile_id,
    modalities,
):
    del user_id
    return update_service.replace_commercial_profile_modalities(
        get_user_client=get_supabase_user_client,
        access_token=access_token,
        profile_id=profile_id,
        modalities=modalities,
    )


def _replace_commercial_profile_social_links(
    *,
    user_id,
    access_token,
    profile_id,
    social_links,
):
    del user_id
    return update_service.replace_commercial_profile_social_links(
        get_user_client=get_supabase_user_client,
        access_token=access_token,
        profile_id=profile_id,
        social_links=social_links,
    )


def _replace_commercial_profile_hours(
    *,
    user_id,
    access_token,
    profile_id,
    hours,
):
    del user_id
    return update_service.replace_commercial_profile_hours(
        get_user_client=get_supabase_user_client,
        access_token=access_token,
        profile_id=profile_id,
        hours=hours,
    )


def _attach_profile_relations_with_access_token(
    *,
    access_token,
    profile,
):
    return relation_service.attach_profile_relations_with_access_token(
        access_token=access_token,
        profile=profile,
    )
