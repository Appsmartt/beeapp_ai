from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from apps.calls.exceptions import CallError
from apps.calls.services.call_maintenance_service import (
    DEFAULT_EXPIRATION_BATCH_SIZE,
    expire_ringing_direct_calls,
)


class Command(BaseCommand):
    help = (
        "Expires ringing direct calls whose 45-second "
        "ringing timeout has elapsed."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=DEFAULT_EXPIRATION_BATCH_SIZE,
            help=(
                "Maximum number of expired calls to process "
                "in one run (1-500)."
            ),
        )

    def handle(self, *args, **options):
        try:
            expired_calls = expire_ringing_direct_calls(
                limit=options["limit"],
            )
        except CallError as error:
            raise CommandError(
                f"{error.code}: {error}"
            ) from error

        self.stdout.write(
            self.style.SUCCESS(
                "Expired direct calls: "
                f"{len(expired_calls)}"
            )
        )

        for call in expired_calls:
            self.stdout.write(
                " - "
                f"call_id={call['call_id']} "
                f"missed_identity_id="
                f"{call['missed_identity_id']}"
            )
