from __future__ import annotations

from collections import defaultdict
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.chat.exceptions import ChatPushError
from apps.notifications.services.expo_push_service import (
    send_expo_push_notifications,
)


def _supabase():
    return get_supabase_admin_client()


def _response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def process_chat_push_notifications(
    *,
    limit: int = 50,
) -> dict[str, Any]:
    """
    Procesa filas `pending` de chat_message_notifications.

    Flujo:
    1. claim_chat_push_notifications(limit) marca filas como `created`
       y devuelve una fila por dispositivo push activo.
    2. Agrupa por notificación de chat, porque una misma notificación
       puede ir a varios dispositivos de un mismo usuario.
    3. Envía una solicitud Expo por grupo de payload igual.
    4. Marca cada fila de cola enviada o fallida con
       complete_chat_push_notification().

    Importante:
    - Las RPC SQL exigen `service_role`.
    - Este backend usa get_supabase_admin_client(), por lo que cumple.
    - Una fila puede producir varios tokens; si al menos uno recibe
      confirmación de Expo, la cola se marca `sent`.
    """
    if limit < 1 or limit > 500:
        raise ChatPushError(
            "Push processing limit must be between 1 and 500."
        )

    try:
        supabase = _supabase()

        claim_response = supabase.rpc(
            "claim_chat_push_notifications",
            {
                "p_limit": int(limit),
            },
        ).execute()

        claimed_rows = _response_rows(claim_response)

        if not claimed_rows:
            return {
                "claimed_count": 0,
                "notification_count": 0,
                "sent_count": 0,
                "failed_count": 0,
                "deactivated_token_count": 0,
                "results": [],
            }

        rows_by_notification: dict[
            str,
            list[dict[str, Any]],
        ] = defaultdict(list)

        for row in claimed_rows:
            notification_id = row.get("chat_notification_id")

            if notification_id:
                rows_by_notification[
                    str(notification_id)
                ].append(row)

        sent_count = 0
        failed_count = 0
        deactivated_token_count = 0
        results: list[dict[str, Any]] = []

        for chat_notification_id, rows in rows_by_notification.items():
            result = _process_single_chat_notification(
                chat_notification_id=chat_notification_id,
                rows=rows,
            )

            results.append(result)

            if result["status"] == "sent":
                sent_count += 1

            else:
                failed_count += 1

            deactivated_token_count += result[
                "deactivated_token_count"
            ]

        return {
            "claimed_count": len(claimed_rows),
            "notification_count": len(rows_by_notification),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "deactivated_token_count": deactivated_token_count,
            "results": results,
        }

    except ChatPushError:
        raise

    except Exception as error:
        raise ChatPushError(
            f"Could not process chat push notifications: {error}"
        ) from error


def _process_single_chat_notification(
    *,
    chat_notification_id: str,
    rows: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Procesa una fila lógica de chat_message_notifications que puede haber
    sido expandida a múltiples filas por múltiples push_devices.
    """
    try:
        supabase = _supabase()

        first_row = rows[0]

        tokens = list(
            dict.fromkeys(
                str(row["expo_push_token"]).strip()
                for row in rows
                if str(
                    row.get("expo_push_token") or ""
                ).strip()
            )
        )

        title = (
            str(first_row.get("notification_title") or "").strip()
            or "BeeApp"
        )
        body = (
            str(first_row.get("notification_body") or "").strip()
            or "Nuevo mensaje"
        )
        metadata = first_row.get("notification_metadata") or {}

        if not isinstance(metadata, dict):
            metadata = {}

        if not tokens:
            _complete_chat_push_notification(
                chat_notification_id=chat_notification_id,
                success=False,
                error_message="No active Expo push devices were found.",
            )

            return {
                "chat_notification_id": chat_notification_id,
                "status": "failed",
                "token_count": 0,
                "sent_token_count": 0,
                "failed_token_count": 0,
                "deactivated_token_count": 0,
                "error": "No active Expo push devices were found.",
            }

        push_result = send_expo_push_notifications(
            tokens=tokens,
            title=title,
            body=body,
            data={
                "module": "chat",
                **metadata,
            },
        )

        sent_tokens = push_result.get("sent_tokens") or []
        failed_tokens = push_result.get("failed_tokens") or {}

        deactivated_token_count = _deactivate_failed_tokens(
            failed_tokens=failed_tokens,
        )

        if sent_tokens:
            _complete_chat_push_notification(
                chat_notification_id=chat_notification_id,
                success=True,
                error_message=None,
            )

            notification_status = "sent"
            error_message = None

        else:
            error_message = _build_push_error_message(
                failed_tokens=failed_tokens,
            )

            _complete_chat_push_notification(
                chat_notification_id=chat_notification_id,
                success=False,
                error_message=error_message,
            )

            notification_status = "failed"

        return {
            "chat_notification_id": chat_notification_id,
            "status": notification_status,
            "token_count": len(tokens),
            "sent_token_count": len(sent_tokens),
            "failed_token_count": len(failed_tokens),
            "deactivated_token_count": deactivated_token_count,
            "error": error_message,
        }

    except Exception as error:
        error_message = str(error)[:2_000]

        try:
            _complete_chat_push_notification(
                chat_notification_id=chat_notification_id,
                success=False,
                error_message=error_message,
            )
        except Exception:
            pass

        return {
            "chat_notification_id": chat_notification_id,
            "status": "failed",
            "token_count": 0,
            "sent_token_count": 0,
            "failed_token_count": 0,
            "deactivated_token_count": 0,
            "error": error_message,
        }


def _complete_chat_push_notification(
    *,
    chat_notification_id: str,
    success: bool,
    error_message: str | None,
) -> None:
    response = _supabase().rpc(
        "complete_chat_push_notification",
        {
            "p_chat_notification_id": str(
                chat_notification_id
            ),
            "p_success": bool(success),
            "p_error": error_message,
        },
    ).execute()

    if response.data is not True:
        raise ChatPushError(
            "Chat push notification completion was not confirmed."
        )


def _deactivate_failed_tokens(
    *,
    failed_tokens: dict[str, str],
) -> int:
    """
    Mantiene la misma estrategia que notifications.notification_service:
    si Expo marca error para un token, se desactiva para no insistir.

    En una mejora posterior se puede distinguir:
    - DeviceNotRegistered: desactivar inmediatamente.
    - Error transitorio de red: conservar token.
    """
    if not failed_tokens:
        return 0

    deactivated_count = 0
    supabase = _supabase()

    for token in failed_tokens:
        response = (
            supabase.table("push_devices")
            .update(
                {
                    "is_active": False,
                    "last_seen_at": "now()",
                }
            )
            .eq("expo_push_token", token)
            .eq("is_active", True)
            .execute()
        )

        if _response_rows(response):
            deactivated_count += 1

    return deactivated_count


def _build_push_error_message(
    *,
    failed_tokens: dict[str, str],
) -> str:
    if not failed_tokens:
        return "Expo did not confirm push notification delivery."

    unique_errors = list(
        dict.fromkeys(
            str(error).strip()
            for error in failed_tokens.values()
            if str(error).strip()
        )
    )

    if not unique_errors:
        return "Expo push notification failed."

    return "; ".join(unique_errors)[:2_000]