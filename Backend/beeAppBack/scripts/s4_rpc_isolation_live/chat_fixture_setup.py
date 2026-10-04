from http_client import request


def sync_profile_identity(runtime_config, account, label, reporter):
    status, response = request(
        "POST",
        runtime_config["api_base"] + "/chat/bootstrap/",
        {
            "Authorization": f"Bearer {account['backend_token']}",
            "Content-Type": "application/json",
        },
        {},
    )
    identities = (
        response.get("identities", [])
        if isinstance(response, dict) else []
    )
    identity = next(
        (
            row
            for row in identities
            if isinstance(row, dict)
            and row.get("identity_type") == "profile"
            and row.get("is_active") is True
            and str(row.get("profile_id")) == str(account["id"])
            and row.get("id")
        ),
        None,
    )
    reporter.check(
        f"fixture identidad profile {label}",
        status == 200 and identity is not None,
        f"HTTP {status}; identidad_presente={identity is not None}",
    )
    return identity.get("id") if identity else None


def create_or_get_direct_conversation(
    runtime_config,
    account_a,
    identity_a,
    identity_b,
    reporter,
):
    status, response = request(
        "POST",
        runtime_config["api_base"] + "/chat/direct-conversations/",
        {
            "Authorization": f"Bearer {account_a['backend_token']}",
            "Content-Type": "application/json",
        },
        {
            "sender_identity_id": identity_a,
            "recipient_identity_id": identity_b,
        },
    )
    conversation = (
        response.get("conversation")
        if isinstance(response, dict) else None
    )
    conversation_id = (
        conversation.get("id")
        if isinstance(conversation, dict) else None
    )
    reporter.check(
        "fixture conversación directa A y B",
        status in (200, 201) and bool(conversation_id),
        f"HTTP {status}; id_presente={bool(conversation_id)}",
    )
    return conversation_id


def set_fixture_notification_preferences(
    runtime_config,
    accounts,
    fixture,
    reporter,
):
    account_a, account_b = accounts
    pairs = (
        ("A", account_a, fixture["identity_a"], False),
        ("B", account_b, fixture["identity_b"], True),
    )
    for label, account, identity_id, enabled in pairs:
        status, _ = request(
            "PATCH",
            runtime_config["api_base"]
            + f"/chat/conversations/{fixture['conversation_id']}/notifications/",
            {
                "Authorization": f"Bearer {account['backend_token']}",
                "Content-Type": "application/json",
            },
            {
                "identity_id": identity_id,
                "notifications_enabled": enabled,
            },
        )
        reporter.check(
            f"fixture preferencias notificación {label}",
            status == 200,
            f"HTTP {status}; habilitadas={enabled}",
        )


def clear_fixture_for_owners(runtime_config, accounts, fixture, reporter):
    conversation_id = fixture.get("conversation_id")
    if not conversation_id:
        return

    for label, account, identity_key in (
        ("A", accounts[0], "identity_a"),
        ("B", accounts[1], "identity_b"),
    ):
        identity_id = fixture.get(identity_key)
        if not identity_id:
            continue
        status, _ = request(
            "DELETE",
            runtime_config["api_base"]
            + f"/chat/conversations/{conversation_id}/clear/",
            {
                "Authorization": f"Bearer {account['backend_token']}",
                "Content-Type": "application/json",
            },
            {"identity_id": identity_id},
        )
        reporter.check(
            f"fixture limpieza conversación {label}",
            status == 204,
            f"HTTP {status}",
        )
