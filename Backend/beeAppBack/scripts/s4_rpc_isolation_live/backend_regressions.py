import urllib.parse
import uuid

from http_client import backend_get, request


def items(value, key):
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        found = value.get(key)
        return found if isinstance(found, list) else []
    return []


def verify_backend_regressions(runtime_config, accounts, reporter):
    for label, account in zip(("A", "B"), accounts):
        _verify_backend_notes(runtime_config, label, account, reporter)
        _verify_backend_note_search(runtime_config, label, account, reporter)
        _verify_backend_notifications(runtime_config, label, account, reporter)
        _verify_backend_chat_bootstrap(runtime_config, label, account, reporter)


def verify_temporary_note_isolation(runtime_config, accounts, reporter):
    account_a, account_b = accounts
    api_base = runtime_config["api_base"]
    temporary_note_id = None
    try:
        temporary_note_id = _create_owned_temporary_note(
            api_base,
            account_b,
            reporter,
        )
        _verify_temporary_note_isolation(
            api_base,
            account_a,
            account_b,
            temporary_note_id,
            reporter,
        )
    finally:
        _delete_owned_temporary_note(
            api_base,
            account_b,
            temporary_note_id,
            reporter,
        )


def _verify_backend_notes(runtime_config, label, account, reporter):
    status, note_page = backend_get(
        runtime_config["api_base"],
        account["backend_token"],
        "/notes/?limit=10",
    )
    note_rows = items(note_page, "notes")
    reporter.check(
        f"backend notas propias {label}",
        status == 200
        and isinstance(note_page, dict)
        and isinstance(note_page.get("notes"), list)
        and all(
            isinstance(row, dict)
            and row.get("owner_id") == account["id"]
            for row in note_rows
        ),
        f"HTTP {status}; filas={len(note_rows)}",
    )
    account["backend_notes"] = note_rows


def _verify_backend_note_search(runtime_config, label, account, reporter):
    status, search_page = backend_get(
        runtime_config["api_base"],
        account["backend_token"],
        "/notes/?search=s4&limit=10",
    )
    search_rows = items(search_page, "notes")
    reporter.check(
        f"backend búsqueda propia {label}",
        status == 200
        and isinstance(search_page, dict)
        and isinstance(search_page.get("notes"), list)
        and all(
            isinstance(row, dict)
            and row.get("owner_id") == account["id"]
            for row in search_rows
        ),
        f"HTTP {status}; filas={len(search_rows)}",
    )


def _verify_backend_notifications(runtime_config, label, account, reporter):
    status, notification_page = backend_get(
        runtime_config["api_base"],
        account["backend_token"],
        "/notifications/?module=chat&limit=10",
    )
    notifications = items(notification_page, "notifications")
    reporter.check(
        f"backend notificaciones propias {label}",
        status == 200
        and isinstance(notification_page, dict)
        and isinstance(notification_page.get("notifications"), list),
        f"HTTP {status}; filas={len(notifications)}",
    )

def _verify_backend_chat_bootstrap(runtime_config, label, account, reporter):
    status, bootstrap = request(
        "POST",
        runtime_config["api_base"] + "/chat/bootstrap/",
        {
            "Authorization": f"Bearer {account['backend_token']}",
            "Content-Type": "application/json",
        },
        {},
    )
    reporter.check(
        f"backend bootstrap chat {label}",
        status == 200
        and isinstance(bootstrap, dict)
        and isinstance(bootstrap.get("identities"), list)
        and len(bootstrap["identities"]) > 0,
        f"HTTP {status}; identidades="
        f"{len(items(bootstrap, 'identities'))}",
    )


def _create_owned_temporary_note(api_base, account, reporter):
    test_title = "s4-isolation-" + uuid.uuid4().hex
    status, created = request(
        "POST",
        api_base + "/notes/",
        {
            "Authorization": f"Bearer {account['backend_token']}",
            "Content-Type": "application/json",
        },
        {"title": test_title},
    )
    note = created.get("note") if isinstance(created, dict) else None
    temporary_note_id = (
        note.get("id")
        if isinstance(note, dict)
        and note.get("owner_id") == account["id"]
        else None
    )
    reporter.check(
        "crear nota temporal propia B",
        status == 201 and bool(temporary_note_id),
        f"HTTP {status}; id_presente={bool(temporary_note_id)}",
    )
    if temporary_note_id:
        _verify_temporary_note_search(
            api_base,
            account,
            test_title,
            temporary_note_id,
            reporter,
        )
    return temporary_note_id


def _verify_temporary_note_search(
    api_base,
    account,
    test_title,
    temporary_note_id,
    reporter,
):
    status, search_result = backend_get(
        api_base,
        account["backend_token"],
        "/notes/?search="
        + urllib.parse.quote(test_title)
        + "&limit=10",
    )
    reporter.check(
        "búsqueda real nota temporal B",
        status == 200
        and any(
            isinstance(row, dict)
            and row.get("id") == temporary_note_id
            and row.get("owner_id") == account["id"]
            for row in items(search_result, "notes")
        ),
        f"HTTP {status}",
    )


def _verify_temporary_note_isolation(
    api_base,
    account_a,
    account_b,
    temporary_note_id,
    reporter,
):
    reporter.check(
        "precondición nota real B",
        temporary_note_id is not None,
        (
            "B tiene nota propia"
            if temporary_note_id
            else "B no tiene nota: acceso cruzado no verificable"
        ),
    )
    if not temporary_note_id:
        return

    status, own_detail = backend_get(
        api_base,
        account_b["backend_token"],
        f"/notes/{temporary_note_id}/",
    )
    reporter.check(
        "backend lectura nota propia B",
        status == 200
        and isinstance(own_detail, dict)
        and isinstance(own_detail.get("note"), dict)
        and own_detail["note"].get("owner_id") == account_b["id"],
        f"HTTP {status}",
    )
    status, _ = backend_get(
        api_base,
        account_a["backend_token"],
        f"/notes/{temporary_note_id}/",
    )
    reporter.check("backend nota ajena A", status == 404, f"HTTP {status}")
    status, _ = backend_get(
        api_base,
        account_a["backend_token"],
        f"/notes/{temporary_note_id}/attachments/",
    )
    reporter.check(
        "backend adjuntos nota ajena A",
        status == 404,
        f"HTTP {status}",
    )


def _delete_owned_temporary_note(
    api_base,
    account,
    temporary_note_id,
    reporter,
):
    if not temporary_note_id:
        return

    own_note_url = api_base + f"/notes/{temporary_note_id}/"
    own_headers = {"Authorization": f"Bearer {account['backend_token']}"}
    trash_status, _ = request(
        "POST",
        own_note_url + "trash/",
        own_headers,
        {},
    )
    reporter.check(
        "enviar solo nota temporal B a papelera",
        trash_status == 200,
        f"HTTP {trash_status}",
    )
    if trash_status != 200:
        return

    delete_status, _ = request("DELETE", own_note_url, own_headers)
    reporter.check(
        "eliminar solo nota temporal B",
        delete_status == 204,
        f"HTTP {delete_status}",
    )
    if delete_status != 204:
        return

    verify_status, _ = backend_get(
        api_base,
        account["backend_token"],
        f"/notes/{temporary_note_id}/",
    )
    reporter.check(
        "verificar ausencia nota temporal B",
        verify_status == 404,
        f"HTTP {verify_status}",
    )
