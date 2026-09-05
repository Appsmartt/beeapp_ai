from django.core.management.base import BaseCommand, CommandError

from apps.commercial.exceptions import CommercialError
from apps.commercial.services.commercial_notification_service import (
    DEFAULT_COMMERCE_NOTIFICATION_BATCH_SIZE,
    MAX_COMMERCE_NOTIFICATION_BATCH_SIZE,
    process_commercial_notifications,
)


class Command(BaseCommand):
    help = (
        "Processes pending BuddyServices commercial notification "
        "deliveries into in-app notifications."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=DEFAULT_COMMERCE_NOTIFICATION_BATCH_SIZE,
            help=(
                "Maximum pending commercial deliveries to process "
                f"(1-{MAX_COMMERCE_NOTIFICATION_BATCH_SIZE})."
            ),
        )

    def handle(self, *args, **options):
        try:
            result = process_commercial_notifications(
                limit=options["limit"],
            )
        except CommercialError as error:
            raise CommandError(
                f"{error.code}: {error}"
            ) from error

        self.stdout.write(
            self.style.SUCCESS(
                "Commercial notification processing completed. "
                f"Loaded={result['loaded_count']} "
                f"Created={result['created_count']} "
                f"Sent={result['sent_count']} "
                f"Failed={result['failed_count']} "
                "ReusedExisting="
                f"{result['reused_existing_notification_count']}"
            )
        )

        for item in result["results"]:
            if item["status"] == "failed":
                self.stdout.write(
                    self.style.ERROR(
                        " - failed "
                        f"delivery_id={item.get('delivery_id')} "
                        f"error_code={item.get('error_code')} "
                        f"error={item.get('error_message')}"
                    )
                )
                continue

            self.stdout.write(
                " - processed "
                f"delivery_id={item.get('delivery_id')} "
                f"notification_id={item.get('notification_id')} "
                f"event_type={item.get('event_type')} "
                f"status={item.get('status')} "
                f"reused_existing="
                f"{item.get('reused_existing_notification')}"
            )
