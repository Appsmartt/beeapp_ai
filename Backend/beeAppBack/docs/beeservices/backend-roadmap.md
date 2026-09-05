# BeeServices — Backend Roadmap

## Fuente de verdad

- Dominio Django: `apps/commercial`
- Base de datos: Supabase PostgreSQL
- Integraciones: Chat, Statuses, Notifications, Storage y Calendar
- Identificador de módulo de notificaciones: `beeservices`
- Moneda V1: COP
- Vencimiento inicial de solicitudes: dos días hábiles
- Reserva: tiempo timezone-aware y hold controlado por backend
- Pago: externo; BeeApp almacena evidencia y validación manual, no procesa dinero

## Reglas de implementación

1. Ninguna view aplica reglas de dominio críticas directamente.
2. Las acciones críticas delegan a servicios de dominio.
3. Las transiciones se validan antes de persistir cambios.
4. Los cambios de estado generan evento específico y auditoría comercial.
5. Los eventos relevantes crean una notificación mediante outbox idempotente.
6. Todas las entidades hijas se validan contra su `commercial_profile_id`.
7. Las operaciones reintentables usan una `idempotency_key`.
8. Las fechas de reservas y vencimientos son timezone-aware.
9. Los datos privados de pago, documentos y evidencia nunca aparecen en serializadores públicos.
10. Chat puede referenciar una solicitud o reserva, pero no cambia estados por sí mismo.
