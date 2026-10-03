from __future__ import annotations

import logging
from typing import Any

from apps.mail.exceptions import (
    MailIntegrationInactiveError,
    MailIntegrationNotFoundError,
    MailSyncError,
)
from apps.mail.services.mail_provider_service import MailProviderError

from .database import (
    create_sync_run,
    get_due_mail_integrations,
    get_mail_integration,
    mark_mail_integration_sync_failure,
    mark_mail_integration_sync_success,
    mark_sync_run_failed,
    mark_sync_run_succeeded,
)
from .message_persistence import upsert_provider_message
from .notifications import create_new_mail_notification
from .providers import (
    get_mail_provider,
    get_provider_message,
    get_provider_message_ids,
    get_sync_window,
    get_valid_access_token,
)


logger = logging.getLogger(__name__)


def sync_mail_integration(
    *,
    user_id: str,
    integration_id: str,
    trigger: str = "manual",
    force_full_sync: bool = False,
) -> dict[str, Any]:
    integration = get_mail_integration(
        user_id=user_id,
        integration_id=integration_id,
    )
    (
        after,
        max_messages,
        max_spam_messages,
        initial_sync,
    ) = get_sync_window(
        integration=integration,
        force_full_sync=force_full_sync,
    )
    sync_run = create_sync_run(
        user_id=user_id,
        integration=integration,
        trigger=trigger,
        is_full_sync=initial_sync,
    )
    sync_run_id = str(sync_run["id"])
    counts = {
        "fetched": 0,
        "created": 0,
        "updated": 0,
        "deleted": 0,
        "skipped": 0,
    }

    logger.info(
        "Mail sync started. integration_id=%s provider=%s "
        "trigger=%s initial_sync=%s max_messages=%s "
        "max_spam_messages=%s after=%s",
        integration_id,
        integration["provider"],
        trigger,
        initial_sync,
        max_messages,
        max_spam_messages,
        after.isoformat(),
    )

    try:
        access_token = get_valid_access_token(
            user_id=user_id,
            integration=integration,
        )
        provider = get_mail_provider(str(integration["provider"]))
        (
            provider_message_ids,
            cursor_after,
            source_counts,
        ) = get_provider_message_ids(
            provider=provider,
            access_token=access_token,
            after=after,
            max_messages=max_messages,
            max_spam_messages=max_spam_messages,
        )

        logger.info(
            "Mail sync listed provider messages. "
            "integration_id=%s provider=%s normal=%s spam=%s unique=%s",
            integration_id,
            integration["provider"],
            source_counts["normal_message_count"],
            source_counts["spam_message_count"],
            source_counts["unique_message_count"],
        )

        for index, provider_message_id in enumerate(
            provider_message_ids,
            start=1,
        ):
            try:
                provider_message = get_provider_message(
                    provider=provider,
                    access_token=access_token,
                    provider_message_id=provider_message_id,
                    load_attachments=True,
                )
                (
                    created,
                    skipped,
                    saved_message_id,
                ) = upsert_provider_message(
                    user_id=user_id,
                    integration=integration,
                    provider_message=provider_message,
                )
                counts["fetched"] += 1

                if skipped:
                    counts["skipped"] += 1
                elif created:
                    counts["created"] += 1

                    if saved_message_id:
                        create_new_mail_notification(
                            user_id=user_id,
                            integration=integration,
                            message_id=saved_message_id,
                            provider_message=provider_message,
                            initial_sync=initial_sync,
                        )
                else:
                    counts["updated"] += 1

                logger.info(
                    "Mail sync progress. integration_id=%s "
                    "message=%s/%s created=%s updated=%s skipped=%s",
                    integration_id,
                    index,
                    len(provider_message_ids),
                    counts["created"],
                    counts["updated"],
                    counts["skipped"],
                )
            except MailProviderError as error:
                counts["skipped"] += 1
                logger.warning(
                    "Mail provider message skipped. "
                    "provider=%s integration_id=%s "
                    "provider_message_id=%s error=%s",
                    integration["provider"],
                    integration_id,
                    provider_message_id,
                    str(error),
                )
            except MailSyncError as error:
                counts["skipped"] += 1
                logger.warning(
                    "Mail persistence message skipped. "
                    "provider=%s integration_id=%s "
                    "provider_message_id=%s error=%s",
                    integration["provider"],
                    integration_id,
                    provider_message_id,
                    str(error),
                )

        mark_mail_integration_sync_success(
            integration_id=integration_id,
            cursor_after=cursor_after,
            initial_sync=initial_sync,
        )
        completed_sync_run = mark_sync_run_succeeded(
            sync_run_id=sync_run_id,
            counts=counts,
            cursor_after=cursor_after,
            metadata={
                "provider": integration["provider"],
                "after": after.isoformat(),
                "max_messages": max_messages,
                "max_spam_messages": max_spam_messages,
                "initial_sync": initial_sync,
                "normal_message_id_count": (
                    source_counts["normal_message_count"]
                ),
                "spam_message_id_count": (
                    source_counts["spam_message_count"]
                ),
                "unique_message_id_count": (
                    source_counts["unique_message_count"]
                ),
                "attachment_metadata_loaded": True,
                "attachment_content_downloaded": False,
            },
        )

        logger.info(
            "Mail sync completed. integration_id=%s provider=%s "
            "fetched=%s created=%s updated=%s skipped=%s",
            integration_id,
            integration["provider"],
            counts["fetched"],
            counts["created"],
            counts["updated"],
            counts["skipped"],
        )

        return {
            "integration_id": integration_id,
            "provider": integration["provider"],
            "sync_run": completed_sync_run or sync_run,
            "fetched_message_count": counts["fetched"],
            "created_message_count": counts["created"],
            "updated_message_count": counts["updated"],
            "skipped_message_count": counts["skipped"],
            "initial_sync": initial_sync,
            "cursor_after": cursor_after,
        }
    except (
        MailIntegrationInactiveError,
        MailIntegrationNotFoundError,
    ):
        mark_sync_run_failed(
            sync_run_id=sync_run_id,
            error_code="integration_inactive",
            error_message=(
                "La integración de Email no está disponible."
            ),
        )
        raise
    except MailProviderError as error:
        mark_mail_integration_sync_failure(
            integration_id=integration_id,
            error_code="provider_error",
            error_message=str(error),
        )
        mark_sync_run_failed(
            sync_run_id=sync_run_id,
            error_code="provider_error",
            error_message=str(error),
        )
        logger.exception(
            "Mail sync provider failure. integration_id=%s",
            integration_id,
        )
        raise MailSyncError(str(error)) from error
    except MailSyncError as error:
        mark_mail_integration_sync_failure(
            integration_id=integration_id,
            error_code="mail_sync_error",
            error_message=str(error),
        )
        mark_sync_run_failed(
            sync_run_id=sync_run_id,
            error_code="mail_sync_error",
            error_message=str(error),
        )
        logger.exception(
            "Mail sync persistence failure. integration_id=%s",
            integration_id,
        )
        raise
    except Exception as error:
        mark_mail_integration_sync_failure(
            integration_id=integration_id,
            error_code="unexpected_sync_error",
            error_message=str(error),
        )
        mark_sync_run_failed(
            sync_run_id=sync_run_id,
            error_code="unexpected_sync_error",
            error_message=str(error),
        )
        logger.exception(
            "Mail sync unexpected failure. integration_id=%s",
            integration_id,
        )
        raise MailSyncError(
            "No fue posible sincronizar la cuenta de Email."
        ) from error


def sync_due_mail_integrations() -> dict[str, int]:
    integrations = get_due_mail_integrations()
    processed_count = 0
    synced_count = 0
    failed_count = 0
    message_count = 0

    for integration in integrations:
        processed_count += 1

        try:
            result = sync_mail_integration(
                user_id=str(integration["user_id"]),
                integration_id=str(integration["id"]),
                trigger="scheduled",
                force_full_sync=False,
            )
            synced_count += 1
            message_count += int(
                result["created_message_count"]
            ) + int(result["updated_message_count"])
        except MailSyncError:
            failed_count += 1

    return {
        "processed_integration_count": processed_count,
        "synced_integration_count": synced_count,
        "failed_integration_count": failed_count,
        "synced_message_count": message_count,
    }
