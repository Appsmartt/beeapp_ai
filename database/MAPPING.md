# Mapa del esquema compacto (2026-10-15)

`public` quedó en 28 tablas. El respaldo anterior está en `database/backup/backup_20261015/` (111 archivos JSON). El esquema `backup_20261015` y el esquema temporal `keep` ya no existen.

Se conservaron 8 perfiles, 5 negocios, 64 categorías, 4 planes, 8 suscripciones, 7 archivos (avatar o logo) y los ajustes de la app, incluidos los fondos de estados. El chat, el correo, los pedidos y el calendario empiezan vacíos.

| Antes | Ahora |
| --- | --- |
| `profile`, `account_security_pins`, `social_links`, preferencias y cuotas | `profiles` (`social_links`, `settings`, `security_pin_hash`, `storage_quota_bytes`, `storage_used_bytes`) |
| `device_sessions`, `push_devices` | `devices` |
| `qr_login_challenges` | `qr_logins` |
| `contacts`, `status_follows`, `status_user_blocks` | `contacts.kind` = `contact`, `follow` o `block` |
| `chat_conversations`, `commerce_chat_conversations`, `communities`, invitaciones | `conversations.kind` = `direct`, `group`, `business` o `community` |
| `chat_participants`, `community_members`, pines de chat | `conversation_members` |
| `chat_messages`, reacciones, publicaciones de comunidad | `messages` (`attachments`, `reactions`, `seq`) |
| `call_sessions`, `call_participants`, `call_events` | `calls.participants` |
| `files`, carpetas, etiquetas y subidas | `files` (`kind` = `file` o `folder`, `tags`, `shared_with`) |
| tablas `note*` | `notes` |
| tablas `status_story*` | `statuses` y `status_views`. Los fondos de texto están en `app_settings` |
| `commercial_categories` | `categories` |
| tablas `commercial_*` de perfil | `businesses` (`hours`, `payment_methods`, `verification`, `social_links`, `modalities`, `category_ids`) |
| ofertas | `offers` |
| tablas `commerce_*` de pedidos | `orders` |
| tablas de calendario | `calendars` y `events` |
| `integration_*`, `mail_integrations`, `calendar_integrations` | `integrations` |
| tablas `mail_*` | `mail_messages` |
| `notification_outbox` y entregas | `notifications` y `notification_campaigns` |
| `plans`, `subscriptions`, `payment_transactions` | `plans`, `subscriptions`, `payments` |
| `user_reports`, `user_sanctions` | `moderation` |
| `domain_audit_events` y `*_events` | `activity_log` |
| ajustes | `app_settings` |

Las RPC que usa la web conservan su nombre: `admin_*`, `discover_network_profiles`, `list_my_call_logs`, `search_beeapp_users_for_invitation`, `commerce_public_*` y `register_device_session`. Después de iniciar sesión hay que llamar `register_device_session` antes de leer tablas con RLS.

Los 89 enums y las funciones del esquema anterior se eliminaron. Los valores cerrados quedaron como `text` con `CHECK`.

Las categorías de chat viven en `chat_categories` y `chat_category_assignments` (no en `categories`, que es de BuddyServices). El candado de un chat guarda `protected` en `conversation_members.pin_hash` y se quita con el PIN de `profiles.security_pin_hash` (`crypt` de pgcrypto, cinco fallos lo bloquean cinco minutos). La presencia de chat está en `chat_presence` y se consulta con `chat_presence_snapshot`. El gateway expone `/chat/categories/`, `/chat/pin-protections/`, `/chat/presence/` y `/accounts/me/security-pin/`.

El push móvil usa OneSignal. `devices.onesignal_subscription_id` guarda la suscripción del dispositivo como diagnóstico. El envío no usa ese token: la app llama `OneSignal.login` con el id del usuario y la función `push-dispatch` envía con `include_aliases.external_id`. `devices.expo_push_token` queda obsoleta. La campaña del admin inserta filas `pending` y llama a `push-dispatch`; un cron por minuto reintenta las pendientes y promueve las programadas cuyo horario ya pasó.
