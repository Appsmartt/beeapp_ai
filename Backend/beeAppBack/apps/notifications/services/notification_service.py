from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.notifications.exceptions import (
    NotificationLookupError,
    NotificationUpdateError,
    PushDeviceError,
)
from apps.notifications.services.expo_push_service import (
    send_expo_push_notifications,
    send_session_revoked_push_notifications,
)


NOTIFICATION_COLUMNS = (
    "id,module,type,title,body,metadata,read_at,"
    "push_sent_at,push_error,created_at,expires_at"
)

UPLOAD_NOTIFICATION_WINDOW_SECONDS = 30


def _supabase():
    return get_supabase_admin_client()



def send_mobile_session_revoked_push(
    *,
    tokens: list[str],
    revoked_device_session_ids: list[str],
) -> None:
    normalized_tokens = list(
        dict.fromkeys(
            str(token).strip()
            for token in tokens
            if str(token).strip()
        )
    )

    normalized_session_ids = list(
        dict.fromkeys(
            str(device_session_id).strip()
            for device_session_id in revoked_device_session_ids
            if str(device_session_id).strip()
        )
    )

    if not normalized_tokens or not normalized_session_ids:
        return

    try:
        send_session_revoked_push_notifications(
            tokens=normalized_tokens,
            revoked_device_session_ids=normalized_session_ids,
        )
    except Exception:
        # El cierre en servidor ya ocurrió. Un fallo de push no debe
        # deshacer ni impedir la revocación de la sesión anterior.
        return


def create_incoming_call_notification(
    *,
    recipient_id: str,
    call_id: str,
    conversation_id: str,
    call_type: str,
    caller_identity_id: str,
    caller_name: str,
) -> dict[str, Any]:
    normalized_call_type = str(call_type or "").strip().lower()

    if normalized_call_type not in {"voice", "video"}:
        raise NotificationUpdateError(
            "Incoming call type must be voice or video."
        )

    normalized_caller_name = (
        str(caller_name or "").strip()
        or "Un contacto"
    )

    call_label = (
        "Videollamada"
        if normalized_call_type == "video"
        else "Llamada de voz"
    )

    return create_module_notification(
        recipient_id=str(recipient_id),
        module="calls",
        notification_type="incoming_call",
        title="Llamada entrante",
        body=(
            f"{normalized_caller_name} te está llamando"
        ),
        metadata={
            "action": "open_incoming_call",
            "call_id": str(call_id),
            "conversation_id": str(conversation_id),
            "call_type": normalized_call_type,
            "caller_identity_id": str(caller_identity_id),
            "caller_name": normalized_caller_name,
            "call_label": call_label,
        },
        send_push=True,
    )


def create_storage_notification(
    *,
    recipient_id: str,
    notification_type: str,
    title: str,
    body: str,
    metadata: dict[str, Any] | None = None,
    send_push: bool = True,
) -> dict[str, Any]:
    return create_module_notification(
        recipient_id=recipient_id,
        module="storage",
        notification_type=notification_type,
        title=title,
        body=body,
        metadata=metadata,
        send_push=send_push,
    )


def create_calendar_notification(
    *,
    recipient_id: str,
    notification_type: str,
    title: str,
    body: str,
    metadata: dict[str, Any] | None = None,
    send_push: bool = True,
) -> dict[str, Any]:
    return create_module_notification(
        recipient_id=recipient_id,
        module="calendar",
        notification_type=notification_type,
        title=title,
        body=body,
        metadata=metadata,
        send_push=send_push,
    )


def create_mail_message_received_notification(
    *,
    recipient_id: str,
    message_id: str,
    mail_integration_id: str,
    provider: str,
    sender_name: str | None,
    sender_email: str | None,
    subject: str | None,
    body_preview: str | None,
    received_at: str | None,
) -> dict[str, Any] | None:
    normalized_message_id = str(message_id or "").strip()

    if not normalized_message_id:
        return None

    normalized_sender_name = str(sender_name or "").strip()
    normalized_sender_email = str(sender_email or "").strip()
    normalized_sender = (
        normalized_sender_name
        or normalized_sender_email
        or "un remitente"
    )

    normalized_subject = str(subject or "").strip()
    normalized_preview = str(body_preview or "").strip()

    title = (
        f"Nuevo correo de {normalized_sender}"
        if normalized_sender
        else "Nuevo correo"
    )

    if normalized_subject:
        body = normalized_subject[:180]
    elif normalized_preview:
        body = normalized_preview[:180]
    else:
        body = "Toca para abrir el correo."

    try:
        return create_module_notification(
            recipient_id=recipient_id,
            module="mail",
            notification_type="mail_message_received",
            title=title[:200],
            body=body,
            metadata={
                "message_id": normalized_message_id,
                "mail_integration_id": str(
                    mail_integration_id or ""
                ).strip(),
                "provider": str(provider or "").strip().lower(),
                "sender_name": normalized_sender_name or None,
                "sender_email": normalized_sender_email or None,
                "subject": normalized_subject or None,
                "received_at": received_at,
                "action": "open_mail_message",
            },
            send_push=True,
        )
    except NotificationUpdateError:
        return None


