ACCOUNT_COLOR_PALETTE = (
    "#6025D2",
    "#2563EB",
    "#0891B2",
    "#059669",
    "#65A30D",
    "#CA8A04",
    "#EA580C",
    "#DC2626",
    "#DB2777",
    "#9333EA",
    "#475569",
)

CALENDAR_INTEGRATION_COLUMNS = (
    "id,user_id,provider,provider_account_id,provider_email,"
    "provider_display_name,granted_scopes,token_expires_at,status,"
    "connected_at,last_successful_sync_at,last_attempted_sync_at,"
    "next_sync_at,reauth_required_at,disconnected_at,"
    "last_error_code,last_error_message,metadata,created_at,"
    "updated_at,integration_connection_id"
)

EXTERNAL_CALENDAR_COLUMNS = (
    "id,integration_id,provider_calendar_id,name,description,"
    "timezone,provider_color,display_color,access_level,"
    "is_primary,is_selected,is_visible,sync_cursor,"
    "last_successful_sync_at,last_attempted_sync_at,metadata,"
    "created_at,updated_at"
)

BEEAPP_CALENDAR_COLUMNS = (
    "id,owner_id,name,description,color,visibility,is_default,"
    "is_archived,timezone,created_at,updated_at"
)
