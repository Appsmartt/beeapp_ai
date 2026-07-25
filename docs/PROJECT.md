# BeeApp AI — Documentación del Proyecto

> Estado actual del proyecto a julio de 2026. Este documento describe **lo que existe hoy**: toda la interfaz está implementada con datos mock, sin backend conectado.

---

## 1. Descripción general

**BeeApp AI** es un ecosistema de comunicación y productividad empresarial. Integra en una sola plataforma los módulos que una empresa usa a diario — chat, correo, calendario, contactos, notas, almacenamiento de archivos y un asistente de IA — junto con un panel de administración web para gestionar usuarios, suscripciones y notificaciones.

El proyecto es un **monorepo** con dos aplicaciones y paquetes compartidos:

| Ruta | Qué es |
|---|---|
| `apps/mobile` | App móvil (React Native + Expo) para el usuario final |
| `apps/admin-web` | Panel de administración web (Next.js) |
| `packages/design-system` | Tokens de diseño y temas compartidos |
| `packages/shared-types` | Tipos TypeScript compartidos entre apps |
| `packages/config` | Configuración base de TypeScript (`tsconfig.base.json`) |

---

## 2. Stack tecnológico

### Mobile (`@beeapp/mobile`)
- **React Native** 0.74.5 + **Expo SDK** ~51.0.0 con `expo-dev-client` (development builds, no Expo Go)
- **Expo Router** ~3.5.24 (navegación basada en archivos)
- **TypeScript** ^5.4.0
- `lucide-react-native` (iconos), `react-native-svg`, `react-native-safe-area-context`, `react-native-screens`
- `react-native-web` ~0.19.10 (permite smoke tests en navegador con `expo start --web`)

### Admin Web (`@beeapp/admin-web`)
- **Next.js** ^14.2.0 con **App Router**
- **TypeScript** ^5.4.0
- `lucide-react` (iconos), `recharts` (gráficas)

### Monorepo
- **npm workspaces** (`apps/*`, `packages/*`) + **Turborepo** ^2.0.0
- Scripts raíz: `npm run dev`, `npm run build`, `npm run build:admin`, `npm run lint`, `npm run type-check`, `npm run clean`
- Node >= 18, npm 10.9.2
- `overrides` en el `package.json` raíz fijan React 18.2.0 y React Native 0.74.5 en todo el árbol

### Paquetes compartidos
- **`@beeapp/design-system`**: tokens propios (colors, typography, spacing, radii, shadows) y temas. El tema activo es **light**; existe un borrador de `darkTheme` no exportado.
- **`@beeapp/shared-types`**: tipos base compartidos (`BaseUser`, `UserRole`, `UserStatus`, `PaginationParams`, `ApiResponse<T>`).

---

## 3. Estructura de carpetas

