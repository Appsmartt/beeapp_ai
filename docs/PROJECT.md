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
│   │   │   │   ├── index.tsx       # Home todo-en-uno (los módulos se abren embebidos aquí)
│   │   │   │   ├── beeservices/    # BeeServices: marketplace de productos y servicios
│   │   │   │   ├── calendar/       # Agenda (ruta interna: calendar)
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
| **Home** `(main)/index` | `index` | Pantalla central "todo en uno" con exactamente cuatro bloques: (1) barra superior — buscador con filtro por tipo de contenido + botón de menú lateral; (2) franja **compacta** del asistente de IA **por voz**, de la misma altura que el buscador (onda animada pequeña + "¿En qué te ayudo hoy?" + botón de micrófono); (3) fila de **chips** de los módulos activos (configurables y ordenables) + engranaje de personalización; (4) el **módulo seleccionado renderizado embebido** justo debajo, abierto por defecto en el primer chip |
| **BeeServices** `(main)/beeservices/` | `index`, `product`, `service`, `seller` | Marketplace interno: buscador, slider de destacados, categorías, pestañas Todo/Productos/Servicios y catálogo en dos columnas; detalle de producto (galería, variantes, precio, vendedor), detalle de servicio (sin precio, con cotización) y perfil público del vendedor con su catálogo |
| **Chat** `(main)/chat/` | `index`, `conversation`, `new`, `call`, `story`, `create-story` | Lista de chats con historias, conversación con burbujas de mensajes, nuevo chat, llamada y creación/visualización de historias |
| **Agenda** `(main)/calendar/` | `index`, `detail`, `edit` | Vista compacta por defecto: tira horizontal de la semana (día seleccionado y hoy resaltados, punto en los días con eventos) con flechas laterales para navegar, y debajo la lista de eventos del día. El selector Día/Sem/Mes cambia el paso de las flechas y añade la planificación por horas (Día) o la cuadrícula mensual (Mes). Incluye filtros, buscador, creación de reunión/evento, detalle con enlace de videollamada y edición con invitados. La ruta interna sigue siendo `calendar` |
| **Contacts** `(main)/contacts/` | `index`, `detail` | Mis contactos, descubrir (red empresarial), registro de llamadas y detalle de contacto |
| **Mail** `(main)/mail/` | `index`, `detail`, `compose` | Bandeja con multi-cuenta, carpetas con contadores, búsqueda, acciones swipe (leer/archivar/eliminar), detalle y redacción |
| **Notes** `(main)/notes/` | `index`, `edit` | Lista de notas (el candado indica cuáles están protegidas) y editor, donde se activa o retira la **protección con PIN** de esa nota; abrir una protegida pide el PIN |
| **Storage** `(main)/storage/` | `index`, `preview`, `sign` | Explorador de archivos y carpetas (grid/lista, filtros, ordenación, breadcrumbs), vista previa y flujo de firma de documentos; archivos y carpetas pueden **protegerse con el PIN** (candado visible y PIN al abrirlos) |
| **Profile** `(main)/profile/` | `index`, `edit`, `subscription`, `integrations`, `security` | Se accede desde el **menú lateral del Home** (no hay pestaña Perfil): edición de perfil, suscripción (plan Plus), integraciones y **Seguridad** (gestión del PIN de protección). `index` quedó huérfano — el drawer lo reemplaza |
| **Explore** `(main)/explore` | `explore` | Catálogo de módulos (absorbido por los chips de módulos del Home; la ruta se conserva pero ya no se enlaza) |
| **Notifications** `(main)/notifications` | `notifications` | Centro de notificaciones del usuario |

