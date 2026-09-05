from django.core.management.base import BaseCommand, CommandError

from apps.commercial.exceptions import CommercialError
from apps.commercial.services.commercial_maintenance_service import (
    DEFAULT_EXPIRATION_BATCH_SIZE,
    MAX_EXPIRATION_BATCH_SIZE,
    run_commercial_expirations,
)


class Command(BaseCommand):
    help = (
        "Expires commercial reservation holds and submitted "
        "commercial requests that have passed their expiration."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=DEFAULT_EXPIRATION_BATCH_SIZE,
            help=(
                "Maximum records processed by each expiration RPC "
                f"(1-{MAX_EXPIRATION_BATCH_SIZE})."
            ),
        )

    def handle(self, *args, **options):
        try:
            result = run_commercial_expirations(
                limit=options["limit"],
            )
        except CommercialError as error:
            raise CommandError(
                f"{error.code}: {error}"
            ) from error

        self.stdout.write(
            self.style.SUCCESS(
                "Commercial expirations completed. "
                "ExpiredReservationHolds="
                f"{result['expired_reservation_hold_count']} "
                "ExpiredRequests="
                f"{result['expired_request_count']}"
            )
        )

        for reservation in result["expired_reservation_holds"]:
            self.stdout.write(
                " - expired_reservation_hold "
                f"reservation_id={reservation.get('commerce_reservation_id')} "
                f"request_id={reservation.get('commerce_request_id')}"
            )

        for commerce_request in result["expired_requests"]:
            self.stdout.write(
                " - expired_request "
                f"request_id={commerce_request.get('commerce_request_id')} "
                f"expired_inventory_holds="
                f"{commerce_request.get('expired_hold_count')}"
            )
