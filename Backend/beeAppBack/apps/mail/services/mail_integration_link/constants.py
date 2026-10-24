GOOGLE_MAIL_SCOPES = (
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
)

MICROSOFT_MAIL_SCOPES = (
    "Mail.Read",
    "Mail.ReadWrite",
    "Mail.Send",
)

MAIL_INTEGRATION_COLUMNS = (
    "id,user_id,integration_connection_id,provider,"
    "provider_account_id,provider_email,provider_display_name,"
    "status,connected_at,initial_sync_completed_at,"
    "initial_sync_started_at,last_successful_sync_at,"
    "last_attempted_sync_at,next_sync_at,sync_cursor,"
    "sync_cursor_updated_at,reauth_required_at,disconnected_at,"
    "last_error_code,last_error_message,metadata,"
    "created_at,updated_at"
)

SAFE_CONNECTION_COLUMNS = (
    "id,user_id,provider,provider_account_id,"
    "provider_tenant_id,provider_email,"
    "provider_display_name,provider_avatar_url,status,"
    "granted_scopes,capabilities,token_expires_at,"
    "last_token_refresh_at,last_successful_auth_at,"
    "reauth_required_at,disconnected_at,last_error_code,"
    "last_error_message,metadata,created_at,updated_at"
)