**Arquitectura del Home ("todo en una sola pantalla"):** la app no navega entre pantallas para usar los módulos. Siempre hay un módulo abierto **embebido dentro del Home, justo debajo de los chips** (la barra de búsqueda y el asistente permanecen visibles arriba); tocar otro chip (`ModuleSwitcherRow`) cambia el módulo mostrado. El contenedor `EmbeddedModuleHost` mantiene un stack interno propio (lista → detalle → edición) sin cambiar de ruta y **no dibuja cabecera propia**: la única cabecera es la del propio módulo, que muestra su flecha de volver solo cuando hay a dónde volver (`router.canGoBack` del shim), de modo que nunca hay dos flechas ni dos cabeceras. Las pantallas de módulo funcionan en ambos modos (embebido y como ruta real) gracias al shim de navegación `useModuleNav`/`useScreenParams` (`src/components/embedded/EmbeddedNavContext.tsx`); los destinos fuera del registro embebido (p. ej. integraciones) cierran el módulo y usan el router real. Los botones de acción (Redactar, Nueva nota, "+" de archivos y calendario) **no flotan sobre el contenido cuando el módulo está embebido**: se integran como botón compacto en la cabecera del módulo (`router.embedded`), y sus menús desplegables se anclan bajo esa cabecera; en modo pantalla completa siguen siendo botones flotantes. El host acepta `initialPath`/`initialParams` para abrir el módulo directamente en un elemento concreto (un correo, una conversación).

Navegación transversal: `FloatingTabBar` — barra flotante de **3 opciones**: **"Notificaciones"** (campana; todo lo que no es chat/llamadas), botón central del **asistente por voz** (micrófono, siempre visible incluso con un módulo embebido abierto) y **"Chats y llamadas"** (burbuja de chat con mini-teléfono). Ambos botones laterales llevan un **badge rojo con el número de notificaciones sin leer** de su categoría (mismo estilo en los dos, "9+" cuando pasa de nueve, y desaparece al llegar a cero). Muestran además una franja de notificaciones mock **rotando** y al tocarlos **no navegan**: abren un **popover** (`NotificationsPopover`) con la lista completa de su categoría — cada ítem sin leer marcado con un punto rojo y un contador "N sin leer" en la cabecera; al abrir uno se marca como leído y el badge baja (estado mock local); tocar una notificación individual abre ese elemento en el **módulo embebido** correspondiente (en pantallas sueltas, como fallback, usa el router real).

La barra flotante está **siempre presente** para tener el asistente a mano: además del Home y de los módulos en pantalla completa, se muestra en las pantallas a las que se llega desde el menú lateral — **Editar perfil, Seguridad, Integraciones externas, Suscripción, Términos y Condiciones y Política de Privacidad** (todas con espacio inferior extra para que el último elemento no quede tapado). **Excepción:** en el momento de **teclear un código** (crear, confirmar, validar o recuperar el PIN, y al desbloquear un elemento protegido con `PinLockModal`) la barra **no se muestra**, para no competir con el teclado numérico.

**BeeServices (marketplace interno):** módulo autocontenido donde los usuarios de la red publican productos y servicios. Se abre desde la sección **"BeeServices"** del menú lateral —una tarjeta resaltada con acento morado, halo animado y brillo que la recorre (`SideMenuBeeServices`)— y se muestra **embebido en el Home** como cualquier otro módulo (también está disponible como chip en la personalización de módulos). La pantalla principal tiene buscador (nombre, descripción y vendedor), **carrusel de destacados**, fila de **categorías** (Tecnología, Alimentos, Belleza, Consultoría, Diseño, Hogar), pestañas **Todo / Productos / Servicios** con contador, y el catálogo en **dos columnas** donde cada tarjeta distingue con una etiqueta si es producto o servicio: los productos muestran precio y los servicios "Solicitar cotización". El **detalle de producto** incluye galería, variantes (talla, color, memoria…), precio, descripción, datos del vendedor y los botones "Agregar al carrito" y "Comprar"; el **detalle de servicio** no tiene precio ni carrito, sino un bloque de cotización a medida y el botón "Contactar y solicitar cotización"; el **perfil público del vendedor** reúne su descripción, calificación, ventas y su catálogo de productos y servicios, con botón de contacto por chat. Las fotos son mosaicos con el ícono de la categoría (`MockPhoto`), no imágenes remotas.

