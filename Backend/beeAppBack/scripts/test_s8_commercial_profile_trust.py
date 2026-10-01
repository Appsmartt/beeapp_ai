#!/usr/bin/env python3
import getpass
import ipaddress
import json
from pathlib import Path
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[3]
ENV_FILE = ROOT / "Fronted" / ".env"


def read_env(path):
    values = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def request(method, url, payload=None, headers=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", **(headers or {})},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        try:
            body = json.load(error)
        except (ValueError, UnicodeError):
            body = {}
        return error.code, body


def ignored_report_directory():
    for relative in ("tmp/explorations", ".beeapp-work"):
        path = ROOT / relative
        if path.is_dir() and subprocess.run(
            ["git", "check-ignore", "-q", relative],
            cwd=ROOT,
        ).returncode == 0:
            return path
    raise RuntimeError("No hay carpeta existente e ignorada para el TXT.")


def main():
    report = ignored_report_directory() / "s8_pruebas_comerciales.txt"
    lines = [
        "S8 — regresión y pruebas negativas REST",
        f"Fecha UTC: {datetime.now(timezone.utc).isoformat()}",
    ]
    result = 1
    stage = "lectura de configuración"
    try:
        env = read_env(ENV_FILE)
        api = env["EXPO_PUBLIC_API_BASE_URL"].rstrip("/")
        supabase = env["EXPO_PUBLIC_SUPABASE_URL"].rstrip("/")
        anon_key = env["EXPO_PUBLIC_SUPABASE_ANON_KEY"]
        lines.append(
            "Esquemas configurados: backend="
            + urllib.parse.urlsplit(api).scheme
            + ", supabase="
            + urllib.parse.urlsplit(supabase).scheme
        )
        backend_url = urllib.parse.urlsplit(api)
        backend_host = backend_url.hostname or ""
        try:
            backend_ip = ipaddress.ip_address(backend_host)
            private_backend = (
                backend_ip.is_private or backend_ip.is_loopback
            )
        except ValueError:
            private_backend = backend_host.lower() == "localhost"
        if backend_url.scheme != "https" and not (
            backend_url.scheme == "http" and private_backend
        ):
            raise RuntimeError("Backend fuera de la red privada permitida.")
        if not supabase.startswith("https://"):
            raise RuntimeError("Supabase debe usar HTTPS.")
        stage = "solicitud de credenciales"
        email = input("Correo de cuenta de prueba: ").strip()
        password = getpass.getpass("Contraseña (no se guarda): ")
        login_url = api + (
            "/accounts/login/" if api.endswith("/api")
            else "/api/accounts/login/"
        )
        stage = "login BeeApp"
        status, login = request(
            "POST", login_url,
            {"email": email, "password": password},
        )
        lines.append(f"Login BeeApp: HTTP {status}")
        if status != 200 or not isinstance(login, dict):
            raise RuntimeError("Login no exitoso; no se hicieron consultas REST.")
        token = login.get("session", {}).get("access_token")
        user_id = login.get("user", {}).get("id")
        if not token or not user_id or not login.get("device_session_id"):
            raise RuntimeError("Login sin token, usuario o sesión de dispositivo.")
        lines.append("Token y sesión de dispositivo: presentes (valores omitidos)")
        query = urllib.parse.urlencode({
            "select": (
                "id,owner_id,is_available,verification_status,"
                "verification_badge_visible,suspended_at,suspension_reason"
            ),
            "owner_id": f"eq.{user_id}",
            "limit": "10",
        })
        stage = "lectura REST con RLS"
        status, profiles = request(
            "GET",
            f"{supabase}/rest/v1/commercial_profiles?{query}",
            headers={
                "apikey": anon_key,
                "Authorization": f"Bearer {token}",
            },
        )
        lines.append(f"Lectura REST como propietario: HTTP {status}")
        if status != 200 or not isinstance(profiles, list):
            raise RuntimeError(
                "No se confirmó lectura bajo RLS; no probar ataques todavía."
            )
        lines.append(f"Perfiles propios visibles: {len(profiles)}")
        lines.append(
            "IDs de perfil: "
            + (", ".join(str(row["id"]) for row in profiles) or "(ninguno)")
        )
        if not profiles:
            raise RuntimeError("La cuenta de prueba no tiene perfiles propios.")

        stage = "regresión de edición ordinaria"
        selected = profiles[0]
        profile_id = str(selected["id"])
        current_availability = selected.get("is_available")
        if not isinstance(current_availability, bool):
            raise RuntimeError(
                "No se recibió is_available para la prueba de regresión."
            )
        ordinary_url = (
            f"{supabase}/rest/v1/commercial_profiles?"
            + urllib.parse.urlencode({
                "id": f"eq.{profile_id}",
                "owner_id": f"eq.{user_id}",
                "select": (
                    "id,is_available,verification_status,"
                    "verification_badge_visible,suspended_at,"
                    "suspension_reason"
                ),
            })
        )
        ordinary_status, ordinary_rows = request(
            "PATCH",
            ordinary_url,
            {"is_available": current_availability},
            headers={
                "apikey": anon_key,
                "Authorization": f"Bearer {token}",
                "Prefer": "return=representation",
            },
        )
        if (
            ordinary_status != 200
            or not isinstance(ordinary_rows, list)
            or len(ordinary_rows) != 1
            or ordinary_rows[0].get("is_available")
                is not current_availability
        ):
            raise RuntimeError(
                "La edición ordinaria no superó la regresión."
            )
        lines.append(
            "Edición ordinaria is_available sin alterar su valor: HTTP 200"
        )
        stage = "pruebas negativas S8"
        fields = (
            "verification_status",
            "verification_badge_visible",
            "suspended_at",
            "suspension_reason",
        )
        baseline = {
            str(row["id"]): {field: row.get(field) for field in fields}
            for row in profiles
        }
        attempts = [
            ("verification_status", "verified"),
            ("verification_badge_visible", True),
            ("suspended_at", "2026-10-01T12:00:00Z"),
            ("suspension_reason", "S8 rejected test"),
        ]
        headers = {
            "apikey": anon_key,
            "Authorization": f"Bearer {token}",
            "Prefer": "return=representation",
        }
        completed = 0
        for cycle in range(1, 6):
            for profile_id in baseline:
                profile_url = (
                    f"{supabase}/rest/v1/commercial_profiles?"
                    + urllib.parse.urlencode({
                        "id": f"eq.{profile_id}",
                        "owner_id": f"eq.{user_id}",
                        "select": ",".join(("id",) + fields),
                    })
                )
                for field, value in attempts:
                    http_status, body = request(
                        "PATCH",
                        profile_url,
                        {field: value},
                        headers,
                    )
                    if not (
                        http_status in (400, 403)
                        and isinstance(body, dict)
                        and body.get("code") == "42501"
                        and "Commercial profile verification and suspension fields are protected"
                            in str(body.get("message", ""))
                    ):
                        lines.append(
                            f"FALLO: ciclo {cycle}, campo {field}, "
                            f"HTTP {http_status}, código "
                            f"{str(body.get('code', 'ausente')) if isinstance(body, dict) else 'ausente'}"
                        )
                        raise RuntimeError(
                            "Rechazo S8 no confirmado; detener pruebas."
                        )
                    completed += 1
            check_status, current = request(
                "GET",
                f"{supabase}/rest/v1/commercial_profiles?{query}",
                headers=headers,
            )
            if check_status != 200 or not isinstance(current, list):
                raise RuntimeError("No se pudo comprobar el estado posterior.")
            current_by_id = {
                str(row["id"]): {
                    field: row.get(field) for field in fields
                }
                for row in current
            }
            if current_by_id != baseline:
                raise RuntimeError(
                    "Los campos protegidos cambiaron; detener pruebas."
                )
            lines.append(
                f"Ciclo {cycle}/5: rechazos S8 confirmados; "
                "campos protegidos sin cambios"
            )
        lines.append(f"Intentos rechazados por S8: {completed}")
        stage = "aislamiento de segunda cuenta"
        second_email = input("Correo de segunda cuenta de prueba: ").strip()
        second_password = getpass.getpass(
            "Contraseña de segunda cuenta (no se guarda): "
        )
        second_status, second_login = request(
            "POST",
            login_url,
            {"email": second_email, "password": second_password},
        )
        lines.append(f"Login de segunda cuenta: HTTP {second_status}")
        if second_status != 200 or not isinstance(second_login, dict):
            raise RuntimeError("No se autenticó la segunda cuenta.")
        second_token = second_login.get("session", {}).get("access_token")
        second_user_id = second_login.get("user", {}).get("id")
        if (
            not second_token or not second_user_id
            or not second_login.get("device_session_id")
            or str(second_user_id) == str(user_id)
        ):
            raise RuntimeError(
                "La segunda cuenta no es distinta o no tiene sesión activa."
            )
        second_headers = {
            "apikey": anon_key,
            "Authorization": f"Bearer {second_token}",
            "Prefer": "return=representation",
        }
        second_query = urllib.parse.urlencode({
            "select": "id,owner_id",
            "owner_id": f"eq.{second_user_id}",
            "limit": "10",
        })
        own_status, own_rows = request(
            "GET",
            f"{supabase}/rest/v1/commercial_profiles?{second_query}",
            headers=second_headers,
        )
        if own_status != 200 or not isinstance(own_rows, list):
            raise RuntimeError("La segunda cuenta no puede consultar sus perfiles.")
        lines.append(
            f"Perfiles visibles de la segunda cuenta: {len(own_rows)}"
        )
        first_id = next(iter(baseline))
        cross_query = urllib.parse.urlencode({
            "id": f"eq.{first_id}",
            "select": ",".join(("id",) + fields),
        })
        cross_status, cross_body = request(
            "PATCH",
            f"{supabase}/rest/v1/commercial_profiles?{cross_query}",
            {"verification_badge_visible": True},
            second_headers,
        )
        if cross_status not in (200, 204) or cross_body not in ([], {}):
            lines.append(f"Resultado cruzado inesperado: HTTP {cross_status}")
            raise RuntimeError(
                "La escritura cruzada no quedó confirmada como cero filas."
            )
        verify_status, verified_rows = request(
            "GET",
            f"{supabase}/rest/v1/commercial_profiles?{query}",
            headers={
                "apikey": anon_key,
                "Authorization": f"Bearer {token}",
            },
        )
        if verify_status != 200 or not isinstance(verified_rows, list):
            raise RuntimeError("No se pudo verificar el perfil de la cuenta A.")
        verified_by_id = {
            str(row["id"]): {
                field: row.get(field) for field in fields
            }
            for row in verified_rows
        }
        if verified_by_id != baseline:
            raise RuntimeError(
                "Los campos de la cuenta A cambiaron tras la prueba cruzada."
            )
        lines.append(
            "Escritura cruzada: cero filas; perfil de A sin cambios"
        )
        lines.append(
            "RESULTADO: PASÓ pruebas repetidas y aislamiento cruzado"
        )
        result = 0
    except Exception as error:
        lines.append(
            f"RESULTADO: BLOQUEADO en {stage} — {type(error).__name__}"
        )
        lines.append(
            "No se registran detalles de la excepción para evitar secretos."
        )
    report.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Informe: {report}")
    return result


if __name__ == "__main__":
    if main() != 0:
        raise RuntimeError("S8 test failed; inspect the TXT report.")
