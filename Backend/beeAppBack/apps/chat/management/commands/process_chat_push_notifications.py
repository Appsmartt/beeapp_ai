from django.core.management.base import BaseCommand, CommandError

from apps.chat.exceptions import ChatPushError
from apps.chat.services.chat_push_service import (
    process_chat_push_notifications,
)


class Command(BaseCommand):
    help = (
        "Claims pending chat push notifications, sends them through "
        "Expo Push, and stores completion status in Supabase."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=50,
            help=(
                "Maximum pending chat notifications to claim. "
                "Must be between 1 and 500."
            ),
        )

        parser.add_argument(
            "--quiet",
            action="store_true",
            help="Only return a non-zero exit status on failure.",
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        quiet = options["quiet"]

        try:
            result = process_chat_push_notifications(limit=limit)

        except ChatPushError as error:
            raise CommandError(str(error)) from error

        if quiet:
            return

        self.stdout.write(
            self.style.SUCCESS(
                "Chat push processing completed."
            )
        )

        self.stdout.write(
            (
                "claimed={claimed} "
                "notifications={notifications} "
                "sent={sent} "
                "failed={failed} "
                "deactivated_tokens={deactivated}"
            ).format(
                claimed=result["claimed_count"],
                notifications=result["notification_count"],
                sent=result["sent_count"],
                failed=result["failed_count"],
                deactivated=result[
                    "deactivated_token_count"
                ],
            )
        )

        for item in result["results"]:
            self.stdout.write(
                (
                    "- notification={notification_id} "
                    "status={status} "
                    "tokens={tokens} "
                    "sent_tokens={sent_tokens} "
                    "failed_tokens={failed_tokens}"
                ).format(
                    notification_id=item[
                        "chat_notification_id"
                    ],
                    status=item["status"],
                    tokens=item["token_count"],
                    sent_tokens=item["sent_token_count"],
                    failed_tokens=item[
                        "failed_token_count"
                    ],
                )
            )