Estado actual: **solo exploración**. Los botones de carrito, compra, cotización y contacto están dibujados pero **sin lógica**; el carrito, el checkout que genera la orden, el flujo de cotización por chat, mis compras/ventas y las estadísticas llegan en fases posteriores. Reglas del modelo que guían esas fases: no habrá pasarela de pago (el checkout solo genera una orden que notifica al vendedor y el pago se acuerda por chat), los productos usan carrito pero **no se mezclan vendedores en un mismo pedido**, los servicios nunca usan carrito, y cualquier usuario puede vender con independencia de su visibilidad en la red.

**Asistente de IA (solo voz):** hay dos accesos — la franja compacta del Home y el botón central del menú flotante — y ambos llevan un **halo animado de brillo** (`AssistantGlow`) porque el asistente es la acción principal de la app. Al tocarlos se abre `VoiceAssistantScreen`, una experiencia **inmersiva a pantalla completa** sobre fondo púrpura profundo con un **visual orgánico animado** (`VoiceOrb`: capas de blobs SVG que rotan a distintas velocidades con pulso de respiración, y que se mueve más al escuchar o responder). La conversación es **solo por voz, sin teclado ni burbujas de chat**: la voz del usuario aparece **transcrita palabra por palabra** en pantalla, el asistente "piensa" un instante y su respuesta se transcribe igual, en un diálogo continuo. Los controles inferiores son mínimos: reiniciar conversación, micrófono (hablar/pausar) y cerrar. Todo es simulación mock — no hay reconocimiento de voz ni IA reales.

### Admin Web (`apps/admin-web/src/app/`)

| Sección | Páginas / componentes | Qué hace |
|---|---|---|
| **Auth y legales** | `login/`, `verify/`, `terms/`, `privacy/` | Acceso al panel y páginas legales |
| **Dashboard home** | `dashboard/page.tsx` | KPIs globales, consumo y costos operativos de la plataforma, crecimiento de usuarios, ingresos y uso por módulo, feed de actividad reciente |
| **Usuarios** | `usuarios/page.tsx`, `usuarios/[id]/page.tsx` | Tabla de usuarios con filtros, paginación y filtro por actividad comercial (BeeServices); detalle con métricas, integraciones, onboarding, BeeServices y privacidad |
| **Suscripciones** | `suscripciones/page.tsx` | KPIs de suscripción, distribución y flujo de ingresos, y tabla de transacciones. La edición de planes se trasladó a Configuraciones |
| **Configuraciones** | `dashboard/configuracion/page.tsx` | Gestión legal de términos y condiciones (editable), políticas de privacidad (editable) y planes de suscripción (precios, límites, funciones) |
| **Perfil** | `dashboard/perfil/page.tsx` | Perfil administrativo para ver y editar nombre completo, correo (con validación de formato) y foto de perfil, con teléfono de solo lectura |

**Bloqueo con PIN (mock):** un único PIN global de 4 dígitos protege archivos, carpetas y notas. Se gestiona en **Perfil → Seguridad** (`profile/security`): si no existe, se crea escribiéndolo y confirmándolo; si ya existe, hay que introducirlo para entrar a la sección y poder cambiarlo, y existe recuperación **"¿Olvidaste tu PIN?"** con un código de 6 dígitos enviado por SMS (mock) antes de definir uno nuevo. Se activa desde el menú de tres puntos de cada **archivo o carpeta**, y desde el **interior de la nota** (fila "Proteger con PIN / Protegida con PIN" en el editor) — en la lista de notas el candado es solo **indicador de estado**, no un botón; los elementos protegidos muestran un candado en la lista y piden el PIN (`PinLockModal`) antes de abrirse. Si aún no hay PIN creado, la app guía a Perfil → Seguridad. Todo el estado vive en memoria (`src/stores/pinStore.ts`): **no hay cifrado ni almacenamiento seguro** — eso llega con el backend.

---

## 5. Componentes reutilizables

### Mobile (`apps/mobile/src/components/`)

