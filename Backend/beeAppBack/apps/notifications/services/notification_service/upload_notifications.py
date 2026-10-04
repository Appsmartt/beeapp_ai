from __future__ import annotations
from apps.notifications.services.notification_service import database



from datetime import datetime, timedelta, timezone
from typing import Any

from apps.notifications.exceptions import NotificationUpdateError
from apps.notifications.services.notification_service.database import (
    NOTIFICATION_COLUMNS,
    get_supabase,
)
from apps.notifications.services.notification_service.module_notifications import (
    create_storage_notification,
)


UPLOAD_NOTIFICATION_WINDOW_SECONDS = 30


def upload_notification_content(
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
        supabase = database.get_supabase()
        since = (
            datetime.now(timezone.utc)
            - timedelta(seconds=UPLOAD_NOTIFICATION_WINDOW_SECONDS)
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
                existing_notification.get("metadata") or {}
            )
            previous_names = previous_metadata.get("file_names") or []
            previous_ids = previous_metadata.get("file_ids") or []
            merged_names = list(
                dict.fromkeys(previous_names + names)
            )
            merged_ids = list(dict.fromkeys(previous_ids + file_ids))
            upload_count = (
                int(
                    previous_metadata.get(
                        "upload_count",
                        len(previous_names),
                    )
                )
                + len(uploaded_files)
            )
            title, body = upload_notification_content(
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

        title, body = upload_notification_content(
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
                "window_seconds": UPLOAD_NOTIFICATION_WINDOW_SECONDS,
            },
        )

    except NotificationUpdateError:
        raise

    except Exception as error:
        raise NotificationUpdateError(
            "Could not create upload notification."
        ) from error
