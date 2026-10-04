import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
FRONTEND_ENV = ROOT / "Fronted/apps/mobile/.env"
PROJECT_REF = "elwnmmznlqihruveqlye"
BACKEND_URL = os.environ.get("BEEAPP_BASE_URL", "http://127.0.0.1:8000").rstrip("/")


def load_frontend_config():
    if not FRONTEND_ENV.is_file():
        raise RuntimeError("FRONTEND_ENV_NOT_FOUND")

    values = {}
    pattern = re.compile(
        r"^\s*(?:export\s+)?"
        r"(EXPO_PUBLIC_SUPABASE_URL|EXPO_PUBLIC_SUPABASE_ANON_KEY)"
        r"\s*=\s*(.*?)\s*$"
    )

    for line in FRONTEND_ENV.read_text(
        encoding="utf-8"
    ).splitlines():
        match = pattern.match(line)
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
