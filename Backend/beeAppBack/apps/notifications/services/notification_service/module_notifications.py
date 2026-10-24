from __future__ import annotations
from apps.notifications.services.notification_service import database



from typing import Any

from apps.notifications.exceptions import NotificationUpdateError
from apps.notifications.services.notification_service.push_delivery import (
    send_module_push,
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
        response = (
            database.get_supabase()
            .table("notifications")
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
            send_module_push(
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
        body=f"{normalized_caller_name} te está llamando",
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

    title = f"Nuevo correo de {normalized_sender}"

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
