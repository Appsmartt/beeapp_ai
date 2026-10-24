from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .http_client import request
from .runtime_config import RuntimeConfig, login_url


@dataclass(frozen=True)
class AuthenticatedAccount:
    token: str
    user_id: str


def login_account(
    config: RuntimeConfig,
    email: str,
    password: str,
) -> AuthenticatedAccount:
    status, body = request(
        "POST",
        login_url(config),
        {"email": email, "password": password},
    )
    if status != 200 or not isinstance(body, dict):
        raise RuntimeError("BeeApp login was not successful.")
    session = body.get("session")
    user = body.get("user")
    if not isinstance(session, dict) or not isinstance(user, dict):
        raise RuntimeError("BeeApp login response is incomplete.")
    token = session.get("access_token")
    user_id = user.get("id")
    device_session_id = body.get("device_session_id")
    if not token or not user_id or not device_session_id:
        raise RuntimeError("BeeApp login lacks token, user, or device session.")
    return AuthenticatedAccount(token=str(token), user_id=str(user_id))
