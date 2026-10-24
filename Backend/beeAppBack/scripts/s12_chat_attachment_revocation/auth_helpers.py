from .http_client import parse_json, request
from .runtime_config import get_backend_url


def json_request(method, path, token, body=None):
    status, raw = request(
        method,
        get_backend_url() + path,
        token=token,
        body=body,
    )
    try:
        payload = parse_json(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        payload = None
    return status, payload


def login(email, password):
    status, payload = json_request(
        "POST",
        "/api/accounts/login/",
        None,
        {"email": email, "password": password},
    )

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


def get_profile_identity(token):
    status, payload = json_request(
        "GET",
        "/api/chat/identities/?active_only=true",
        token,
    )

    if status != 200 or not isinstance(payload, dict):
        raise RuntimeError(
            "CHAT_IDENTITIES_FAILED_HTTP_" + str(status)
        )

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
