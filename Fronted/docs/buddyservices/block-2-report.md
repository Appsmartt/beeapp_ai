# BuddyServices — Bloque 2

## Estado

Completado para desarrollo local.

Este bloque convierte la exploración pública de BuddyServices en pantallas
conectadas a APIs reales: resultados, filtros, perfil comercial público,
catálogos publicados y detalle público de oferta.

## Pantallas implementadas

- `app/(main)/beeservices/results.tsx`
- `app/(main)/beeservices/profile/[profileId].tsx`
- `app/(main)/beeservices/offer/[offerId].tsx`

## Componentes agregados

- `CommercialResultsFilters`
- `CommercialOfferCard`
- `commercialLabels`

## Resultados públicos

La pantalla de resultados usa parámetros de navegación:

```text
countryCode
city
categoryId opcional
search opcional
```

La ubicación sigue siendo obligatoria. Si falta país o ciudad, la pantalla no
consulta la API y muestra un estado seguro para volver a BuddyServices.

Filtros disponibles:

- Categoría.
- Tipo de oferta: productos, servicios o mixto.
- Modalidad.
- Solo verificados.
- Solo con domicilio.
- Orden: recientes o nombre.
- Búsqueda manual.
- Limpieza de filtros y búsqueda.

La paginación usa:

```text
limit = 20
offset = N
```

La interfaz evita duplicar perfiles cuando se cargan páginas adicionales.

## Perfil público

El perfil comercial consulta:

```text
GET /api/commercial/public/profiles/:profileId/
GET /api/commercial/public/profiles/:profileId/catalogs/
GET /api/commercial/public/profiles/:profileId/offers/
```

Muestra solamente:

- Identidad del negocio.
- Insignia de verificación cuando backend devuelve `is_verified`.
- Tipo de oferta, categoría y actividad.
- Descripción.
- Ciudad y país.
- Dirección, teléfono y correo únicamente cuando el backend los declara
  explícitamente públicos.
- Modalidades.
- Catálogos publicados.
- Ofertas publicadas.

No muestra datos del owner, métodos de pago privados, instrucciones privadas,
comprobantes, documentos de verificación, evidencia de disputa ni inventario.

El logo usa iniciales temporalmente porque el endpoint público actual devuelve
`logo_file_id`, pero no una URL firmada/autorizada de logo. Las imágenes de
ofertas sí usan URLs firmadas temporales devueltas por backend.

## Detalle de oferta

El detalle consulta:

```text
GET /api/commercial/public/offers/:offerId/
```

Muestra:

- Producto o servicio.
- Precio fijo, desde, gratis o por confirmar.
- Imágenes autorizadas cuando existan.
- Modalidades.
- Reserva requerida y duración cuando aplique.
- Política de pago externa no sensible.
- Mensaje explícito de que BeeApp no procesa dinero.

Las acciones `Solicitar producto`, `Solicitar servicio` y `Solicitar reserva`
todavía muestran una indicación de próximos bloques. No crean solicitudes mock.

## Validación HTTP local

| Prueba | Resultado |
|---|---:|
| Países públicos | 200 |
| Ciudades de CO | 200 |
| Categorías filtradas por Montería | 200 |
| Perfiles públicos recientes | 200 |
| Orden por nombre | 200 |
| Filtro por categoría | 200 |
| Filtro por tipo services | 200 |
| Filtro por modalidad buddy_chat | 200 |
| Solo verificados sin coincidencias | 200 con lista vacía |
| Solo domicilio sin coincidencias | 200 con lista vacía |
| Búsqueda sin coincidencias | 200 con lista vacía |
| Paginación offset 0 | 200 |
| Paginación offset 1 | 200 con lista vacía |
| Ofertas públicas del perfil | 200, 2 ofertas |
| Detalle público de oferta | 200 |
| Revisión de campos sensibles | Correcta |

Oferta validada:

```text
Diagnóstico técnico de prueba
service
fixed
COP 50000
payment_policy = required_before_confirmation
```

## Seguridad

La validación automática comprobó que las respuestas públicas de perfiles y
ofertas no contienen:

- `private_details`
- `private_instructions`
- comprobantes
- referencias de pago privadas
- documentos de verificación
- inventario interno
- credenciales de sesión

## Mocks

Las rutas y componentes nuevos de BuddyServices no consumen
`beeServicesExplore.ts`.

Los componentes antiguos que aún importan el mock permanecen aislados y no se
usan por las pantallas nuevas:

- `src/components/beeservices/BeeServicesQuickActions.tsx`
- `src/components/beeservices/BeeServicesCategoryGrid.tsx`

## Pendientes posteriores

- Endpoint o campo público autorizado para URL firmada de logo comercial.
- Chat comercial real por cliente + perfil comercial.
- CTA real de solicitud, carrito, reserva y negociación.
- Pantalla de administración de negocios propios.
- Bandejas, comprobantes, disputas y operación.
- Historias comerciales exclusivas del perfil comercial.
- Deep links y notificaciones comerciales.
- Despliegue del backend comercial a Railway: producción responde 404 para
  `/api/commercial/public/countries/`.
