import json
import uuid
from urllib.parse import quote

from .auth_helpers import json_request
from .http_client import parse_json, request
from .runtime_config import BACKEND_URL


def assert_status(status, expected, label):
    if status not in expected:
        raise RuntimeError(
            label
            + "_HTTP_"
            + str(status)
            + "_EXPECTED_"
            + "_".join(str(value) for value in expected)
        )


def create_group(owner_token, owner_identity_id, label):
    status, payload = json_request(
        "POST",
        "/api/chat/groups/",
        owner_token,
        {
            "creator_identity_id": owner_identity_id,
            "name": "S12 " + label + " " + uuid.uuid4().hex[:12],
            "posting_policy": "all_members",
            "description": "Temporary S12 exhaustive security test.",
        },
    )

    assert_status(status, (201,), "GROUP_CREATE_FAILED")

    conversation = payload.get("conversation") if isinstance(
        payload,
        dict,
    ) else None

    if not isinstance(conversation, dict) or not conversation.get("id"):
        raise RuntimeError("GROUP_CREATE_RESPONSE_INVALID")

    return str(conversation["id"])


def invite_and_accept(
    owner_token,
    member_token,
    conversation_id,
    owner_identity_id,
    member_identity_id,
):
    status, payload = json_request(
        "POST",
        "/api/chat/groups/"
        + quote(conversation_id, safe="")
        + "/invites/",
        owner_token,
        {
            "actor_identity_id": owner_identity_id,
            "invited_identity_id": member_identity_id,
        },
    )

    assert_status(status, (201,), "GROUP_INVITE_FAILED")

    invite = payload.get("invite") if isinstance(payload, dict) else None
    if not isinstance(invite, dict) or not invite.get("id"):
        raise RuntimeError("GROUP_INVITE_RESPONSE_INVALID")

    status, payload = json_request(
        "POST",
        "/api/chat/group-invites/"
        + quote(str(invite["id"]), safe="")
        + "/response/",
        member_token,
        {"accept": True},
    )

    if (
        status != 200
        or not isinstance(payload, dict)
        or payload.get("accepted") is not True
    ):
        raise RuntimeError(
            "GROUP_INVITE_ACCEPT_FAILED_HTTP_" + str(status)
        )


