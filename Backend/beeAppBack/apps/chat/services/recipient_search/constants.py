PRIVATE_PROFILE_COLUMNS = (
    "id,first_name,last_name,email,normalized_phone,is_public"
)

COMMERCIAL_PROFILE_COLUMNS = (
    "id,owner_id,display_name,phone_dial_code,phone_number,"
    "public_email,logo_file_id,is_public,is_available,"
    "is_phone_public,is_email_public"
)

CHAT_IDENTITY_COLUMNS = (
    "id,owner_id,identity_type,profile_id,"
    "commercial_profile_id,is_active"
)

MAX_SEARCH_LIMIT = 20
PHONE_SUFFIX_MIN_LENGTH = 4
POSTGREST_SEARCH_ALLOWED_PUNCTUATION = frozenset(
    {"@", ".", "-", "_", "%", chr(39)}
)
