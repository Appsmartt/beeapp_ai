from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from apps.calendar.exceptions import CalendarError
from apps.calendar.services.calendar_sync_service import (
    sync_due_calendar_integrations,
)


class Command(BaseCommand):
    help = (
        "Synchronizes active Google and Microsoft calendar "
        "integrations."
    )

    def handle(self, *args, **options):
        try:
            result = sync_due_calendar_integrations()
        except CalendarError as error:
            raise CommandError(str(error)) from error

        self.stdout.write(
            self.style.SUCCESS(
                "Calendar synchronization finished. "
                f"Processed={result['processed_integration_count']} "
                f"SyncedIntegrations="
                f"{result['synced_integration_count']} "
                f"FailedIntegrations="
                f"{result['failed_integration_count']} "
                f"SyncedEvents={result['synced_event_count']}"
            )
        )