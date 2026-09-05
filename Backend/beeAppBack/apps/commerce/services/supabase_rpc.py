from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests
from django.conf import settings


class SupabaseRPCError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int = 502,
        code: str | None = None,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


@dataclass(frozen=True)
class SupabaseRPCClient:
    access_token: str

    @property
    def base_url(self) -> str:
        return settings.SUPABASE_URL.rstrip("/")

    @property
    def headers(self) -> dict[str, str]:
        return {
            "apikey": settings.SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    def call(self, function_name: str, payload: dict[str, Any]) -> Any:
        url = f"{self.base_url}/rest/v1/rpc/{function_name}"

        try:
            response = requests.post(
                url,
                headers=self.headers,
                json=payload,
                timeout=settings.SUPABASE_RPC_TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            raise SupabaseRPCError(
                "No fue posible comunicarse con Supabase.",
                status_code=503,
                code="SUPABASE_UNAVAILABLE",
            ) from exc

        if response.ok:
            if not response.content:
                return None

            try:
                return response.json()
            except ValueError as exc:
                raise SupabaseRPCError(
                    "Supabase devolvió una respuesta inválida.",
                    status_code=502,
                    code="SUPABASE_INVALID_RESPONSE",
                ) from exc

        try:
            error_payload = response.json()
        except ValueError:
            error_payload = {
                "message": response.text or "Supabase rechazó la operación."
            }

        postgres_code = error_payload.get("code")
        message = (
            error_payload.get("message")
            or error_payload.get("hint")
            or "Supabase rechazó la operación."
        )

        raise SupabaseRPCError(
            message,
            status_code=self._map_postgrest_status(
                response.status_code,
                postgres_code,
            ),
            code=postgres_code,
            details=error_payload,
        )

    @staticmethod
    def _map_postgrest_status(
        upstream_status: int,
        postgres_code: str | None,
    ) -> int:
        if postgres_code in {"28000", "42501"}:
            return 403

        if postgres_code == "P0002":
            return 404

        if postgres_code in {"22001", "22003", "22004", "22023", "23514"}:
            return 400

        if postgres_code == "55000":
            return 409

        if upstream_status in {400, 401, 403, 404, 409, 422}:
            return upstream_status

        return 502
