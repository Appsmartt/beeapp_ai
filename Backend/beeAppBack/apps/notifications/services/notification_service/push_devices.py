from __future__ import annotations
from apps.notifications.services.notification_service import database



from typing import Any

from apps.notifications.exceptions import PushDeviceError


def register_push_device(
    *,
    user_id: str,
    device_session_id: str,
    expo_push_token: str,
    platform: str,
    device_id: str | None = None,
    app_version: str | None = None,
) -> dict[str, Any]:
    try:
        supabase = database.get_supabase()
        existing = (
            supabase.table("push_devices")
            .select("id,user_id,device_session_id")
            .eq("expo_push_token", expo_push_token)
            .maybe_single()
            .execute()
        )
        payload = {
            "user_id": user_id,
            "device_session_id": device_session_id,
            "expo_push_token": expo_push_token,
            "platform": platform,
            "device_id": device_id,
            "app_version": app_version,
            "is_active": True,
            "last_seen_at": "now()",
        }
        existing_device = (
            existing.data if existing is not None else None
        )

        if existing_device:
            existing_user_id = str(
                existing_device.get("user_id") or ""
            ).strip()

            if existing_user_id != str(user_id).strip():
                raise PushDeviceError(
                    "Push device ownership mismatch."
                )

            response = (
                supabase.table("push_devices")
                .update(
                    {
                        "device_session_id": device_session_id,
                        "platform": platform,
                        "device_id": device_id,
                        "app_version": app_version,
                        "is_active": True,
                        "last_seen_at": "now()",
                    }
                )
                .eq("id", existing_device["id"])
                .eq("user_id", user_id)
                .execute()
            )
        else:
            response = (
                supabase.table("push_devices")
                .insert(payload)
                .execute()
            )

        if not response or not response.data:
            raise PushDeviceError(
                "Push device registration was not completed."
            )

        return response.data[0]

    except PushDeviceError:
        raise

    except Exception as error:
        print("[push_devices] ERROR:", repr(error), flush=True)
        raise PushDeviceError(
            "Could not register push device."
        ) from error


def deactivate_push_device(
    *,
    user_id: str,
    expo_push_token: str,
) -> None:
    try:
        (
            database.get_supabase()
            .table("push_devices")
            .update(
                {
                    "is_active": False,
                    "last_seen_at": "now()",
                }
            )
            .eq("user_id", user_id)
            .eq("expo_push_token", expo_push_token)
            .execute()
        )

    except Exception as error:
        raise PushDeviceError(
            "Could not deactivate push device."
        ) from error
