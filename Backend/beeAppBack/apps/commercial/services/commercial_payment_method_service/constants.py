PAYMENT_METHOD_UPSERT_RPC = (
    "commerce_upsert_owned_payment_method"
)

MOBILE_PAYMENT_METHOD_TYPES = frozenset(
    {"nequi", "daviplata", "breb"}
)

COMMERCIAL_PAYMENT_METHOD_COLUMNS = (
    "id,commercial_profile_id,payment_method_type,display_name,"
    "sort_order,status,archived_at,created_at,updated_at,"
    "commercial_mobile_payment_accounts("
    "wallet_type,payment_key,account_holder_name"
    "),"
    "commercial_bank_accounts("
    "account_holder_name,"
    "account_holder_document_type,"
    "account_holder_document_number,"
    "bank_name,"
    "account_type,"
    "account_number"
    ")"
)
