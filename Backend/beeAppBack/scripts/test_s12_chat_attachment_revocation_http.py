#!/usr/bin/env python3
import getpass
import json
import os
import re
import subprocess
import sys
import uuid
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[3]
FRONT_ENV = ROOT / "Fronted/apps/mobile/.env"
REPORT_DIR = ROOT / ".beeapp-work"
PROJECT_REF = "elwnmmznlqihruveqlye"
TIMEOUT = 40


def frontend_config():
    if not FRONT_ENV.is_file():
        raise RuntimeError("FRONTEND_ENV_NOT_FOUND")

    values = {}
    pattern = re.compile(
        r"^\s*(?:export\s+)?"
        r"(EXPO_PUBLIC_SUPABASE_URL|EXPO_PUBLIC_SUPABASE_ANON_KEY)"
        r"\s*=\s*(.*?)\s*$"
    )

    for raw in FRONT_ENV.read_text(encoding="utf-8").splitlines():
        match = pattern.match(raw)
        if not match:
            continue

        value = match.group(2).strip()
        if (
            len(value) >= 2
            and value[0] == value[-1]
            and value[0] in ("'", '"')
        ):
            value = value[1:-1]

        values[match.group(1)] = value

    supabase_url = values.get(
        "EXPO_PUBLIC_SUPABASE_URL",
        "",
    ).rstrip("/")
    public_key = values.get(
        "EXPO_PUBLIC_SUPABASE_ANON_KEY",
        "",
    )

    if (
        not supabase_url
        or not public_key
        or PROJECT_REF not in supabase_url
    ):
        raise RuntimeError("FRONTEND_ENV_CONFIGURATION_INVALID")

    return supabase_url, public_key


