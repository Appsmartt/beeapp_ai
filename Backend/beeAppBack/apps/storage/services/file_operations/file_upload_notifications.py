from __future__ import annotations

from typing import Any

from apps.notifications.services.notification_service import (
    create_or_update_upload_success_notification,
    create_storage_notification,
)


def _notify_upload_results_safely(
    *,
    user_id: str,
    successful_files: list[dict[str, Any]],
    failed_files: list[dict[str, str]],
) -> None:
    if successful_files:
        try:
            create_or_update_upload_success_notification(
                recipient_id=user_id,
                uploaded_files=successful_files,
            )
        except Exception:
            pass

    if failed_files:
        try:
            failed_names = [
                failed_file["name"]
                for failed_file in failed_files
            ]

            create_storage_notification(
                recipient_id=user_id,
                notification_type="upload_failed",
                title="Error al subir archivos",
                body=(
                    f"No se pudieron subir "
                    f"{len(failed_files)} archivo(s): "
                    f"{', '.join(failed_names[:3])}."
                ),
                metadata={
                    "failed_count": len(failed_files),
                    "failed_files": failed_files,
                },
            )
        except Exception:
            pass