def upload_chat_attachment(
    owner_token,
    conversation_id,
    owner_identity_id,
    label,
):
    marker = uuid.uuid4().hex
    boundary = "beeapp-s12-" + marker
    filename = "s12-" + label + "-" + marker + ".txt"
    content = (
        "BeeApp S12 exhaustive security test "
        + marker
        + "\n"
    ).encode("utf-8")

    fields = [
        ("sender_identity_id", owner_identity_id),
        ("message_type", "document"),
        ("body", "S12 " + label + " attachment"),
        (
            "metadata",
            json.dumps(
                {
                    "s12_test": True,
                    "scenario": label,
                    "marker": marker,
                },
                separators=(",", ":"),
            ),
        ),
    ]

    parts = []
    for name, value in fields:
        parts.extend(
            [
                ("--" + boundary + "\r\n").encode("utf-8"),
                (
                    'Content-Disposition: form-data; name="'
                    + name
                    + '"\r\n\r\n'
                ).encode("utf-8"),
                str(value).encode("utf-8"),
                b"\r\n",
            ]
        )

    parts.extend(
        [
            ("--" + boundary + "\r\n").encode("utf-8"),
            (
                'Content-Disposition: form-data; name="file"; '
                'filename="'
                + filename
                + '"\r\n'
            ).encode("utf-8"),
            b"Content-Type: text/plain\r\n\r\n",
            content,
            b"\r\n",
            ("--" + boundary + "--\r\n").encode("utf-8"),
        ]
    )

    status, raw = request(
        "POST",
        BACKEND_URL
        + "/api/chat/conversations/"
        + quote(conversation_id, safe="")
        + "/attachments/",
        token=owner_token,
        headers={
            "Content-Type": (
                "multipart/form-data; boundary=" + boundary
            )
        },
        body=b"".join(parts),
    )

    try:
        payload = parse_json(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        payload = None

    assert_status(status, (201,), "ATTACHMENT_UPLOAD_FAILED")

    message = payload.get("message") if isinstance(payload, dict) else None
    file_record = payload.get("file") if isinstance(payload, dict) else None

    if not isinstance(message, dict) or not isinstance(
        file_record,
        dict,
    ):
        raise RuntimeError("ATTACHMENT_UPLOAD_RESPONSE_INVALID")

    message_id = str(message.get("id") or "").strip()
    file_id = str(file_record.get("id") or "").strip()

    if not message_id or not file_id:
        raise RuntimeError("ATTACHMENT_IDENTIFIERS_MISSING")

    return message_id, file_id


def get_share_rows(
    supabase_url,
    public_key,
    token,
    file_id,
    recipient_user_id,
):
    endpoint = (
        supabase_url
        + "/rest/v1/file_shares?select="
        + quote(
            (
                "id,file_id,shared_by_user_id,shared_with_user_id,"
                "revoked_at,share_source,source_conversation_id,"
                "source_message_id"
            ),
            safe=",",
        )
        + "&file_id=eq."
        + quote(file_id, safe="")
        + "&shared_with_user_id=eq."
        + quote(recipient_user_id, safe="")
    )

    status, raw = request(
        "GET",
        endpoint,
        token=token,
        api_key=public_key,
    )

    try:
        rows = parse_json(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        rows = None

    if status != 200 or not isinstance(rows, list):
        raise RuntimeError(
            "FILE_SHARE_QUERY_FAILED_HTTP_" + str(status)
        )

    return rows


def assert_chat_share(
    rows,
    conversation_id,
    message_id,
    expected_revoked,
):
    matches = [
        row
        for row in rows
        if (
            isinstance(row, dict)
            and row.get("share_source") == "chat_attachment"
            and str(row.get("source_conversation_id") or "")
            == conversation_id
            and str(row.get("source_message_id") or "")
            == message_id
        )
    ]

    if len(matches) != 1:
        raise RuntimeError("CHAT_SHARE_NOT_UNIQUELY_IDENTIFIED")

    revoked_at = matches[0].get("revoked_at")
    if expected_revoked and not revoked_at:
        raise RuntimeError("CHAT_SHARE_NOT_REVOKED")
    if not expected_revoked and revoked_at:
        raise RuntimeError("CHAT_SHARE_UNEXPECTEDLY_REVOKED")


def assert_file_rest_access(
    supabase_url,
    public_key,
    token,
    file_id,
    expected_access,
):
    endpoint = (
        supabase_url
        + "/rest/v1/files?select=id&id=eq."
        + quote(file_id, safe="")
    )

    status, raw = request(
        "GET",
        endpoint,
        token=token,
        api_key=public_key,
    )

    try:
        rows = parse_json(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        rows = None

    if status != 200 or not isinstance(rows, list):
        raise RuntimeError(
            "FILES_REST_QUERY_FAILED_HTTP_" + str(status)
        )

    has_access = len(rows) == 1
    if has_access != expected_access:
        raise RuntimeError(
            "FILES_REST_ACCESS_EXPECTATION_FAILED_"
            + ("EXPECTED_ACCESS" if expected_access else "EXPECTED_DENIAL")
        )


def assert_storage_access(
    token,
    file_id,
    expected_access,
):
    status, _ = json_request(
        "GET",
        "/api/storage/files/"
        + quote(file_id, safe="")
        + "/access/?download=false",
        token,
    )

    if expected_access:
        assert_status(status, (200,), "STORAGE_ACCESS_FAILED")
    else:
        assert_status(
            status,
            (400, 404),
            "STORAGE_ACCESS_NOT_DENIED",
        )


def assert_chat_attachment_access(
    token,
    message_id,
    identity_id,
    expected_access,
):
    status, _ = json_request(
        "GET",
        "/api/chat/messages/"
        + quote(message_id, safe="")
        + "/attachment/access/?identity_id="
        + quote(identity_id, safe="")
        + "&download=false",
        token,
    )

    if expected_access:
        assert_status(status, (200,), "CHAT_ACCESS_FAILED")
    else:
        assert_status(
            status,
            (403, 404),
            "CHAT_ACCESS_NOT_DENIED",
        )


def leave_group(member_token, conversation_id, member_identity_id):
    status, _ = json_request(
        "POST",
        "/api/chat/groups/"
        + quote(conversation_id, safe="")
        + "/leave/",
        member_token,
        {"identity_id": member_identity_id},
    )
    assert_status(status, (204,), "GROUP_LEAVE_FAILED")


def remove_member(
    owner_token,
    conversation_id,
    owner_identity_id,
    member_identity_id,
):
    status, _ = json_request(
        "DELETE",
        "/api/chat/groups/"
        + quote(conversation_id, safe="")
        + "/participants/"
        + quote(member_identity_id, safe="")
        + "/",
        owner_token,
        {"actor_identity_id": owner_identity_id},
    )
    assert_status(status, (204,), "GROUP_REMOVAL_FAILED")