| Componente | Descripción |
|---|---|
| `AnimatedLogo.tsx` | Logo animado vectorial con alas giratorias (clockwise/counter-clockwise), cuadro central estático e inclinado (12 grados), y opción de autodetenerse (`autoStopAfter`) |
| `FloatingTabBar.tsx` | Barra flotante de 3 opciones (Notificaciones / asistente por voz / Chats y llamadas) con badge de no leídos en ambos laterales; abren popovers, nunca navegan; prop `onOpenNotificationTarget` para abrir el destino embebido |
| `NotificationTicker.tsx` | Línea de notificación que rota sus mensajes con fade + deslizamiento (exporta mapas tipo→ícono/color) |
| `NotificationsPopover.tsx` | Ventana anclada sobre la barra con la lista completa de notificaciones de una categoría, marcando las no leídas; cada ítem abre su elemento y se marca como leído |
| `assistant/VoiceAssistantScreen.tsx` | Experiencia de voz inmersiva a pantalla completa: estados escuchando/pensando/respondiendo, transcripción progresiva y controles mínimos |
| `assistant/VoiceOrb.tsx` | Visual orgánico animado (blobs SVG rotando + pulso) que reacciona al estado del asistente |
| `assistant/AssistantGlow.tsx` | Halo pulsante reutilizable que hace resaltar los botones del asistente |
| `security/PinPad.tsx` | Teclado numérico reutilizable de código (4 dígitos para el PIN, 6 para el SMS) con puntos, estados de error (vibración) y éxito |
| `security/PinLockModal.tsx` | Modal que pide el PIN antes de abrir un elemento protegido y valida contra el PIN guardado |
| `assistant/voiceAssistantStyles.ts` | Estilos de la pantalla de voz (separados para mantener archivos <300 líneas) |
| `embedded/EmbeddedNavContext.tsx` | Shim de navegación: `useModuleNav` (con `embedded` y `canGoBack`) / `useScreenParams` para que las pantallas funcionen embebidas o como rutas reales |
| `embedded/embeddedRegistry.ts` | Registro ruta→componente de las 23 pantallas embebibles + raíz de cada módulo |
| `beeservices/BeeServicesHeader.tsx` | Cabecera del marketplace: marca, subtítulo y buscador de productos y servicios |
| `beeservices/FeaturedCarousel.tsx` | Carrusel de publicaciones destacadas; mide el contenedor para adaptarse al ancho embebido, con puntos de página |
| `beeservices/MarketFilters.tsx` | `KindTabs` (Todo/Productos/Servicios con contador) y `CategoryRow` (chips de categoría) |
| `beeservices/ListingGrid.tsx` | Catálogo de 2 columnas con ancho porcentual: etiqueta producto/servicio, categoría, vendedor, precio o "Solicitar cotización", calificación y estado vacío |
| `beeservices/MockPhoto.tsx` | Mosaico que sustituye a la foto del catálogo (tinte + ícono de la categoría), sin imágenes remotas |
| `beeservices/DetailGallery.tsx` | Galería deslizable de las fotos de una publicación con puntos de página |
| `beeservices/SellerCard.tsx` | Resumen del vendedor/proveedor dentro del detalle, con acceso a su perfil público |
| `embedded/EmbeddedModuleHost.tsx` | Contenedor que renderiza un módulo dentro del Home con stack interno, sin cabecera propia (la del módulo es la única) |
| `calendar/CalendarHeader.tsx` | Cabecera de Agenda (título, Hoy, selector Día/Sem/Mes, buscador) + chips de filtro (exporta `ViewMode`/`FilterChip`) |
| `calendar/CalendarWeekStrip.tsx` | Tira horizontal compacta de la semana con flechas de navegación (vista por defecto de Agenda) |
| `calendar/CalendarMonthGrid.tsx` | Cuadrícula mensual del mes de la fecha seleccionada (columnas responsive, semanas de lunes a domingo) |
| `calendar/CalendarHourlyAgenda.tsx` | Agenda del día por horas |
| `calendar/CalendarEventsList.tsx` | Lista de tarjetas de eventos |
| `calendar/CalendarMenus.tsx` | Menú contextual de evento + menú FAB de creación |
| `chat/ChatListItem.tsx` | Fila de chat en la lista de conversaciones |
| `chat/MessageBubble.tsx` | Burbuja de mensaje (texto, adjuntos, estados) |
| `chat/WriteBar.tsx` | Barra de escritura de mensajes |
| `home/HomeHeader.tsx` | Buscador con filtro por tipo de contenido (correo/chat/nota/contacto/archivo/evento) + botón de menú lateral |
| `home/HomeSideMenu.tsx` | Drawer lateral que reemplaza la pestaña Perfil: tarjeta de perfil, **BeeServices** (destacado), suscripción, integraciones, seguridad, visibilidad, compartir, soporte, legal y cerrar sesión; con `onOpenModule` abre el marketplace embebido en el Home |
| `home/SideMenuBeeServices.tsx` | Entrada resaltada del marketplace en el drawer: acento morado, halo animado (`AssistantGlow`) y brillo que recorre la tarjeta |
| `home/homeSideMenuStyles.ts` | Estilos del drawer (separados para mantener archivos <300 líneas) |
| `home/HomeAssistantCard.tsx` | Franja compacta (una fila, altura del buscador) del asistente por VOZ: onda sinusoidal animada (SVG), prompt y micrófono con halo de brillo; abre la experiencia de voz inmersiva |
| `home/ModuleSwitcherRow.tsx` | Chips horizontales de los módulos activos (elige cuál se muestra embebido) + botón de personalización |
| `home/HomeCustomizeModal.tsx` | Modal de personalización: activar/desactivar módulos sin límite y reordenar los chips con flechas |
| `home/homeModules.ts` | Configuración del pool de módulos (iconos, colores, descripciones) |
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
| `storage/StorageItemsView.tsx` | Vistas de archivos y estado vacío: cuadrícula de **2 columnas** con ancho porcentual (se adapta al contenedor embebido) y lista de una columna como alternativa; muestra el candado de los elementos protegidos |
| `storage/StorageContextMenu.tsx` | Menú contextual de archivo/carpeta |
| `storage/StorageDialogs.tsx` | Modal de mover a carpeta y diálogo de nombre |
| `storage/StorageFabMenu.tsx` | Menú FAB de creación/subida |
| `storage/storageItemIcon.tsx` | Icono según tipo de archivo |

