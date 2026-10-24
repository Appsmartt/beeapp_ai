from __future__ import annotations

COMMERCIAL_CATEGORY_COLUMNS = (
    "id,parent_id,offer_type,name,slug,is_active,sort_order,"
    "created_at,updated_at"
)

COMMERCIAL_PROFILE_COLUMNS = (
    "id,owner_id,offer_type,category_id,custom_activity_text,"
    "display_name,description,country_code,city,address,"
    "neighborhood,location_reference,is_address_public,"
    "phone_dial_code,phone_number,is_phone_public,"
    "public_email,is_email_public,logo_file_id,is_public,"
    "is_available,publication_status,verification_status,"
    "verification_badge_visible,timezone,booking_hold_minutes,"
    "delivery_fee_mode,delivery_fee_amount,delivery_currency_code,"
    "archived_at,suspended_at,suspension_reason,"
    "inventory_hold_minutes,cash_on_delivery_enabled,created_at,updated_at"
)

PRIVATE_COMMERCIAL_PROFILE_COLUMNS = COMMERCIAL_PROFILE_COLUMNS

COMMERCIAL_MODALITY_COLUMNS = (
    "id,commercial_profile_id,modality,created_at"
)

COMMERCIAL_HOUR_COLUMNS = (
    "id,commercial_profile_id,day_of_week,opens_at,closes_at,"
    "is_closed,created_at,updated_at"
)

COMMERCIAL_PROFILE_CATEGORY_COLUMNS = (
    "commercial_profile_id,commercial_category_id,sort_order"
)

COMMERCIAL_PROFILE_SOCIAL_LINK_COLUMNS = (
    "id,commercial_profile_id,platform,url,created_at,updated_at"
)
