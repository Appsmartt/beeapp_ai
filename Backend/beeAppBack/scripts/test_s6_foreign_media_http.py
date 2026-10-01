#!/usr/bin/env python3
import getpass
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from test_security_12_http import frontend_config, login, request

ROOT = Path(__file__).resolve().parents[3]
REPORT_DIR = ROOT / ".beeapp-work"
CYCLES = 10


def rows(method, url, key, token, body=None):
    status, raw = request(method, url, key=key, token=token, body=body)
    if status != 200:
        return status, None
    try:
        value = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        return status, None
    return status, value if isinstance(value, list) else None


def own_row(base, table, identifier, key, token, columns="id"):
    url = (
        base + "/rest/v1/" + table
        + "?select=" + quote(columns, safe=",")
        + "&id=eq." + quote(str(identifier), safe="")
    )
    status, value = rows("GET", url, key, token)
    return status, value[0] if isinstance(value, list) and len(value) == 1 else None


def main():
    checks = []
    failures = 0
    inconclusive = 0

    def record(label, outcome, detail):
        nonlocal failures, inconclusive
        checks.append(f"{outcome} | {label} | {detail}")
        failures += outcome == "FAIL"
        inconclusive += outcome == "INCONCLUSO"

    try:
        base, key = frontend_config()
        key = os.environ.get("BEEAPP_S6_PUBLIC_KEY", key)
        if not key.startswith("sb_publishable_"):
            raise RuntimeError("CLAVE_PUBLICA_DE_PRUEBA_INVALIDA")
        key_status, _ = request("GET", base + "/auth/v1/settings", key=key)
        if key_status != 200:
            raise RuntimeError("CLAVE_PUBLICA_RECHAZADA_HTTP_" + str(key_status))
        backend = os.environ.get("BEEAPP_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
        health, _ = request("GET", backend + "/api/health/")
        if health != 200:
            raise RuntimeError("BACKEND_NO_DISPONIBLE")

        email_a = input("Correo cuenta A de prueba: ").strip()
        password_a = getpass.getpass("Contraseña A: ")
        token_a, user_a = login(backend, email_a, password_a)
        del email_a, password_a
        email_b = input("Correo cuenta B de prueba: ").strip()
        password_b = getpass.getpass("Contraseña B: ")
        token_b, user_b = login(backend, email_b, password_b)
        del email_b, password_b
        if user_a == user_b:
            raise RuntimeError("SE_REQUIEREN_DOS_CUENTAS_DISTINTAS")

        for label, token, user in (("A", token_a, user_a), ("B", token_b, user_b)):
            status, raw = request("GET", base + "/auth/v1/user", key=key, token=token)
            if status != 200 or str(json.loads(raw).get("id")) != str(user):
                raise RuntimeError("TOKEN_O_IDENTIDAD_INVALIDA_" + label)

        for label, token in (("A", token_a), ("B", token_b)):
            for cycle in range(1, CYCLES + 1):
                mine_status, mine_raw = request(
                    "GET", backend + "/api/statuses/mine/", token=token
                )
                try:
                    mine_payload = json.loads(mine_raw)
                    valid_json = isinstance(mine_payload, (dict, list))
                except (ValueError, UnicodeDecodeError):
                    valid_json = False
                record(
                    f"estados propios cuenta {label} ciclo {cycle}/{CYCLES}",
                    "PASS" if mine_status == 200 and valid_json else "FAIL",
                    f"HTTP {mine_status}; JSON valido={valid_json}"
                )
                if mine_status != 200 or not valid_json:
                    break

        file_url = (
            base + "/rest/v1/files?select=id,owner_id,kind,status,trashed_at"
            + "&owner_id=eq." + quote(str(user_b), safe="")
            + "&kind=eq.image&status=eq.ready&trashed_at=is.null&limit=1"
        )
        file_status, candidate_files = rows("GET", file_url, key, token_b)
        if file_status != 200 or candidate_files is None:
            raise RuntimeError("NO_SE_PUDO_CONSULTAR_ARCHIVOS_DE_B")
        if not candidate_files:
            record("archivo ajeno utilizable", "INCONCLUSO", "B no tiene imagen ready accesible")
        else:
            foreign_id = candidate_files[0].get("id")
            if not foreign_id or str(candidate_files[0].get("owner_id")) != str(user_b):
                raise RuntimeError("ARCHIVO_CANDIDATO_NO_VERIFICADO")

            targets = []
            status, profile = own_row(
                base, "profile", user_a, key, token_a, "id,avatar_file_id"
            )
            if status == 200 and profile and str(profile.get("id")) == str(user_a):
                targets.append(("avatar personal", "profile", user_a,
                                "avatar_file_id", profile.get("avatar_file_id")))
            else:
                record("avatar personal", "INCONCLUSO", f"lectura de perfil HTTP {status}")

            commercial_url = (
                base + "/rest/v1/commercial_profiles"
                + "?select=id,owner_id,logo_file_id&owner_id=eq."
                + quote(str(user_a), safe="") + "&limit=1"
            )
            commercial_status, commercial_rows = rows(
                "GET", commercial_url, key, token_a
            )
            if commercial_status == 200 and commercial_rows:
                commercial = commercial_rows[0]
                if str(commercial.get("owner_id")) != str(user_a):
                    raise RuntimeError("PROPIETARIO_COMERCIAL_INCORRECTO")
                targets.append(("logo comercial", "commercial_profiles",
                                commercial["id"], "logo_file_id",
                                commercial.get("logo_file_id")))
                offers_url = (
                    base + "/rest/v1/commercial_offers"
                    + "?select=id&commercial_profile_id=eq."
                    + quote(str(commercial["id"]), safe="")
                    + "&limit=50"
                )
                offers_status, offers = rows("GET", offers_url, key, token_a)
                image = None
                if offers_status == 200 and offers:
                    offer_ids = ",".join(
                        quote(str(item["id"]), safe="") for item in offers
                        if item.get("id")
                    )
                    if offer_ids:
                        image_url = (
                            base + "/rest/v1/commercial_offer_images"
                            + "?select=id,file_id,commercial_offer_id"
                            + "&commercial_offer_id=in.(" + offer_ids + ")&limit=1"
                        )
                        image_status, images = rows(
                            "GET", image_url, key, token_a
                        )
                        if image_status == 200 and images:
                            image = images[0]
                if image:
                    targets.append(("imagen de oferta", "commercial_offer_images",
                                    image["id"], "file_id", image.get("file_id")))
                else:
                    record("imagen de oferta", "INCONCLUSO",
                           "A no tiene una relación de imagen accesible")
            else:
                record("logo comercial", "INCONCLUSO",
                       f"sin perfil comercial accesible; HTTP {commercial_status}")
                record("imagen de oferta", "INCONCLUSO",
                       "sin perfil comercial para buscar oferta")

            for label, table, identifier, column, original in targets:
                endpoint = (
                    base + "/rest/v1/" + table
                    + "?id=eq." + quote(str(identifier), safe="")
                )
                for cycle in range(1, CYCLES + 1):
                    patch_status, patch_raw = request(
                        "PATCH", endpoint, key=key, token=token_a,
                        body={column: foreign_id}
                    )
                    try:
                        error_payload = json.loads(patch_raw)
                        error_code = str(error_payload.get("code", ""))
                    except (ValueError, UnicodeDecodeError, AttributeError):
                        error_code = ""
                    after_status, after = own_row(
                        base, table, identifier, key, token_a,
                        "id," + column
                    )
                    denied = (
                        patch_status == 403
                        if table == "profile"
                        else patch_status == 400 and error_code == "23514"
                    )
                    unchanged = (
                        after_status == 200 and after is not None
                        and after.get(column) == original
                    )
                    record(
                        f"{label} ciclo {cycle}/{CYCLES}",
                        "PASS" if denied and unchanged else "FAIL",
                        f"PATCH HTTP {patch_status}; SQLSTATE={error_code or 'ausente'}; "
                        f"relectura HTTP {after_status}; referencia intacta={unchanged}"
                    )
                    if not denied or not unchanged:
                        break
    except Exception as error:
        record("ejecución", "FAIL", type(error).__name__ + ": " + str(error))
    finally:
        REPORT_DIR.mkdir(exist_ok=True)
        report = REPORT_DIR / (
            "s6_pruebas_http_" +
            datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S") + ".txt"
        )
        if subprocess.run(
            ["git", "-C", str(ROOT), "check-ignore", "-q", str(report)],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        ).returncode != 0:
            raise RuntimeError("INFORME_NO_IGNORADO_POR_GIT")
        header = [
            f"UTC: {datetime.now(timezone.utc).isoformat()}",
            "Prueba: S6 PostgREST; dos cuentas; sin secretos ni identificadores",
            f"PASS={sum(line.startswith('PASS') for line in checks)} "
            f"FAIL={failures} INCONCLUSO={inconclusive}",
            "",
        ]
        report.write_text("\n".join(header + checks) + "\n", encoding="utf-8")
        print("\n".join(header + checks))
        print("Informe guardado en la carpeta .beeapp-work")
    return 1 if failures else (2 if inconclusive else 0)


if __name__ == "__main__":
    sys.exit(main())