```
beeapp_ai/
├── package.json              # Workspaces npm + overrides de versiones
├── turbo.json                # Pipeline de Turborepo (build, dev, lint, type-check)
├── tsconfig.json             # TS raíz
├── babel.config.js           # Babel raíz
├── docs/
│   └── PROJECT.md            # Este documento
├── apps/
│   ├── mobile/
│   │   ├── app/              # Rutas de Expo Router (cada archivo = una pantalla)
│   │   │   ├── _layout.tsx   # Layout raíz (Stack)
│   │   │   ├── index.tsx     # Splash Screen animada (White background + paths + logo)
│   │   │   ├── (auth)/       # Login (selector país), verify (matching flag/code), terms y privacy
│   │   │   ├── (main)/       # Módulos principales de la app
│   │   │   │   ├── index.tsx       # Home (dashboard)
│   │   │   │   ├── calendar/       # Calendario
│   │   │   │   ├── chat/           # Mensajería y llamadas
│   │   │   │   ├── contacts/       # Contactos y red
│   │   │   │   ├── mail/           # Correo
│   │   │   │   ├── notes/          # Notas
│   │   │   │   ├── profile/        # Perfil, suscripción, integraciones
│   │   │   │   ├── storage/        # Archivos y firma de documentos
│   │   │   │   ├── explore.tsx     # Catálogo de módulos
│   │   │   │   └── notifications.tsx
│   │   │   └── onboarding/   # Configuración inicial guiada
│   │   ├── src/
│   │   │   ├── components/   # Componentes reutilizables (por módulo)
│   │   │   ├── mocks/        # Datos mock centralizados con tipos
│   │   │   ├── stores/       # Estado mock compartido entre pantallas
│   │   │   ├── utils/        # Funciones puras auxiliares
│   │   │   ├── assets/       # Imágenes y recursos
│   │   │   ├── services/     # (vacía) futura capa de llamadas a API
│   │   │   ├── hooks/        # (vacía) futuros hooks reutilizables
│   │   │   ├── lib/          # (vacía) futuros clientes/configuración (ej. HTTP)
│   │   │   ├── types/        # (vacía) futuros tipos propios de la app
│   │   │   ├── constants/    # (vacía) futuras constantes de la app
│   │   │   ├── features/     # (vacía) reservada para organización por feature
│   │   │   └── navigation/   # (vacía) reservada para utilidades de navegación
│   │   ├── scripts/          # patch-expo-router.js (parche post-install)
│   │   └── Build.MD          # Guía de development builds (Expo)
│   └── admin-web/
│       ├── public/
│       └── src/
│           ├── app/          # Rutas de Next.js App Router
│           │   ├── page.tsx        # Landing / redirección
│           │   ├── login/ verify/ terms/ privacy/
│           │   └── dashboard/
│           │       ├── layout.tsx        # Layout compartido (sidebar + topbar)
│           │       ├── page.tsx          # Dashboard home (KPIs + gráficas)
│           │       ├── usuarios/         # Tabla de usuarios
│           │       │   ├── page.tsx      # Listado
│           │       │   └── [id]/
│           │       │       └── page.tsx  # Detalle de un usuario
│           │       ├── suscripciones/    # Suscripciones y planes
│           │       │   └── page.tsx
│           │       └── notificaciones/   # Envío e historial de campañas
│           │           └── page.tsx
│           ├── components/   # Componentes reutilizables del panel (KpiCard, DataTable, etc.)
│           ├── mocks/        # Datos mock split por dominio (types.ts, users.ts, transactions.ts, etc.)
│           ├── utils/        # Formateo, etiquetas y constantes de gráficas
│           ├── features/     # (vacía) reservada para organización modular futura
│           ├── services/     # (vacía) futura capa de llamadas a API
│           ├── hooks/        # (vacía) futuros hooks
│           ├── lib/          # (vacía) futuros clientes/configuración
│           ├── types/        # (vacía) futuros tipos propios
│           └── constants/    # (vacía) futuras constantes
└── packages/
    ├── design-system/
    │   ├── tokens/           # colors, typography, spacing, radii, shadows
    │   ├── theme/            # lightTheme (activo) y darkTheme (borrador)
    │   └── components/       # (vacía) futuros componentes UI compartidos
    ├── shared-types/src/     # Tipos compartidos entre apps
    └── config/               # tsconfig.base.json
```

---

## 4. Módulos implementados (solo UI con mock data)

### App móvil (`apps/mobile/app/`)

| Módulo | Pantallas | Qué hace |
|---|---|---|
| **Auth** `(auth)/` | `login`, `verify`, `terms`, `privacy` | Inicio de sesión (con selector de país internacional), verificación por código (con indicativo coherente), y páginas legales |
| **Onboarding** `onboarding/` | `index` | Flujo guiado de 4 pasos: datos personales, negocio, tono del asistente y beneficios/permisos |
| **Home** `(main)/index` | `index` | Dashboard con tarjeta del asistente IA, plan/almacenamiento, accesos rápidos personalizables (máx. 3), actividad reciente y próximos eventos |
| **Chat** `(main)/chat/` | `index`, `conversation`, `new`, `call`, `story`, `create-story` | Lista de chats con historias, conversación con burbujas de mensajes, nuevo chat, llamada y creación/visualización de historias |
| **Calendar** `(main)/calendar/` | `index`, `detail`, `edit` | Vista mensual/agenda por horas/lista de eventos con filtros, detalle y edición de eventos con invitados |
| **Contacts** `(main)/contacts/` | `index`, `detail` | Mis contactos, descubrir (red empresarial), registro de llamadas y detalle de contacto |
| **Mail** `(main)/mail/` | `index`, `detail`, `compose` | Bandeja con multi-cuenta, carpetas con contadores, búsqueda, acciones swipe (leer/archivar/eliminar), detalle y redacción |
| **Notes** `(main)/notes/` | `index`, `edit` | Lista de notas y editor |
| **Storage** `(main)/storage/` | `index`, `preview`, `sign` | Explorador de archivos y carpetas (grid/lista, filtros, ordenación, breadcrumbs), vista previa y flujo de firma de documentos |
| **Profile** `(main)/profile/` | `index`, `edit`, `subscription`, `integrations` | Perfil de usuario, edición, gestión de suscripción (plan Plus) e integraciones de cuentas externas |
| **Explore** `(main)/explore` | `explore` | Catálogo de todos los módulos disponibles |
| **Notifications** `(main)/notifications` | `notifications` | Centro de notificaciones del usuario |

