from __future__ import annotations

from apps.chat.cache import bump_inbox_cache_version
from apps.chat.services.chat_messages.message_repository import (
    _get_active_conversation_participant_owners,
)

def _bump_active_participant_inbox_versions(
    *,
    conversation_id: str,
) -> None:
    """
    Hace que cada inbox afectado deje de usar su versión anterior.

    No falla un mensaje ya persistido si Redis/caché no está disponible.
    El TTL seguirá actuando como red de seguridad y el próximo GET
    reconstruirá el inbox desde la RPC de Supabase.
    """
    try:
        participants = (
            _get_active_conversation_participant_owners(
                conversation_id=conversation_id,
            )
        )

        for participant in participants:
            bump_inbox_cache_version(
                identity_id=participant["identity_id"],
            )
    except Exception:
        # No se debe convertir un mensaje ya confirmado en error HTTP
        # debido a un fallo no crítico de invalidación de caché.
        return
