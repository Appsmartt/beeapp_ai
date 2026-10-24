COMMERCIAL_OFFER_COLUMNS = (
    "id,commercial_profile_id,catalog_id,offer_kind,title,"
    "description,pricing_strategy,base_price_amount,currency_code,"
    "is_available,sort_order,status,archived_at,track_inventory,"
    "stock_quantity,duration_minutes,requires_booking,payment_policy,"
    "created_at,updated_at"
)

COMMERCIAL_OFFER_MODALITY_COLUMNS = (
    "id,commercial_offer_id,modality,status,archived_at,created_at,"
    "updated_at"
)

COMMERCIAL_OFFER_IMAGE_COLUMNS = (
    "id,commercial_offer_id,file_id,sort_order,is_primary,status,"
    "archived_at,created_at,updated_at"
)

MAX_COMMERCIAL_OFFER_ACTIVE_IMAGES = 5