Navegación transversal: `FloatingTabBar` (barra flotante tipo píldora presente en las pantallas principales) y `AssistantMiniChat` (mini-chat del asistente IA invocable desde Home).

### Admin Web (`apps/admin-web/src/app/`)

| Sección | Páginas / componentes | Qué hace |
|---|---|---|
| **Auth y legales** | `login/`, `verify/`, `terms/`, `privacy/` | Acceso al panel y páginas legales |
| **Dashboard home** | `dashboard/page.tsx` | KPIs globales, consumo y costos operativos de la plataforma, crecimiento de usuarios, ingresos y uso por módulo, feed de actividad reciente |
| **Usuarios** | `usuarios/page.tsx`, `usuarios/[id]/page.tsx` | Tabla de usuarios con filtros, paginación y filtro por actividad comercial (BeeServices); detalle con métricas, integraciones, onboarding, BeeServices y privacidad |
| **Suscripciones** | `suscripciones/page.tsx` | KPIs de suscripción, distribución y flujo de ingresos, y tabla de transacciones. La edición de planes se trasladó a Configuraciones |
| **Configuraciones** | `dashboard/configuracion/page.tsx` | Gestión legal de términos y condiciones (editable), políticas de privacidad (editable) y planes de suscripción (precios, límites, funciones) |
| **Perfil** | `dashboard/perfil/page.tsx` | Perfil administrativo para ver y editar nombre completo, correo (con validación de formato) y foto de perfil, con teléfono de solo lectura |

---

## 5. Componentes reutilizables

### Mobile (`apps/mobile/src/components/`)

| Componente | Descripción |
|---|---|
| `AnimatedLogo.tsx` | Logo animado vectorial con alas giratorias (clockwise/counter-clockwise), cuadro central estático e inclinado (12 grados), y opción de autodetenerse (`autoStopAfter`) |
| `FloatingTabBar.tsx` | Barra de navegación flotante tipo píldora con acceso al asistente |
| `AssistantMiniChat.tsx` | Modal de mini-chat con el asistente IA |
| `calendar/CalendarHeader.tsx` | Cabecera del calendario + chips de filtro (exporta tipos `ViewMode`/`FilterChip`) |
| `calendar/CalendarMonthGrid.tsx` | Cuadrícula mensual de días |
| `calendar/CalendarHourlyAgenda.tsx` | Agenda del día por horas |
| `calendar/CalendarEventsList.tsx` | Lista de tarjetas de eventos |
| `calendar/CalendarMenus.tsx` | Menú contextual de evento + menú FAB de creación |
| `chat/ChatListItem.tsx` | Fila de chat en la lista de conversaciones |
| `chat/MessageBubble.tsx` | Burbuja de mensaje (texto, adjuntos, estados) |
| `chat/WriteBar.tsx` | Barra de escritura de mensajes |
| `home/HomeHeader.tsx` | Saludo, ocupación y campana de notificaciones |
| `home/HomeAssistantCard.tsx` | Tarjeta destacada del asistente con chips de sugerencia |
| `home/HomeStorageCard.tsx` | Tarjeta de plan y uso de almacenamiento |
| `home/HomeQuickAccessGrid.tsx` | Grid de accesos rápidos (3 módulos seleccionables) |
| `home/HomeOverviewCards.tsx` | Tarjetas de actividad reciente y próximos eventos |
| `home/HomeCustomizeModal.tsx` | Modal de personalización de accesos rápidos (máx. 3) |
| `home/homeModules.ts` | Configuración del pool de módulos (iconos, colores, rutas) |
| `mail/MailHeader.tsx` | Cabecera con selector de cuenta y barra de búsqueda |
| `mail/MailFolderChips.tsx` | Chips de carpetas con contadores de no leídos |
| `mail/MailListItem.tsx` | Fila de correo con avatar, badges y acciones swipe |
| `onboarding/AboutYouSection.tsx` | Paso 1: datos personales |
| `onboarding/BusinessSection.tsx` | Paso 2: datos del negocio y tipo de oferta |
| `onboarding/AssistantSection.tsx` | Paso 3: nombre y tono del asistente con vista previa |
| `onboarding/FeaturesSection.tsx` | Paso 4: beneficios y permisos |
| `onboarding/onboardingShared.ts` | Estilos compartidos y helper `getInitials` de los pasos |
| `storage/StorageHeader.tsx` | Cabecera con ordenación, cambio de vista y búsqueda |
| `storage/StorageSummaryFilters.tsx` | Tarjeta resumen, chips de filtro y breadcrumbs |
| `storage/StorageItemsView.tsx` | Vistas grid/lista de archivos y estado vacío |
| `storage/StorageContextMenu.tsx` | Menú contextual de archivo/carpeta |
| `storage/StorageDialogs.tsx` | Modal de mover a carpeta y diálogo de nombre |
| `storage/StorageFabMenu.tsx` | Menú FAB de creación/subida |
| `storage/storageItemIcon.tsx` | Icono según tipo de archivo |

