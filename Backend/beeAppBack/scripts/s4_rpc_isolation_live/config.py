import hashlib
from pathlib import Path

ROOT = Path.home() / "Git" / "beeapp_ai"
ENV_FILE = ROOT / "Fronted" / ".env"
EXPECTED_SUPABASE_HOST = "elwnmmznlqihruveqlye.supabase.co"
ACTIVE_KEY_SHA256 = (
    "517ea5490c17c69abb982af86eb88f7bd968cd7c0d0335b468703cb754b3e72c"
)
ACTIVE_PUBLISHABLE_KEY = "sb_publishable_ekMgCZZJ9QLPmpCYViHGRw_O2dNnG2O"
REQUIRED_ENVIRONMENT_NAMES = (
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    "EXPO_PUBLIC_API_BASE_URL",
)


def read_environment_values(path=ENV_FILE):
    values = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def resolve_runtime_config(reporter, path=ENV_FILE):
    config = read_environment_values(path)
    missing = [
        name for name in REQUIRED_ENVIRONMENT_NAMES
        if not config.get(name)
    ]
    if missing:
        reporter.fail("configuración", "faltan: " + ", ".join(missing))
        return None

    supabase_url = config["EXPO_PUBLIC_SUPABASE_URL"].rstrip("/")
    if not supabase_url.endswith(EXPECTED_SUPABASE_HOST):
        reporter.fail("configuración", "proyecto Supabase inesperado")
        return None

    configured_key = config["EXPO_PUBLIC_SUPABASE_ANON_KEY"]
    key_hash = hashlib.sha256(configured_key.encode()).hexdigest()
    if key_hash == ACTIVE_KEY_SHA256:
        anon_key = configured_key
        reporter.check("clave pública", True, "coincide con clave activa")
    else:
        anon_key = ACTIVE_PUBLISHABLE_KEY
        reporter.warn(
            "clave pública",
            "la de Fronted/.env no coincide; "
            "el test usa la publishable activa sin modificar .env",
        )

    api_base = config["EXPO_PUBLIC_API_BASE_URL"].rstrip("/")
    if not api_base.endswith("/api"):
        api_base += "/api"

    return {
        "supabase_url": supabase_url,
        "anon_key": anon_key,
        "api_base": api_base,
    }
