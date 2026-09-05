# BuddyServices — Gap de verificación comercial

## Estado

La base de datos y los serializers backend ya contienen un flujo de verificación
comercial, pero el router activo de `apps/commercial/urls.py` no expone rutas
HTTP para que el frontend owner pueda ejecutar el flujo de forma autorizada.

La aplicación móvil no debe mostrar una UI de verificación que simule estados,
transiciones o carga de documentos mientras estos contratos no estén activos.

## Evidencia existente

Los serializers activos disponibles son:

- `CreateCommercialVerificationRequestSerializer`
- `CreateCommercialVerificationDocumentSerializer`
- `SubmitCommercialVerificationRequestSerializer`
- `ReviewCommercialVerificationRequestSerializer`

Los estados soportados por el dominio son:

- `not_requested`
- `draft`
- `pending_review`
- `requires_correction`
- `verified`
- `rejected`
- `suspended`

## Contratos HTTP requeridos

Las rutas exactas pueden ajustarse al patrón del backend, pero deben tener una
forma equivalente a estas operaciones:

| Operación | Método | Ruta propuesta | Rol |
|---|---|---|---|
| Consultar expediente actual | GET | `/commercial/profiles/{profileId}/verification/` | owner/admin |
| Crear borrador | POST | `/commercial/profiles/{profileId}/verification/` | owner |
| Adjuntar documento | POST | `/commercial/profiles/{profileId}/verification/{requestId}/documents/` | owner |
| Enviar a revisión | POST | `/commercial/profiles/{profileId}/verification/{requestId}/submit/` | owner |
| Revisar expediente | POST | `/commercial/verification/{requestId}/review/` | admin explícito |
| Consultar eventos | GET | `/commercial/profiles/{profileId}/verification/{requestId}/events/` | owner/admin |

## Reglas obligatorias

- El backend debe validar propiedad del `commercial_profile_id` para owner.
- Los documentos deben pertenecer al usuario que los adjunta y estar listos.
- Solo se permiten formatos/tamaños definidos por backend.
- El frontend no persiste documentos, previews ni URLs firmadas.
- `draft -> pending_review` debe ocurrir exclusivamente mediante endpoint de
  submit y validación backend de documentos requeridos.
- Decisiones `requires_correction` y `rejected` deben conservar motivo.
- La UI solo renderiza el resultado que devuelve la API autorizada.

## Próximo trabajo backend

1. Implementar views, servicios y rutas activas.
2. Agregar pruebas de autorización owner/admin, archivos inválidos, transición
   inválida y documentos de otro usuario.
3. Exponer contratos tipados en `@beeapp/shared-types` y
   `@beeapp/api-client`.
4. Retomar la pantalla móvil de verificación solo después de esos contratos.
