from __future__ import annotations

from django.core.management.base import BaseCommand

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)
from apps.mail.services.mail_integration_link_service import (
    sync_mail_integration_from_connection,
)


class Command(BaseCommand):
    help = (
        "Crea o actualiza mail_integrations desde las conexiones "
        "OAuth existentes de Google y Microsoft."
    )

    def handle(self, *args, **options):
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("integration_connections")
            .select("id,provider")
            .in_("provider", ["google", "microsoft"])
            .execute()
        )

        connections = response.data or []

        created_or_updated = 0
        skipped = 0

        for connection in connections:
            integration = sync_mail_integration_from_connection(
                connection_id=str(connection["id"]),
            )

            if integration:
                created_or_updated += 1
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Mail integration links synchronized. "
                f"Updated: {created_or_updated}. "
                f"Skipped: {skipped}."
            )
        )