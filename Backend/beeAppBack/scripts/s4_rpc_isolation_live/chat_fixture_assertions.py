import time

from http_client import backend_get, request, rpc


def verify_foreign_identity_rejected(
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
            "sender_identity_id": identity_b,
            "recipient_identity_id": identity_a,
        },
    )
    reporter.check(
        "fixture identidad ajena rechazada",
        status in (400, 403),
        f"HTTP {status}",
    )


def verify_identity_rpc_isolation(
    runtime_config,
    account_a,
    account_b,
    fixture,
    reporter,
):
    status, value = rpc(
        runtime_config["supabase_url"],
        runtime_config["anon_key"],
        account_a["token"],
        "chat_identity_belongs_to_user",
        {
            "p_identity_id": fixture["identity_b"],
            "p_user_id": account_b["id"],
        },
    )
    reporter.check(
        "fixture RPC identidad ajena",
        status == 200 and value is False,
        f"HTTP {status}; resultado={value}",
    )

    status, value = rpc(
        runtime_config["supabase_url"],
        runtime_config["anon_key"],
        account_b["token"],
        "chat_identity_belongs_to_user",
        {
            "p_identity_id": fixture["identity_b"],
            "p_user_id": account_b["id"],
        },
    )
    reporter.check(
        "fixture RPC identidad propia B",
        status == 200 and value is True,
        f"HTTP {status}; resultado={value}",
    )


def verify_conversation_rpc_isolation(
    runtime_config,
    account_a,
    account_b,
    fixture,
    reporter,
):
    probes = (
        (
            "chat_user_can_view_conversation",
            {
                "p_conversation_id": fixture["conversation_id"],
                "p_user_id": account_b["id"],
            },
        ),
        (
            "chat_user_can_act_in_conversation",
            {
                "p_conversation_id": fixture["conversation_id"],
                "p_identity_id": fixture["identity_b"],
                "p_user_id": account_b["id"],
            },
        ),
        (
            "chat_user_can_manage_group",
            {
                "p_conversation_id": fixture["conversation_id"],
                "p_user_id": account_b["id"],
            },
        ),
    )
    for name, payload in probes:
        status, value = rpc(
            runtime_config["supabase_url"],
            runtime_config["anon_key"],
            account_a["token"],
            name,
            payload,
        )
        reporter.check(
            f"fixture RPC conversación ajena {name}",
            status == 200 and value in (False, None),
            f"HTTP {status}; resultado={value}",
        )

    status, value = rpc(
        runtime_config["supabase_url"],
        runtime_config["anon_key"],
        account_b["token"],
        "chat_user_can_view_conversation",
        {
            "p_conversation_id": fixture["conversation_id"],
            "p_user_id": account_b["id"],
        },
    )
    reporter.check(
        "fixture RPC conversación propia B",
        status == 200 and value is True,
        f"HTTP {status}; resultado={value}",
    )


def verify_message_visibility(
    runtime_config,
    accounts,
    conversation_id,
    marker,
    reporter,
):
    for label, account in zip(("A", "B"), accounts):
        status, response = backend_get(
            runtime_config["api_base"],
            account["backend_token"],
            f"/chat/conversations/{conversation_id}/messages/?limit=20",
        )
        messages = (
            response.get("messages", [])
            if isinstance(response, dict) else []
        )
        found = any(
            isinstance(row, dict) and row.get("body") == marker
            for row in messages
        )
        reporter.check(
            f"fixture mensaje visible {label}",
            status == 200 and found,
            f"HTTP {status}; marcador_visible={found}",
        )


def verify_notification_isolation(
    runtime_config,
    accounts,
    marker,
    reporter,
):
    _verify_sender_does_not_receive_notification(
        runtime_config,
        accounts[0],
        marker,
        reporter,
    )
    _verify_recipient_receives_notification(
        runtime_config,
        accounts[1],
        marker,
        reporter,
    )


def _verify_sender_does_not_receive_notification(
    runtime_config,
    account,
    marker,
    reporter,
):
    status, notifications = _load_chat_notifications(
        runtime_config,
        account,
    )
    marker_visible = _contains_notification_marker(notifications, marker)
    reporter.check(
        "fixture notificación aislada A",
        status == 200 and marker_visible is False,
        f"HTTP {status}; marcador_visible={marker_visible}",
    )


def _verify_recipient_receives_notification(
    runtime_config,
    account,
    marker,
    reporter,
):
    attempts = 5
    status = 0
    notifications = []
    marker_visible = False
    for attempt in range(1, attempts + 1):
        status, notifications = _load_chat_notifications(
            runtime_config,
            account,
        )
        marker_visible = _contains_notification_marker(
            notifications,
            marker,
        )
        if status == 200 and marker_visible:
            break
        if attempt < attempts:
            time.sleep(1)

    reporter.check(
        "fixture notificación aislada B",
        status == 200 and marker_visible,
        f"HTTP {status}; marcador_visible={marker_visible}; "
        f"intentos={attempt}",
    )


def _load_chat_notifications(runtime_config, account):
    status, response = backend_get(
        runtime_config["api_base"],
        account["backend_token"],
        "/notifications/?module=chat&limit=50",
    )
    notifications = (
        response.get("notifications", [])
        if isinstance(response, dict) else []
    )
    return status, notifications


def _contains_notification_marker(notifications, marker):
    return any(
        isinstance(row, dict)
        and marker in str(row.get("body") or "")
        for row in notifications
    )
