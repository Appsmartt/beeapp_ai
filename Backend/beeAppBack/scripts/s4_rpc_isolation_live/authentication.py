import getpass
import sys

from http_client import request


def is_valid_email(email):
    return (
        email.count("@") == 1
        and not any(character.isspace() for character in email)
        and not any(character in email for character in "[]()<>")
        and "." in email.rsplit("@", 1)[-1]
    )


def authentication_failure_reason(data):
    if not isinstance(data, dict):
        return "no_disponible"

    error_code = data.get("error_code")
    safe_codes = {
        "invalid_credentials",
        "email_not_confirmed",
        "over_email_send_rate_limit",
        "user_not_found",
        "validation_failed",
        "unexpected_failure",
    }
    alternatives = [
        str(value).lower()
        for value in (data.get("error"), data.get("msg"))
        if value
    ]
    if error_code in safe_codes:
        return error_code
    if (
        "invalid_grant" in alternatives
        or "invalid login credentials" in alternatives
    ):
        return "invalid_credentials"
    if "email not confirmed" in alternatives:
        return "email_not_confirmed"
    return "no_disponible"


def authenticate_accounts(runtime_config, reporter):
    accounts = []
    for label in ("A", "B"):
        print(
            f"Correo de cuenta {label}: ",
            end="",
            file=sys.stderr,
            flush=True,
        )
        email = sys.stdin.readline().strip()
        if not is_valid_email(email):
            reporter.fail(
                f"correo {label}",
                "formato inválido; Auth no fue llamado",
            )
            return None

        password = getpass.getpass(f"Contraseña de cuenta {label}: ")
        if not password:
            reporter.fail(f"autenticación {label}", "credenciales vacías")
            return None

        supabase_status, supabase_data = request(
            "POST",
            runtime_config["supabase_url"]
            + "/auth/v1/token?grant_type=password",
            {
                "apikey": runtime_config["anon_key"],
                "Content-Type": "application/json",
            },
            {"email": email, "password": password},
        )
        backend_status, backend_data = request(
            "POST",
            runtime_config["api_base"] + "/accounts/login/",
            {"Content-Type": "application/json"},
            {"email": email, "password": password},
        )
        password = None

        if (
            supabase_status != 200
            or not isinstance(supabase_data, dict)
            or not supabase_data.get("access_token")
        ):
            reporter.fail(
                f"autenticación {label}",
                f"HTTP {supabase_status}; "
                f"código={authentication_failure_reason(supabase_data)}",
            )
            return None

        user = supabase_data.get("user") or {}
        backend_session = (
            backend_data.get("session", {})
            if isinstance(backend_data, dict) else {}
        )
        backend_user = (
            backend_data.get("user", {})
            if isinstance(backend_data, dict) else {}
        )
        backend_token = (
            backend_session.get("access_token")
            if isinstance(backend_session, dict) else None
        )
        identities_match = (
            isinstance(backend_user, dict)
            and backend_user.get("id") == user.get("id")
        )
        reporter.check(
            f"sesión backend {label}",
            backend_status == 200 and bool(backend_token) and identities_match,
            f"HTTP {backend_status}; identidad_coincide={identities_match}",
        )
        if backend_status != 200 or not backend_token or not identities_match:
            return None

        accounts.append(
            {
                "token": supabase_data["access_token"],
                "backend_token": backend_token,
                "id": user.get("id"),
            }
        )
        reporter.check(
            f"autenticación {label}",
            True,
            f"HTTP {supabase_status}",
        )

    if (
        not accounts[0]["id"]
        or not accounts[1]["id"]
        or accounts[0]["id"] == accounts[1]["id"]
    ):
        reporter.fail("cuentas", "se requieren dos usuarios distintos")
        return None
    return accounts
