from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)


DEFAULT_RECONCILIATION_BATCH_SIZE = 500
MAX_RECONCILIATION_BATCH_SIZE = 500


class Command(BaseCommand):
    help = (
        "Closes expired ringing calls, abandoned starting calls, "
        "and active calls with no joined participants."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=DEFAULT_RECONCILIATION_BATCH_SIZE,
            help=(
                "Maximum number of open call sessions to reconcile "
                "in one run (1-500)."
            ),
        )

    def handle(self, *args, **options):
        limit = options["limit"]

        if limit < 1 or limit > MAX_RECONCILIATION_BATCH_SIZE:
            raise CommandError(
                "limit must be between 1 and 500."
            )

        try:
            response = execute_with_supabase_admin_retry(
                lambda supabase: supabase.rpc(
                    "call_reconcile_open_sessions",
                    {
                        "p_limit": limit,
                    },
                ).execute()
            )
        except Exception as error:
            raise CommandError(
                "Could not reconcile call sessions: "
                f"{error}"
            ) from error

        reconciled_calls = getattr(response, "data", None) or []

        if not isinstance(reconciled_calls, list):
            raise CommandError(
                "Call reconciliation returned an invalid response."
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Call reconciliation completed. "
                f"reconciled={len(reconciled_calls)}"
            )
        )

        for call in reconciled_calls:
            self.stdout.write(
                " - "
                f"call_id={call.get('call_id')} "
                f"previous_status={call.get('previous_status')} "
                f"final_status={call.get('final_status')} "
                f"end_reason={call.get('end_reason')}"
            )
