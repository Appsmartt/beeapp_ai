# Paridad web ↔ app móvil (cliente)

Leyenda: `[x]` implementado en web · `[~]` parcial · `[ ]` pendiente

## Auth / onboarding
- [x] Login email/contraseña
- [x] Login OTP teléfono
- [x] Recuperar contraseña (SMS request/verify/reset)
- [ ] Onboarding post-registro
- [x] Login / vincular sesión por QR
- [x] Registro con países desde settings

## Perfil / verificación / suscripción
- [x] Editar perfil (API)
- [~] Avatar upload
- [~] Visibilidad en red (RPC `set_network_visibility`; UI perfil pendiente)
- [x] Buddy Verify (submit API)
- [x] Planes upgrade/cancelar/reactivar (RPC + UI)
- [x] Almacenamiento en panel suscripción

## Seguridad / dispositivos
- [~] PIN desbloqueo chat (verify API)
- [x] Configurar/cambiar PIN cuenta
- [~] Chats protegidos (listar; quitar en UI chat)
- [x] Listar/revocar dispositivos
- [x] Mostrar QR vincular web desde dispositivos

## Chat
- [x] Inbox, categorías, mensajes texto
- [~] Fijar/silenciar/vaciar (mute/clear API; fijar mensaje local)
- [~] Adjuntos, voz, ubicación (upload + geolocation)
- [~] Reacciones comunidad (RPC); reenviar/buscar pendiente
- [~] Realtime (Supabase INSERT mensajes)
- [~] Grupos (crear API; invites/roles parcial)
- [~] Comunidades (posts + reacciones RPC + editar/salir)
- [~] Estados (texto; media completo pendiente)
- [x] Mensajes temporales (RPC `set_conversation_disappearing`)
- [x] Llamadas Agora (start/end + overlay)
- [~] Asistente IA en chat

## Contactos / red
- [x] CRUD contactos básico
- [~] Descubrir / seguir usuarios
- [~] Llamadas (historial + saliente desde chat)

## Notas / calendario / correo / storage
- [x] Notas CRUD (webNotesApi)
- [x] Calendario bootstrap + eventos
- [x] Correo (useMail)
- [x] Almacenamiento CRUD + compartir
- [ ] Calendarios externos / duplicar evento
- [ ] Firma digital persistida

## Integraciones / notificaciones
- [x] Integraciones OAuth
- [x] Campana por módulo (API)
- [x] Centro `/app/notifications` (API global)

## Overview `/app`
- [x] Tarjetas de módulos con datos API (mail, chat, calendario, notas, storage, BuddyServices, asistente)
- [x] Vistas de estado: listado de viewers vía API (sin fallbacks demo)

## BeeServices
- [x] Negocios propios + crear perfil
- [~] Marketplace comprador (búsqueda perfiles; rutas cart/checkout pendientes)
- [~] Gestión dueño (CRUD parcial vía workspace)

## Asistente IA / voz
- [x] Config asistente (`getAssistantSettings` / `saveAssistantSettings`)
- [x] FAB voz (STT/TTS + acciones)
- [x] Pantalla `/app/assistant`
- [x] Asistente IA en chat (fila inbox, historial, envío, tarjetas de acción)
- [ ] IA en redacción correo

Actualizar este archivo al cerrar cada fase del plan de paridad.
