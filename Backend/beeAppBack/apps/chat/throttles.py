from rest_framework.throttling import SimpleRateThrottle


class ChatUserRateThrottle(SimpleRateThrottle):
    """
    Base throttle para acciones de chat autenticadas.

    Usa el Authorization header o la cookie/session manejada por Django
    como identificador IP fallback. El objetivo no es autenticar, sino
    limitar abuso a nivel de endpoint.
    """

    scope = "chat_user"
    rate = "120/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class ChatMessageSendThrottle(SimpleRateThrottle):
    """
    Limita creación de mensajes de texto/referencia.

    Los uploads tienen su propio throttle porque pueden consumir más
    recursos de red, Storage y cuota.
    """

    scope = "chat_message_send"
    rate = "30/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class ChatAttachmentUploadThrottle(SimpleRateThrottle):
    """
    Limita uploads de adjuntos de chat.
    """

    scope = "chat_attachment_upload"
    rate = "10/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class ChatReactionThrottle(SimpleRateThrottle):
    """
    Limita spam de reacciones.
    """

    scope = "chat_reaction"
    rate = "60/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class ChatGroupMutationThrottle(SimpleRateThrottle):
    """
    Limita creación de grupos, invitaciones, expulsiones y salida.
    """

    scope = "chat_group_mutation"
    rate = "20/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }

class ChatRecipientSearchThrottle(SimpleRateThrottle):
    """
    Limita búsquedas de destinatarios para prevenir enumeración
    masiva de cuentas por correo, teléfono o nombre comercial.
    """

    scope = "chat_recipient_search"
    rate = "30/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }
