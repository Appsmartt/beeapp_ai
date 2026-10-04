import urllib.parse

from http_client import request, rpc


ZERO_UUID = "00000000-0000-0000-0000-000000000000"


def load_account_rls_data(runtime_config, accounts, reporter):
    supabase_url = runtime_config["supabase_url"]
    anon_key = runtime_config["anon_key"]

    for label, account in zip(("A", "B"), accounts):
        _check_blocked_sensitive_rpcs(
            label,
            account,
            accounts,
            supabase_url,
            anon_key,
            reporter,
        )
        _check_own_notes_rls(
            label,
            account,
            supabase_url,
            anon_key,
            reporter,
        )


def _check_blocked_sensitive_rpcs(
    label,
    account,
    accounts,
    supabase_url,
    anon_key,
    reporter,
):
    blocked_rpcs = (
        (
            "search_notes",
            {
                "p_user_id": accounts[0]["id"],
                "p_search": "s4",
            },
        ),
        (
            "attach_file_to_note",
            {
                "p_user_id": accounts[0]["id"],
                "p_note_id": ZERO_UUID,
                "p_file_id": ZERO_UUID,
            },
        ),
        (
            "create_chat_in_app_notification",
            {
                "p_message_id": ZERO_UUID,
                "p_conversation_id": ZERO_UUID,
                "p_recipient_identity_id": ZERO_UUID,
                "p_recipient_user_id": accounts[0]["id"],
            },
        ),
        (
            "chat_identity_owner_id",
            {
                "p_identity_id": ZERO_UUID,
            },
        ),
    )
    for name, payload in blocked_rpcs:
        status, _ = rpc(
            supabase_url,
            anon_key,
            account["token"],
            name,
            payload,
        )
        reporter.check(
            f"RPC bloqueada {label}: {name}",
            status in (401, 403, 404),
            f"HTTP {status}",
        )


def _check_own_notes_rls(
    label,
    account,
    supabase_url,
    anon_key,
    reporter,
):
    own_notes_url = (
        supabase_url
        + "/rest/v1/notes?select=id&owner_id=eq."
        + urllib.parse.quote(account["id"], safe="")
        + "&limit=1"
    )
    status, notes = request(
        "GET",
        own_notes_url,
        {
            "apikey": anon_key,
            "Authorization": f"Bearer {account['token']}",
        },
    )
    reporter.check(
        f"RLS notas propias {label}",
        status == 200 and isinstance(notes, list),
        f"HTTP {status}",
    )
