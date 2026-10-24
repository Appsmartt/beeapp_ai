import uuid

from chat_fixture_assertions import (
    verify_conversation_rpc_isolation,
    verify_foreign_identity_rejected,
    verify_identity_rpc_isolation,
    verify_message_visibility,
    verify_notification_isolation,
)
from chat_fixture_setup import (
    clear_fixture_for_owners,
    create_or_get_direct_conversation,
    set_fixture_notification_preferences,
    sync_profile_identity,
)
from http_client import request


def verify_autonomous_chat_fixture(runtime_config, accounts, reporter):
    account_a, account_b = accounts
    fixture = {
        "conversation_id": None,
        "identity_a": None,
        "identity_b": None,
    }
    try:
        fixture["identity_a"] = sync_profile_identity(
            runtime_config,
            account_a,
            "A",
            reporter,
        )
        fixture["identity_b"] = sync_profile_identity(
            runtime_config,
            account_b,
            "B",
            reporter,
        )
        if not fixture["identity_a"] or not fixture["identity_b"]:
            return

        fixture["conversation_id"] = create_or_get_direct_conversation(
            runtime_config,
            account_a,
            fixture["identity_a"],
            fixture["identity_b"],
            reporter,
        )
        if not fixture["conversation_id"]:
            return

        verify_foreign_identity_rejected(
            runtime_config,
            account_a,
            fixture["identity_a"],
            fixture["identity_b"],
            reporter,
        )
        verify_identity_rpc_isolation(
            runtime_config,
            account_a,
            account_b,
            fixture,
            reporter,
        )
        verify_conversation_rpc_isolation(
            runtime_config,
            account_a,
            account_b,
            fixture,
            reporter,
        )
        set_fixture_notification_preferences(
            runtime_config,
            accounts,
            fixture,
            reporter,
        )
        marker = _send_fixture_message(
            runtime_config,
            account_a,
            fixture,
            reporter,
        )
        if not marker:
            return

        verify_message_visibility(
            runtime_config,
            accounts,
            fixture["conversation_id"],
            marker,
            reporter,
        )
        verify_notification_isolation(
            runtime_config,
            accounts,
            marker,
            reporter,
        )
    finally:
        clear_fixture_for_owners(
            runtime_config,
            accounts,
            fixture,
            reporter,
        )


def _send_fixture_message(runtime_config, account_a, fixture, reporter):
    marker = "s4-fixture-" + uuid.uuid4().hex
    status, response = request(
        "POST",
        runtime_config["api_base"]
        + f"/chat/conversations/{fixture['conversation_id']}/messages/",
        {
            "Authorization": f"Bearer {account_a['backend_token']}",
            "Content-Type": "application/json",
        },
        {
            "sender_identity_id": fixture["identity_a"],
            "message_type": "text",
            "body": marker,
            "metadata": {},
        },
    )
    message = response.get("message") if isinstance(response, dict) else None
    reporter.check(
        "fixture mensaje temporal A a B",
        status == 201
        and isinstance(message, dict)
        and message.get("body") == marker,
        f"HTTP {status}; mensaje_presente={isinstance(message, dict)}",
    )
    return marker if status == 201 and isinstance(message, dict) else None