Auxiliares: `src/utils/storageHelpers.ts` (ordenación, filtrado y creación mock de archivos — funciones puras).

### Admin (`apps/admin-web/src/components/`)

| Componente | Descripción |
|---|---|
| `KpiCard.tsx` / `KpiGrid.tsx` | Tarjeta de métrica con delta y grid contenedor |
| `ChartCard.tsx` | Contenedor de gráfica con título y acciones |
| `DataTable.tsx` | Tabla genérica con columnas configurables |
| `FilterBar.tsx` | Barra de búsqueda y filtros por select |
| `Pagination.tsx` | Paginación de tablas |
| `StatusBadge.tsx` | Badge de estado con color semántico |
| `PlanBadge.tsx` | Badge del plan de suscripción |
| `ActivityFeed.tsx` | Feed de actividad reciente |
| `SlidePanel.tsx` | Panel lateral deslizante (detalles/edición) |
| `AnimatedLogo.tsx` | Logo animado vectorial con alas giratorias (clockwise/counter-clockwise), cuadro central estático e inclinado (12 grados), y opción de autodetenerse (`autoStopAfter`) |

Auxiliares en `src/utils/`: `format.ts` (fechas, moneda, números), `labels.ts` (mapas de etiquetas en español para estados/tipos), `chart.ts` (colores, ejes y constantes de recharts).

---

## 6. Design system (`packages/design-system`)

**Tokens** (`tokens/`):
- `colors` — `brand` (primary `#6025d2`, dark `#5B2CD9`, white, textPrimary `#1A1A2E`), escala `neutral` (gray50–gray900, white, text) y `semantic` (success, warning, error, info)
- `typography` — familias (Inter/sans, mono), tamaños (caption 12px → display 32px), pesos y line-heights
- `spacing` — escala en px: none, xs 4, sm 8, md 16, lg 24, xl 32, 2xl 48, 3xl 64
- `radii` — none, sm 4, md 8, lg 12, xl 16, full
- `shadows` — sm/md/lg/xl (placeholder)

**Temas** (`theme/`):
- `lightTheme` — el único exportado y en uso (la app móvil es solo light mode)
- `darkTheme` — existe como borrador en `theme/dark.ts` pero **no se exporta** desde el índice del paquete

**Cómo se importa desde las apps** (dependencia de workspace `@beeapp/design-system`):

```ts
import { colors } from '@beeapp/design-system';
// también disponibles: typography, spacing, radii, shadows, lightTheme
```

`components/` está vacía: los componentes UI compartidos se agregarán en fases futuras.

---

## 7. Datos mock

### Mobile (`apps/mobile/src/mocks/` y `src/stores/`)

| Archivo | Entidad que representa |
|---|---|
| `mocks/emails.ts` | Correos (`EmailItem`, `MOCK_EMAILS`) y cuentas emisoras (`SENDER_ACCOUNTS`) |
| `mocks/contacts.ts` | Mis contactos, contactos por descubrir, registro de llamadas y detalles (`MY_CONTACTS`, `DISCOVER_CONTACTS`, `CALL_LOGS`, `ALL_CONTACT_DETAILS`, `CONTACT_CALLS`) |
| `mocks/chats.ts` | Chats, historias y mensajes de conversación (`MOCK_CHATS`, `MOCK_STORIES`, `MOCK_CONVERSATION_MESSAGES`) |
| `mocks/subscription.ts` | Beneficios del plan Plus (`BENEFICIOS_PLUS`) |
| `mocks/countries.ts` | Lista mundial completa de indicativos telefónicos y banderas de países (`COUNTRIES`) |
| `stores/calendarStore.ts` | Eventos de calendario con invitados (`CalendarEvent`, `getEvents`/`setEvents`) — estado mutable compartido entre pantallas |
| `stores/storageStore.ts` | Archivos y carpetas (`StorageItem`, `getItems`/`setItems`) — estado mutable compartido entre pantallas |

