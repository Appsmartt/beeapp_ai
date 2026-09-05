# BuddyServices — Bloque 1A

## Estado

Completado para desarrollo local.

La portada `app/(main)/beeservices/index.tsx` dejó de depender de
`beeServicesExplore.ts` y ahora consume APIs reales mediante:

```text
Pantalla Expo
  -> src/services/commercialService.ts
  -> @beeapp/api-client/src/commercial.ts
  -> API Django /api/commercial/
  -> Supabase con RLS
```

## Decisiones de producto

- País inicial: `CO`.
- Ciudad obligatoria antes de cargar categorías y negocios.
- Sección pública principal: `Negocios recientes`.
- Si el usuario tiene perfiles propios: mostrar acceso a `Mis negocios`.
- Si no tiene perfiles propios: mostrar CTA para crear el primer perfil comercial.
- La tarjeta IA sigue disponible como función opcional y no bloquea exploración.

## Rutas creadas

- `/(main)/beeservices`
- `/(main)/beeservices/results`
- `/(main)/beeservices/profile/[profileId]`
- `/(main)/beeservices/offer/[offerId]`
- `/(main)/beeservices/my-businesses`
- `/(main)/beeservices/create-business`
- `/(main)/beeservices/my-purchases`

Las rutas distintas a inicio son placeholders seguros durante Bloque 1A.
No muestran datos privados ni usan mocks.

## Validación local HTTP

Backend local validado con usuario de desarrollo y token temporal no persistido:

| Endpoint | Resultado |
|---|---:|
| `GET /api/commercial/public/countries/` | 200 |
| `GET /api/commercial/public/cities/?country_code=CO` | 200 |
| `GET /api/commercial/public/categories/?country_code=CO&city=Montería` | 200 |
| `GET /api/commercial/public/profiles/?country_code=CO&city=Montería&ordering=recent&limit=10&offset=0` | 200 |
| `GET /api/commercial/profiles/` | 200 |

La revisión automática de la respuesta pública no detectó:

- `private_details`
- `private_instructions`
- referencias de comprobantes de pago
- documentos de verificación
- credenciales de sesión

## Validación TypeScript

Correcto dentro del alcance BuddyServices:

- `packages/shared-types/src/commercial.ts`
- `packages/api-client/src/commercial.ts`
- `apps/mobile/src/services/commercialService.ts`
- `apps/mobile/src/features/buddyservices/*`
- `apps/mobile/src/components/buddyservices/*`
- `apps/mobile/app/(main)/beeservices/*`

Existen errores TypeScript preexistentes fuera del alcance BuddyServices:
registro, verificación telefónica, `FloatingTabBar`, notas, onboarding y
polyfill `text-encoding`. No fueron modificados durante este bloque.

## Mocks

La portada ya no consume `beeServicesExplore.ts`.

Consumidores restantes detectados:

- `apps/mobile/src/components/beeservices/BeeServicesQuickActions.tsx`
- `apps/mobile/src/components/beeservices/BeeServicesCategoryGrid.tsx`

Esos componentes antiguos no son usados por la nueva portada y se eliminarán
o migrarán cuando no tengan referencias activas.

`src/mocks/myServices.ts` se conserva temporalmente porque sigue siendo usado
por componentes de Chat y Statuses fuera del alcance de Bloque 1A.

## Railway

La ruta comercial existe localmente y requiere Bearer token válido.

La ruta de Railway:

```text
https://beeappai-production.up.railway.app/api/commercial/public/countries/
```

respondió 404. El backend desplegado en Railway no tiene todavía las rutas
comerciales actuales o está desplegando otra revisión. Este punto no bloquea
desarrollo local, pero debe resolverse antes de staging/producción.

## Siguiente bloque

Bloque 2A: resultados públicos reales con búsqueda, filtros, paginación,
chips de filtros y navegación hacia perfil comercial.
