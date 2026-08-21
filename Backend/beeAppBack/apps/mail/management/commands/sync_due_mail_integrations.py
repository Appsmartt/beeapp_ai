from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from apps.mail.exceptions import MailSyncError
from apps.mail.services.mail_sync_service import (
    sync_due_mail_integrations,
)


class Command(BaseCommand):
    help = (
        "Sincroniza las integraciones Email activas que están "
        "pendientes de actualización."
    )

    def handle(self, *args, **options):
        try:
            result = sync_due_mail_integrations()
        except MailSyncError as error:
            raise CommandError(str(error)) from error

        self.stdout.write(
            self.style.SUCCESS(
                "Mail sync completed. "
                f"Processed: {result['processed_integration_count']}. "
                f"Synced: {result['synced_integration_count']}. "
                f"Failed: {result['failed_integration_count']}. "
                f"Messages: {result['synced_message_count']}."
            )
        )