Auxiliares: `src/utils/storageHelpers.ts` (ordenación, filtrado y creación mock de archivos) y `src/utils/dateHelpers.ts` (fechas 'YYYY-MM-DD' de Agenda: parseo local, inicio de semana, saltos de día/mes y etiquetas de periodo en español) — funciones puras.

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
| `mocks/beeservices.ts` | Catálogo del marketplace: categorías, vendedores y publicaciones de producto/servicio (`BEE_CATEGORIES`, `BEE_SELLERS`, `BEE_LISTINGS`) con buscadores por id (`getListing`, `getSeller`, `getSellerListings`, `getFeatured`) y `formatPrice` en pesos |
| `mocks/voiceAssistant.ts` | Diálogo simulado del asistente por voz: turnos usuario/asistente que se transcriben en pantalla (`VOICE_CONVERSATION`) |
| `mocks/tabNotifications.ts` | Notificaciones del menú flotante: generales y de chat/llamadas (`GENERAL_NOTIFICATIONS`, `CHAT_NOTIFICATIONS`), cada una con id, hora y `target` (módulo + pantalla + params, con ids reales de los mocks) |
| `stores/calendarStore.ts` | Eventos de calendario con invitados (`CalendarEvent`, `getEvents`/`setEvents`) — estado mutable compartido entre pantallas |
| `stores/pinStore.ts` | PIN global de protección e ids de elementos protegidos (`hasPin`, `isPinCorrect`, `setPin`, `isProtected`, `setProtected`) — estado mock en memoria |
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
- **BeeServices está en fase de exploración:** el catálogo se navega completo, pero carrito, órdenes, cotizaciones por chat, mis compras/ventas y estadísticas aún no existen. Cuando lleguen, el checkout **no procesará pagos**: generará una orden que notifica al vendedor.
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
- **Navegación en pantallas de módulo (mobile):** usar `useModuleNav()` y `useScreenParams()` (de `src/components/embedded/EmbeddedNavContext`) en lugar de `useRouter`/`useLocalSearchParams`, para que la pantalla funcione tanto embebida en el Home como en su ruta real.
