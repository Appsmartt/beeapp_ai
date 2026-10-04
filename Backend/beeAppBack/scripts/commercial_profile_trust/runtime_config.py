from __future__ import annotations

import ipaddress
import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[4]
ENV_FILE = ROOT / "Fronted" / ".env"


@dataclass(frozen=True)
class RuntimeConfig:
    api_base_url: str
    supabase_url: str
    anon_key: str


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def is_private_backend_url(url: str) -> bool:
    parsed = urlsplit(url)
    host = parsed.hostname or ""
    try:
        address = ipaddress.ip_address(host)
        private_host = address.is_private or address.is_loopback
    except ValueError:
        private_host = host.lower() == "localhost"
    return parsed.scheme == "http" and private_host


def load_runtime_config() -> RuntimeConfig:
    values = read_env(ENV_FILE)
    api_base_url = os.environ.get(
        "BEEAPP_API_BASE_URL",
        values["EXPO_PUBLIC_API_BASE_URL"],
    ).rstrip("/")
    supabase_url = values["EXPO_PUBLIC_SUPABASE_URL"].rstrip("/")
    anon_key = values["EXPO_PUBLIC_SUPABASE_ANON_KEY"]
    if not api_base_url.startswith("https://") and not is_private_backend_url(
        api_base_url
    ):
        raise RuntimeError("Backend outside the allowed private network.")
    if not supabase_url.startswith("https://"):
        raise RuntimeError("Supabase must use HTTPS.")
    return RuntimeConfig(
        api_base_url=api_base_url,
        supabase_url=supabase_url,
        anon_key=anon_key,
    )


def login_url(config: RuntimeConfig) -> str:
    suffix = "/accounts/login/" if config.api_base_url.endswith("/api") else "/api/accounts/login/"
    return config.api_base_url + suffix