Algunas pantallas conservan arrays de configuración de UI inline (paletas de colores, pool de módulos con iconos): son configuración de interfaz, no datos de negocio.

### Admin (`apps/admin-web/src/mocks/`)

| Archivo | Entidad que representa |
|---|---|
| `types.ts` | Todos los tipos del dominio admin: `AdminUser`, `Plan`, `Transaction`, `NotificationCampaign`, `UserReport`, `UserSanction`, KPIs, series de gráficas, etc. |
| `users.ts` | Usuarios de la plataforma (`MOCK_USERS`) |
| `plans.ts` | Planes de suscripción con límites y funcionalidades (`MOCK_PLANS`) |
| `transactions.ts` | Transacciones de pago (`MOCK_TRANSACTIONS`) |
| `activities.ts` | Feed de actividad reciente (`MOCK_ACTIVITIES`) |
| `metrics.ts` | KPIs y series para gráficas (crecimiento, ingresos, distribución de planes, uso por módulo) |
| `countries.ts` | Lista mundial completa de indicativos telefónicos y banderas de países (`COUNTRIES`) |

---

## 8. Estado de integración

- **Backend: NO conectado.** Toda la aplicación (mobile y admin) funciona exclusivamente con datos mock; no hay llamadas de red ni persistencia real.
- **Carpetas preparadas para la integración** (existen vacías en ambas apps): `src/services/`, `src/hooks/`, `src/lib/`, `src/types/`, `src/constants/` (y en mobile además `src/stores/`, ya en uso con stores mock).
- **Patrón de integración planeado:** todas las llamadas a datos se harán vía **API REST** a través de la capa `services/`; las apps **nunca** accederán directamente a la base de datos. El tipo `ApiResponse<T>` de `@beeapp/shared-types` ya anticipa el envelope de respuesta.

---

## 9. Entorno de desarrollo

| Herramienta | Valor |
|---|---|
| JDK | Temurin 17 |
| `ANDROID_HOME` | `~/Library/Android/sdk` |
| NDK | 26.1.10909125 |
| Node | >= 18 (npm 10.9.2) |

**Comandos:**

```bash
# Instalar dependencias (raíz del monorepo)
npm install

# Mobile — servidor de desarrollo (requiere development build instalado)
cd apps/mobile && npx expo start --dev-client

# Mobile — compilar e instalar en emulador/dispositivo Android
cd apps/mobile && npx expo run:android

# Admin — servidor de desarrollo
cd apps/admin-web && npm run dev
```

**Build mobile:** el proceso completo de development builds (local con Android Studio/Xcode, EAS cloud o EAS local) está detallado en `apps/mobile/Build.MD`. La app usa `expo-dev-client`, por lo que no funciona con Expo Go. Existe además `apps/mobile/scripts/patch-expo-router.js` como parche post-install de expo-router.

---

## 10. Convenciones

- **Brand:** púrpura — `#6025d2` primary y `#5B2CD9` dark/accent (definidos en los tokens del design system; usar siempre `colors.brand.*`, no hex sueltos).
- **Tema:** solo **light mode** en mobile (y en admin).
- **Idioma de la UI:** español.
- **Iconos:** Lucide React Native en mobile, Lucide React en admin. **No se usan emojis en la UI.**
- **Componentes:** nombres en **PascalCase** (`MailListItem.tsx`); helpers/configs no-componente en camelCase (`storageHelpers.ts`, `homeModules.ts`).
- **Rutas:** convención de Expo Router en mobile (grupos `(auth)`/`(main)`, `modulo/index.tsx` por pantalla principal, kebab-case en archivos multi-palabra como `create-story.tsx`); App Router de Next.js en admin (carpetas en minúscula, segmentos dinámicos `[id]`).
- **Tamaño de archivos:** objetivo de mantener pantallas y componentes por debajo de ~300 líneas, extrayendo sub-componentes por módulo en `src/components/<modulo>/`.
- **Imports en mobile:** rutas relativas (`../../src/...`); el alias `@/*` existe en tsconfig pero no se usa en runtime.
- **Datos mock:** siempre centralizados en `src/mocks/` (con tipos exportados) o `src/stores/` cuando varias pantallas comparten estado.