def request(method, url, token=None, key=None, body=None, headers=None):
    request_headers = {"Accept": "application/json"}

    if key:
        request_headers["apikey"] = key

    if token:
        request_headers["Authorization"] = "Bearer " + token

    if headers:
        request_headers.update(headers)

    data = None

    if body is not None:
        if isinstance(body, bytes):
            data = body
        else:
            request_headers.setdefault("Content-Type", "application/json")
            data = json.dumps(body).encode("utf-8")

    call = urllib.request.Request(
        url,
        data=data,
        headers=request_headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(call, timeout=TIMEOUT) as response:
            return response.status, response.read(262144)
    except urllib.error.HTTPError as error:
        return error.code, error.read(262144)


def parse_json(raw):
    if not raw:
        return None

    return json.loads(raw.decode("utf-8"))


def login(backend, email, password):
    status, raw = request(
        "POST",
        backend + "/api/accounts/login/",
        body={"email": email, "password": password},
    )

    payload = parse_json(raw)

    if status != 200 or not isinstance(payload, dict):
        raise RuntimeError("LOGIN_FAILED_HTTP_" + str(status))

    session = payload.get("session")
    user = payload.get("user")

    if not isinstance(session, dict) or not isinstance(user, dict):
        raise RuntimeError("LOGIN_RESPONSE_INVALID")

    token = str(session.get("access_token") or "").strip()
    user_id = str(user.get("id") or "").strip()

    if not token or not user_id:
        raise RuntimeError("LOGIN_TOKEN_OR_USER_MISSING")

    return token, user_id


def json_request(method, backend, path, token, body=None):
    status, raw = request(
        method,
        backend + path,
        token=token,
        body=body,
    )

    try:
        payload = parse_json(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        payload = None

    return status, payload


def upload_attachment(
    backend,
    token,
    conversation_id,
    sender_identity_id,
    label,
):
    marker = uuid.uuid4().hex
    boundary = "beeapp-s12-" + marker
    filename = "s12-" + label + "-" + marker + ".txt"
    content = (
        "BeeApp S12 chat attachment security test "
        + marker
        + "\n"
    ).encode("utf-8")

    fields = [
        ("sender_identity_id", sender_identity_id),
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
        backend
        + "/api/chat/conversations/"
        + quote(conversation_id, safe="")
        + "/attachments/",
        token=token,
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

    if status != 201 or not isinstance(payload, dict):
        raise RuntimeError(
            "ATTACHMENT_UPLOAD_FAILED_"
            + label
            + "_HTTP_"
            + str(status)
        )

    message = payload.get("message")
    file_record = payload.get("file")

    if not isinstance(message, dict) or not isinstance(file_record, dict):
        raise RuntimeError(
            "ATTACHMENT_UPLOAD_RESPONSE_INVALID_" + label
        )

    message_id = str(message.get("id") or "").strip()
    file_id = str(file_record.get("id") or "").strip()

    if not message_id or not file_id:
        raise RuntimeError(
            "ATTACHMENT_UPLOAD_IDENTIFIERS_MISSING_" + label
        )

    return message_id, file_id


def get_profile_identity(backend, token):
    status, payload = json_request(
        "GET",
        backend,
        "/api/chat/identities/?active_only=true",
        token,
    )

    if status != 200 or not isinstance(payload, dict):
        raise RuntimeError("CHAT_IDENTITIES_FAILED_HTTP_" + str(status))

    identities = payload.get("identities")

    if not isinstance(identities, list):
        raise RuntimeError("CHAT_IDENTITIES_RESPONSE_INVALID")

    for identity in identities:
        if (
            isinstance(identity, dict)
            and identity.get("identity_type") == "profile"
            and identity.get("is_active") is True
            and identity.get("id")
        ):
            return str(identity["id"])

    raise RuntimeError("ACTIVE_PROFILE_IDENTITY_NOT_FOUND")


def create_group(backend, token, owner_identity_id, label):
    status, payload = json_request(
        "POST",
        backend,
        "/api/chat/groups/",
        token,
        {
            "creator_identity_id": owner_identity_id,
            "name": "S12 " + label + " " + uuid.uuid4().hex[:12],
            "posting_policy": "all_members",
            "description": "Temporary S12 security test group.",
        },
    )

    if status != 201 or not isinstance(payload, dict):
        raise RuntimeError(
            "GROUP_CREATE_FAILED_"
            + label
            + "_HTTP_"
            + str(status)
        )

    conversation = payload.get("conversation")

    if not isinstance(conversation, dict) or not conversation.get("id"):
        raise RuntimeError("GROUP_CREATE_RESPONSE_INVALID_" + label)

    return str(conversation["id"])


def invite_and_accept(
    backend,
    owner_token,
    member_token,
    conversation_id,
    owner_identity_id,
    member_identity_id,
    label,
):
    status, payload = json_request(
        "POST",
        backend,
        "/api/chat/groups/"
        + quote(conversation_id, safe="")
        + "/invites/",
        owner_token,
        {
            "actor_identity_id": owner_identity_id,
            "invited_identity_id": member_identity_id,
        },
    )

    if status != 201 or not isinstance(payload, dict):
        raise RuntimeError(
            "GROUP_INVITE_FAILED_"
            + label
            + "_HTTP_"
            + str(status)
        )

    invite = payload.get("invite")

    if not isinstance(invite, dict) or not invite.get("id"):
        raise RuntimeError("GROUP_INVITE_RESPONSE_INVALID_" + label)

    status, payload = json_request(
        "POST",
        backend,
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
            "GROUP_INVITE_ACCEPT_FAILED_"
            + label
            + "_HTTP_"
            + str(status)
        )


def get_chat_attachment_access(
    backend,
    token,
    message_id,
    identity_id,
):
    return json_request(
        "GET",
        backend,
        "/api/chat/messages/"
        + quote(message_id, safe="")
        + "/attachment/access/?identity_id="
        + quote(identity_id, safe="")
        + "&download=false",
        token,
    )


def get_share_rows(
    supabase,
    public_key,
    token,
    file_id,
    recipient_user_id,
):
    endpoint = (
        supabase
        + "/rest/v1/file_shares?select="
        + quote(
            (
                "id,file_id,shared_with_user_id,revoked_at,"
                "share_source,source_conversation_id,"
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
        key=public_key,
        token=token,
    )

    try:
        rows = parse_json(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        rows = None

    if status != 200 or not isinstance(rows, list):
        raise RuntimeError("FILE_SHARE_QUERY_FAILED_HTTP_" + str(status))

    return rows


def assert_chat_share(
    rows,
    conversation_id,
    message_id,
    should_be_revoked,
):
    matches = [
        row
        for row in rows
        if (
            isinstance(row, dict)
            and row.get("share_source") == "chat_attachment"
            and str(row.get("source_conversation_id") or "")
            == conversation_id
            and str(row.get("source_message_id") or "") == message_id
        )
    ]

    if len(matches) != 1:
        raise RuntimeError("CHAT_SHARE_NOT_UNIQUELY_IDENTIFIED")

    revoked_at = matches[0].get("revoked_at")

    if should_be_revoked and not revoked_at:
        raise RuntimeError("CHAT_SHARE_NOT_REVOKED")

    if not should_be_revoked and revoked_at:
        raise RuntimeError("CHAT_SHARE_UNEXPECTEDLY_REVOKED")


def run_scenario(
    name,
    backend,
    supabase,
    public_key,
    owner_token,
    owner_user_id,
    owner_identity_id,
    member_token,
    member_user_id,
    member_identity_id,
    results,
):
    conversation_id = create_group(
        backend,
        owner_token,
        owner_identity_id,
        name,
    )

    invite_and_accept(
        backend,
        owner_token,
        member_token,
        conversation_id,
        owner_identity_id,
        member_identity_id,
        name,
    )

    message_id, file_id = upload_attachment(
        backend,
        owner_token,
        conversation_id,
        owner_identity_id,
        name,
    )

    rows = get_share_rows(
        supabase,
        public_key,
        member_token,
        file_id,
        member_user_id,
    )

    assert_chat_share(
        rows,
        conversation_id,
        message_id,
        should_be_revoked=False,
    )

    results.append(
        "PASS | "
        + name
        + " | share Chat creado para participante activo"
    )

    status, _ = get_chat_attachment_access(
        backend,
        member_token,
        message_id,
        member_identity_id,
    )

    if status != 200:
        raise RuntimeError(
            "ACTIVE_MEMBER_ATTACHMENT_ACCESS_FAILED_"
            + name
            + "_HTTP_"
            + str(status)
        )

    results.append(
        "PASS | "
        + name
        + " | participante activo accede al adjunto"
    )

    if name == "leave":
        status, payload = json_request(
            "POST",
            backend,
            "/api/chat/groups/"
            + quote(conversation_id, safe="")
            + "/leave/",
            member_token,
            {"identity_id": member_identity_id},
        )
        expected_status = 204
    else:
        status, payload = json_request(
            "DELETE",
            backend,
            "/api/chat/groups/"
            + quote(conversation_id, safe="")
            + "/participants/"
            + quote(member_identity_id, safe="")
            + "/",
            owner_token,
            {"actor_identity_id": owner_identity_id},
        )
        expected_status = 204

    if status != expected_status:
        raise RuntimeError(
            "GROUP_DEPARTURE_ACTION_FAILED_"
            + name
            + "_HTTP_"
            + str(status)
            + "_"
            + str(payload)
        )

    rows = get_share_rows(
        supabase,
        public_key,
        member_token,
        file_id,
        member_user_id,
    )

    assert_chat_share(
        rows,
        conversation_id,
        message_id,
        should_be_revoked=True,
    )

    results.append(
        "PASS | "
        + name
        + " | share Chat revocado después de salida o expulsión"
    )

    status, _ = get_chat_attachment_access(
        backend,
        member_token,
        message_id,
        member_identity_id,
    )

    if status not in (403, 404):
        raise RuntimeError(
            "DEPARTED_MEMBER_ATTACHMENT_ACCESS_NOT_DENIED_"
            + name
            + "_HTTP_"
            + str(status)
        )

    results.append(
        "PASS | "
        + name
        + " | acceso al adjunto denegado después de salida o expulsión"
    )

    owner_rows = get_share_rows(
        supabase,
        public_key,
        owner_token,
        file_id,
        owner_user_id,
    )

    if owner_rows:
        raise RuntimeError(
            "OWNER_UNEXPECTEDLY_HAS_FILE_SHARE_" + name
        )

    results.append(
        "PASS | "
        + name
        + " | propietario conserva acceso por propiedad, sin share"
    )


def write_report(results):
    REPORT_DIR.mkdir(exist_ok=True)

    report = REPORT_DIR / (
        "s12_chat_attachment_revocation_"
        + datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        + ".txt"
    )

    ignored = subprocess.run(
        [
            "git",
            "-C",
            str(ROOT),
            "check-ignore",
            "-q",
            str(report),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )

    if ignored.returncode != 0:
        raise RuntimeError("REPORT_NOT_IGNORED")

    descriptor = os.open(
        report,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL,
        0o600,
    )

    with os.fdopen(descriptor, "w", encoding="utf-8") as output:
        output.write("\n".join(results) + "\n")

    if report.stat().st_size <= 0:
        raise RuntimeError("REPORT_EMPTY")

    return report


def main():
    results = []

    try:
        supabase, public_key = frontend_config()
        backend = os.environ.get(
            "BEEAPP_BASE_URL",
            "http://127.0.0.1:8000",
        ).rstrip("/")

        health_status, health_raw = request(
            "GET",
            backend + "/api/health/",
        )
        health_payload = parse_json(health_raw)

        if (
            health_status != 200
            or not isinstance(health_payload, dict)
            or health_payload.get("status") != "ok"
        ):
            raise RuntimeError("BACKEND_NOT_HEALTHY")

        results.append("PASS | precondition | backend health")

        email_a = input("Correo de cuenta A propietaria: ").strip()
        password_a = getpass.getpass("Contraseña cuenta A: ")
        owner_token, owner_user_id = login(
            backend,
            email_a,
            password_a,
        )
        del email_a, password_a

        email_b = input("Correo de cuenta B participante: ").strip()
        password_b = getpass.getpass("Contraseña cuenta B: ")
        member_token, member_user_id = login(
            backend,
            email_b,
            password_b,
        )
        del email_b, password_b

        if owner_user_id == member_user_id:
            raise RuntimeError("DISTINCT_TEST_ACCOUNTS_REQUIRED")

        owner_identity_id = get_profile_identity(
            backend,
            owner_token,
        )
        member_identity_id = get_profile_identity(
            backend,
            member_token,
        )

        results.append(
            "PASS | precondition | two distinct active profile identities"
        )

        for scenario_name in ("leave", "removal"):
            run_scenario(
                scenario_name,
                backend,
                supabase,
                public_key,
                owner_token,
                owner_user_id,
                owner_identity_id,
                member_token,
                member_user_id,
                member_identity_id,
                results,
            )

    except (
        RuntimeError,
        ValueError,
        KeyError,
        UnicodeDecodeError,
        json.JSONDecodeError,
        urllib.error.URLError,
        TimeoutError,
    ) as error:
        results.append(
            "FAIL | execution | "
            + type(error).__name__
            + " | "
            + str(error)
        )

    report = write_report(results)
    failures = sum(
        1 for row in results if not row.startswith("PASS |")
    )

    print(
        "S12 result: "
        + str(len(results) - failures)
        + " passed; "
        + str(failures)
        + " failed. Report: "
        + str(report)
    )

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
