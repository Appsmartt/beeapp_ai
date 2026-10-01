#!/usr/bin/env python3
"""Preflight for the isolated S7 mail draft expiration HTTP test."""

import getpass
import json
import os
import subprocess
from pathlib import Path

from test_security_12_http import frontend_config, login, request

ROOT = Path(__file__).resolve().parents[3]
MODE = os.environ.get("BEEAPP_S7_MODE", "expired")
REPORT = ROOT / (
    "tmp/explorations/s7_mail_shared_send_http_result.txt"
    if MODE == "positive" and os.environ.get("BEEAPP_S7_CASE") == "shared"
    else "tmp/explorations/s7_mail_positive_http_result.txt"
    if MODE == "positive"
    else "tmp/explorations/s7_mail_draft_http_result.txt"
)


def main():
    if subprocess.run(
        ["git", "check-ignore", "-q", str(REPORT.relative_to(ROOT))],
        cwd=ROOT,
    ).returncode != 0:
        raise RuntimeError("El reporte S7 Mail no está ignorado por Git.")

    if MODE not in ("positive", "expired"):
        raise RuntimeError("BEEAPP_S7_MODE debe ser positive o expired.")
    lines = [
        "S7 Mail — controles positivos OWN y SHARED"
        if MODE == "positive"
        else "S7 Mail — prueba HTTP de borrador vencido",
        "El estado del envío se acredita únicamente con las comprobaciones siguientes.",
    ]
    failures = 0
    stage = "configuración frontend"
    try:
        supabase_url, public_key = frontend_config()
        public_key = os.environ.get("BEEAPP_S7_PUBLIC_KEY", public_key)
        backend = os.environ.get(
            "BEEAPP_BASE_URL", "http://127.0.0.1:8000"
        ).rstrip("/")

        stage = "comprobación de clave pública"
        status, _ = request(
            "GET", supabase_url + "/auth/v1/settings", key=public_key
        )
        lines.append(f"DIAGNÓSTICO | clave pública | HTTP {status}")
        if status != 200:
            raise RuntimeError(
                f"Configuración pública no disponible: HTTP {status}"
            )
        stage = "salud del backend"
        status, _ = request("GET", backend + "/api/health/")
        lines.append(f"DIAGNÓSTICO | backend | HTTP {status}")
        if status != 200:
            raise RuntimeError(f"Backend no disponible: HTTP {status}")
        lines.append("PASS | backend y configuración pública disponibles")

        stage = "autenticación de A"
        email_a = input("Correo de A, dueña del archivo: ").strip().lower()
        if not email_a or "@" not in email_a:
            raise RuntimeError("Correo A inválido; no se pidió contraseña.")
        password_a = getpass.getpass("Contraseña de A: ")
        token_a, user_a = login(backend, email_a, password_a)
        del password_a

        stage = "autenticación de B"
        email_b = input("Correo de B, remitente Microsoft: ").strip().lower()
        if not email_b or "@" not in email_b or email_b == email_a:
            raise RuntimeError("Correo B inválido; no se pidió contraseña.")
        password_b = getpass.getpass("Contraseña de B: ")
        token_b, user_b = login(backend, email_b, password_b)
        del password_b

        if str(user_a) == str(user_b):
            raise RuntimeError("A y B deben ser cuentas distintas.")
        lines.append("PASS | A y B autenticadas y distintas")

        stage = "validación de identidades"
        for label, token, user in (
            ("A", token_a, user_a),
            ("B", token_b, user_b),
        ):
            status, raw = request(
                "GET", supabase_url + "/auth/v1/user",
                key=public_key, token=token,
            )
            try:
                identity = json.loads(raw)
            except (ValueError, TypeError):
                identity = {}
            expected_email = email_a if label == "A" else email_b
            if (
                status != 200
                or str(identity.get("id")) != str(user)
                or str(identity.get("email") or "").strip().lower()
                != expected_email
            ):
                raise RuntimeError(
                    f"Identidad de {label} no validada: HTTP {status}"
                )
        lines.append("PASS | ambas identidades verificadas")

        stage = "integraciones Mail de B"
        status, raw = request(
            "GET", backend + "/api/mail/integrations/",
            token=token_b,
        )
        lines.append(f"DIAGNÓSTICO | integraciones Mail | HTTP {status}")
        if status != 200:
            raise RuntimeError(
                f"Integraciones Mail de B no disponibles: HTTP {status}"
            )
        try:
            payload = json.loads(raw)
        except (ValueError, TypeError):
            payload = {}
        integrations = payload.get("integrations")
        if not isinstance(integrations, list):
            raise RuntimeError("Formato inesperado de integraciones Mail.")
        lines.append(
            f"DIAGNÓSTICO | integraciones recibidas={len(integrations)}"
        )
        if integrations and isinstance(integrations[0], dict):
            allowed_names = {"id", "user_id", "provider", "status"}
            present = sorted(allowed_names.intersection(integrations[0]))
            lines.append(
                "DIAGNÓSTICO | campos disponibles=" + ",".join(present)
            )
        active = [
            item for item in integrations
            if isinstance(item, dict)
            and item.get("status") == "active"
            and item.get("provider") in ("google", "microsoft")
            and str(item.get("user_id")) == str(user_b)
            and item.get("id")
        ]
        lines.append(f"DIAGNÓSTICO | candidatas verificadas={len(active)}")
        if not active:
            raise RuntimeError(
                "B no tiene integración Mail activa atribuida a su usuario."
            )
        lines.extend(
            "PASS | integración de B | proveedor="
            + str(item["provider"]) + " | ID omitido"
            for item in active
        )
        expected_user_id = os.environ.get("BEEAPP_S7_EXPECTED_USER_ID")
        expected_provider = os.environ.get("BEEAPP_S7_EXPECTED_PROVIDER")
        if expected_user_id and str(user_b) != expected_user_id:
            raise RuntimeError("La cuenta B no es la esperada.")
        if not expected_provider:
            if MODE != "positive":
                raise RuntimeError("Falta proveedor esperado para caso vencido.")
            expected_provider = "microsoft"
        if MODE == "positive" and expected_provider != "microsoft":
            raise RuntimeError("El control positivo requiere Microsoft.")
        active = [
            item for item in active
            if item["provider"] == expected_provider
        ]
        if len(active) != 1:
            raise RuntimeError("No existe una única integración esperada.")
        lines.append("PASS | identidad y proveedor esperados verificados")
        chosen = active[0]
        if not chosen.get("provider_email"):
            raise RuntimeError("Integración sin correo destinatario de control.")
        if MODE == "positive":
            if str(chosen["provider_email"]).strip().lower() != email_b:
                raise RuntimeError(
                    "El correo de la integración no coincide con B; envío bloqueado."
                )
            from s7_mail_positive_scenarios import run_positive_scenarios
            stage = "controles positivos OWN y SHARED"
            run_positive_scenarios(
                backend=backend, token_a=token_a, user_a=user_a,
                token_b=token_b, user_b=user_b, integration=chosen,
                lines=lines,
            )
            if (
                os.environ.get("BEEAPP_S7_CASE") == "shared"
                and os.environ.get("BEEAPP_S7_SKIP_SYNC") == "1"
            ):
                lines.append(
                    "RESULTADO | SHARED envío confirmado; "
                    "recepción, bytes y limpieza PENDIENTES"
                )
            else:
                lines.append(
                    "RESULTADO | positivos PASS | OWN y SHARED enviados, "
                    "recibidos y bytes verificados; limpieza pendiente"
                )
        else:
            from s7_mail_expired_draft_scenario import run_expired_draft_scenario
            stage = "escenario de borrador vencido"
            run_expired_draft_scenario(
                backend=backend, token_a=token_a, user_a=user_a,
                token_b=token_b, user_b=user_b, integration=chosen,
                lines=lines,
            )
            lines.append(
                "RESULTADO | escenario vencido PASS | "
                "envío rechazado por HTTP y borrador verificado"
            )
    except Exception as error:
        failures += 1
        lines.append(
            "FAIL | preflight | " + type(error).__name__
            + " | etapa=" + stage + " | detalles reservados"
        )
        lines.append(
            "RESULTADO | FAIL | estado de envío no confirmado; "
            "revisar proveedor si se llegó al escenario"
        )
    finally:
        REPORT.write_text(chr(10).join(lines) + chr(10), encoding="utf-8")
        print(f"Reporte generado: {REPORT.relative_to(ROOT)}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