def create_or_update_upload_success_notification(
    *,
    recipient_id: str,
    uploaded_files: list[dict[str, Any]],
) -> dict[str, Any]:
    if not uploaded_files:
        raise NotificationUpdateError(
            "At least one uploaded file is required."
        )

    try:
        supabase = _supabase()

        since = (
            datetime.now(timezone.utc)
            - timedelta(
                seconds=UPLOAD_NOTIFICATION_WINDOW_SECONDS,
            )
        ).isoformat()

        existing_response = (
            supabase.table("notifications")
            .select(NOTIFICATION_COLUMNS)
            .eq("recipient_id", recipient_id)
            .eq("module", "storage")
            .eq("type", "upload_success")
            .is_("read_at", "null")
            .gte("created_at", since)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        existing_notification = (
            existing_response.data[0]
            if existing_response.data
            else None
        )

        names = [
            file_record.get("display_name")
            or file_record.get("original_name")
            or "Archivo"
            for file_record in uploaded_files
        ]

        file_ids = [
            file_record["id"]
            for file_record in uploaded_files
            if file_record.get("id")
        ]

        if existing_notification:
            previous_metadata = (
                existing_notification.get("metadata")
                or {}
            )

            previous_names = (
                previous_metadata.get("file_names")
                or []
            )

            previous_ids = (
                previous_metadata.get("file_ids")
                or []
            )

            merged_names = list(
                dict.fromkeys(previous_names + names)
            )

            merged_ids = list(
                dict.fromkeys(previous_ids + file_ids)
            )

            upload_count = (
                int(
                    previous_metadata.get(
                        "upload_count",
                        len(previous_names),
                    )
                )
                + len(uploaded_files)
            )

            title, body = _upload_notification_content(
                count=upload_count,
                file_names=merged_names,
            )

            update_response = (
                supabase.table("notifications")
                .update(
                    {
                        "title": title,
                        "body": body,
                        "metadata": {
                            **previous_metadata,
                            "upload_count": upload_count,
                            "file_ids": merged_ids,
                            "file_names": merged_names,
                            "window_seconds": (
                                UPLOAD_NOTIFICATION_WINDOW_SECONDS
                            ),
                        },
                    }
                )
                .eq("id", existing_notification["id"])
                .execute()
            )

            if not update_response.data:
                raise NotificationUpdateError(
                    "Could not update upload notification."
                )

            return update_response.data[0]

        title, body = _upload_notification_content(
            count=len(uploaded_files),
            file_names=names,
        )

        return create_storage_notification(
            recipient_id=recipient_id,
            notification_type="upload_success",
            title=title,
            body=body,
            metadata={
                "upload_count": len(uploaded_files),
                "file_ids": file_ids,
                "file_names": names,
                "window_seconds": (
                    UPLOAD_NOTIFICATION_WINDOW_SECONDS
                ),
            },
        )

    except NotificationUpdateError:
        raise

    except Exception as error:
        raise NotificationUpdateError(
            "Could not create upload notification."
        ) from error


def list_notifications(
    *,
    recipient_id: str,
    module: str | None = None,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    try:
        supabase = _supabase()

        query = (
            supabase.table("notifications")
            .select(
                NOTIFICATION_COLUMNS,
                count="exact",
            )
            .eq("recipient_id", recipient_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if module:
            query = query.eq("module", module)

        if unread_only:
            query = query.is_("read_at", "null")

        response = query.execute()

        return {
            "notifications": response.data or [],
            "count": response.count or 0,
            "limit": limit,
            "offset": offset,
        }

    except Exception as error:
        raise NotificationLookupError(
            "Could not retrieve notifications."
        ) from error


def get_unread_notification_count(
    *,
    recipient_id: str,
    module: str | None = None,
) -> int:
    try:
        supabase = _supabase()

        query = (
            supabase.table("notifications")
            .select(
                "id",
                count="exact",
            )
            .eq("recipient_id", recipient_id)
            .is_("read_at", "null")
        )

        if module:
            query = query.eq("module", module)

        response = query.execute()

        return response.count or 0

    except Exception as error:
        raise NotificationLookupError(
            "Could not retrieve unread notification count."
        ) from error


def mark_notification_as_read(
    *,
    recipient_id: str,
    notification_id: str,
) -> dict[str, Any]:
    try:
        supabase = _supabase()

        response = (
            supabase.table("notifications")
            .update(
                {
                    "read_at": "now()",
                }
            )
            .eq("id", notification_id)
            .eq("recipient_id", recipient_id)
            .is_("read_at", "null")
            .execute()
        )

        if response.data:
            return response.data[0]

        existing = (
            supabase.table("notifications")
            .select(NOTIFICATION_COLUMNS)
            .eq("id", notification_id)
            .eq("recipient_id", recipient_id)
            .maybe_single()
            .execute()
        )

        if not existing.data:
            raise NotificationUpdateError(
                "Notification was not found."
            )

        return existing.data

    except NotificationUpdateError:
        raise

    except Exception as error:
        raise NotificationUpdateError(
            "Could not mark notification as read."
        ) from error


def mark_all_notifications_as_read(
    *,
    recipient_id: str,
    module: str | None = None,
) -> int:
    try:
        supabase = _supabase()

        query = (
            supabase.table("notifications")
            .update(
                {
                    "read_at": "now()",
                }
            )
            .eq("recipient_id", recipient_id)
            .is_("read_at", "null")
        )

        if module:
            query = query.eq("module", module)

        response = query.execute()

        return len(response.data or [])

    except Exception as error:
        raise NotificationUpdateError(
            "Could not mark notifications as read."
        ) from error


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
        supabase = _supabase()

        existing = (
            supabase.table("push_devices")
            .select("id,user_id")
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
            existing.data
            if existing is not None
            else None
        )

        if existing_device:
            response = (
                supabase.table("push_devices")
                .update(payload)
                .eq("id", existing_device["id"])
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
                "Supabase did not return the registered push device."
            )

        return response.data[0]

    except PushDeviceError:
        raise

    except Exception as error:
        print(
            "[push_devices] ERROR:",
            repr(error),
            flush=True,
        )
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
            _supabase()
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


def _upload_notification_content(
    *,
    count: int,
    file_names: list[str],
) -> tuple[str, str]:
    if count == 1:
        return (
            "Archivo subido",
            f"{file_names[0]} se subió correctamente.",
        )

    return (
        "Archivos subidos",
        f"Se subieron {count} archivos correctamente.",
    )


def create_module_notification(
    *,
    recipient_id: str,
    module: str,
    notification_type: str,
    title: str,
    body: str,
    metadata: dict[str, Any] | None = None,
    send_push: bool = True,
) -> dict[str, Any]:
    try:
        supabase = _supabase()

        response = (
            supabase.table("notifications")
            .insert(
                {
                    "recipient_id": recipient_id,
                    "module": module,
                    "type": notification_type,
                    "title": title,
                    "body": body,
                    "metadata": metadata or {},
                }
            )
            .execute()
        )

        if not response.data:
            raise NotificationUpdateError(
                "Supabase did not return the created notification."
            )

        notification = response.data[0]

        if send_push:
            _send_module_push(
                recipient_id=recipient_id,
                notification=notification,
            )

        return notification

    except NotificationUpdateError:
        raise

    except Exception as error:
        raise NotificationUpdateError(
            f"Could not create {module} notification."
        ) from error


def _send_module_push(
    *,
    recipient_id: str,
    notification: dict[str, Any],
) -> None:
    try:
        supabase = _supabase()

        devices_response = (
            supabase.table("push_devices")
            .select("id,expo_push_token")
            .eq("user_id", recipient_id)
            .eq("is_active", True)
            .execute()
        )

        tokens = [
            device["expo_push_token"]
            for device in (devices_response.data or [])
        ]

        if not tokens:
            return

        notification_module = str(
            notification.get("module") or ""
        ).strip()

        notification_type = str(
            notification.get("type") or ""
        ).strip()

        channel_id = (
            "incoming-calls"
            if (
                notification_module == "calls"
                and notification_type == "incoming_call"
            )
            else None
        )

        result = send_expo_push_notifications(
            tokens=tokens,
            title=notification["title"],
            body=notification["body"],
            data={
                "notification_id": notification["id"],
                "module": notification_module,
                "type": notification_type,
                **(notification.get("metadata") or {}),
            },
            channel_id=channel_id,
        )

        if result["sent_tokens"]:
            (
                supabase.table("notifications")
                .update(
                    {
                        "push_sent_at": "now()",
                        "push_error": None,
                    }
                )
                .eq("id", notification["id"])
                .execute()
            )

        for failed_token, error_message in (
            result["failed_tokens"].items()
        ):
            (
                supabase.table("push_devices")
                .update(
                    {
                        "is_active": False,
                        "last_seen_at": "now()",
                    }
                )
                .eq("expo_push_token", failed_token)
                .execute()
            )

            (
                supabase.table("notifications")
                .update(
                    {
                        "push_error": error_message,
                    }
                )
                .eq("id", notification["id"])
                .execute()
            )

    except Exception:
        return