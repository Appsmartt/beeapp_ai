from __future__ import annotations

CHAT_GROUP_POSTING_POLICIES = {
    "all_members",
    "admins_only",
}

CHAT_MANAGEABLE_PARTICIPANT_ROLES = {
    "admin",
    "member",
}

CONVERSATION_COLUMNS = (
    "id,conversation_type,direct_key,created_by_identity_id,"
    "posting_identity_id,posting_policy,name,description,image_file_id,"
    "last_message_id,last_message_at,is_active,"
    "created_at,updated_at"
)

INVITE_COLUMNS = (
    "id,conversation_id,invited_identity_id,"
    "invited_by_identity_id,status,responded_at,expires_at,"
    "created_at,updated_at"
)

FILE_COLUMNS = (
    "id,owner_id,bucket_id,storage_path,original_name,"
    "display_name,mime_type,kind,size_bytes,status,"
    "trashed_at,created_at,updated_at"
)
