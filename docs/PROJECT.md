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
- `lucide-react-native` (iconos), `react-native-svg`, `react-native-screens`
- `react-native-safe-area-context`: `SafeAreaProvider` envuelve el `Stack` en `app/_layout.tsx` y las pantallas toman el inset del dispositivo con `useSafeAreaInsets` (nunca un padding fijo)
- `react-native-gesture-handler` + `react-native-reanimated` (con su plugin de Babel) y `react-native-draggable-flatlist`: sostienen el **arrastrar y soltar** del personalizador de módulos del Home. `GestureHandlerRootView` envuelve el `Stack` en `app/_layout.tsx` **y también el contenido del `Modal` de personalización** (un `Modal` de React Native es una ventana aparte y no hereda el root de gestos del padre)
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
│   │   │   ├── _layout.tsx   # Layout raíz (GestureHandlerRootView + SafeAreaProvider + Stack)
│   │   │   ├── index.tsx     # Splash Screen animada (White background + paths + logo)
│   │   │   ├── (auth)/       # Login (selector país), verify (matching flag/code), terms y privacy
│   │   │   ├── (main)/       # Módulos principales de la app
│   │   │   │   ├── index.tsx       # Home todo-en-uno (los módulos se abren embebidos aquí)
│   │   │   │   ├── my-services/    # BeeServices (módulo a pantalla completa)
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
| **Home** `(main)/index` | `index` | Pantalla central "todo en uno" con exactamente tres bloques: (1) barra superior — buscador con filtro por tipo de contenido (disparador **solo ícono**, desplegable en overlay) + botón de menú lateral; (2) fila de **chips**: primero **"Todas"** (fijo, no removible ni reordenable) y después los módulos activos del usuario (configurables y ordenables), todos **solo ícono** salvo el seleccionado, + engranaje de personalización, justo debajo de la barra superior; (3) lo que muestra el chip seleccionado, **renderizado embebido** debajo de ellos: la **vista general "Todas"** (por defecto al abrir la app) o el módulo elegido |
| **BeeServices** `(main)/my-services/` | `index`, `create`, `edit`, `detail` | Sección accesible desde el menú lateral donde el usuario gestiona (CRUD) sus propios productos y servicios. La lista tiene chips de filtro (Todos / Productos / Servicios) y filas planas al estilo de Correos, con botón flotante **+** para crear. El descubrimiento de productos/servicios de otros usuarios no ocurre aquí: se hace a través del asistente de IA en el chat. |
| **Chat** `(main)/chat/` | `index`, `conversation`, `new`, `call`, `story`, `create-story`, `ai-settings` | Lista de chats con historias y el **chat fijado del asistente de IA**, conversación con burbujas de mensajes, nuevo chat, llamada, historias y configuración del asistente. Los chats (personales, grupales y de la IA) se pueden proteger con el PIN de 4 dígitos. En la lista, los protegidos ocultan el preview del último mensaje y muestran 'Chat protegido'. Abrir uno pide el PIN vía PinLockModal. Se activa/desactiva desde el menú contextual del chat. |
| **Agenda** `(main)/calendar/` | `index`, `detail`, `edit` | Vista compacta por defecto: tira horizontal de la semana (día seleccionado y hoy resaltados, punto en los días con eventos) con flechas laterales para navegar, y debajo la lista de eventos del día. El selector Día/Sem/Mes cambia el paso de las flechas y añade la planificación por horas (Día) o la cuadrícula mensual (Mes). Incluye filtros, creación de reunión/evento, detalle con enlace de videollamada y edición con invitados. La ruta interna sigue siendo `calendar` |
| **Contacts** `(main)/contacts/` | `index`, `detail` | Mis contactos, descubrir (red empresarial), registro de llamadas y detalle de contacto |
| **Mail** `(main)/mail/` | `index`, `detail`, `compose` | Bandeja con multi-cuenta, carpetas con contadores, búsqueda, acciones swipe (leer/archivar/eliminar), detalle y redacción |
| **Notes** `(main)/notes/` | `index`, `edit` | Lista de notas (el candado indica cuáles están protegidas) y editor, donde se activa o retira la **protección con PIN** de esa nota; abrir una protegida pide el PIN |
| **Storage** `(main)/storage/` | `index`, `preview`, `sign` | Explorador de archivos y carpetas (lista de una columna, filtros, ordenación, breadcrumbs), vista previa y flujo de firma de documentos; archivos y carpetas pueden **protegerse con el PIN** (candado visible y PIN al abrirlos) |
| **Profile** `(main)/profile/` | `index`, `edit`, `subscription-hub`, `subscription`, `verification`, `integrations`, `security` | Se accede desde el **menú lateral del Home** (no hay pestaña Perfil). Perfil → Editar: Campos editables: foto, nombre, correo electrónico (con validación de formato), teléfono (con selector de indicativo de país). La configuración del asistente de IA se gestiona exclusivamente desde el chat de la IA, no desde el perfil. **Suscripción y Verificación** (`subscription-hub`, con dos opciones: el plan en `subscription` y **Bee Verify** en `verification`), integraciones y **Seguridad** (gestión del PIN de protección). `index` quedó huérfano — el drawer lo reemplaza |
| **Explore** `(main)/explore` | `explore` | Catálogo de módulos (absorbido por los chips de módulos del Home; la ruta se conserva pero ya no se enlaza) |
| **Notifications** `(main)/notifications` | `notifications` | Centro de notificaciones del usuario |

**Arquitectura del Home ("todo en una sola pantalla"):** la app no navega entre pantallas para usar los módulos. Siempre hay un módulo abierto **embebido dentro del Home, justo debajo de los chips** (la barra de búsqueda permanece visible arriba); tocar otro chip (`ModuleSwitcherRow`) cambia el módulo mostrado. El contenedor `EmbeddedModuleHost` mantiene un stack interno propio (lista → detalle → edición) sin cambiar de ruta, **no tiene apariencia propia** (sin tarjeta: ni fondo, ni borde, ni sombra, ni margen — el módulo fluye a lo ancho justo debajo de los chips, integrado con el fondo del Home) y **no dibuja cabecera propia**: la única cabecera es la del propio módulo, que muestra su flecha de volver solo cuando hay a dónde volver (`router.canGoBack` del shim), de modo que nunca hay dos flechas ni dos cabeceras. Las pantallas de módulo funcionan en ambos modos (embebido y como ruta real) gracias al shim de navegación `useModuleNav`/`useScreenParams` (`src/components/embedded/EmbeddedNavContext.tsx`); los destinos fuera del registro embebido (p. ej. integraciones o **BeeServices**, que es un módulo a pantalla completa) cierran el módulo y usan el router real. Los botones de acción (Redactar, Nueva nota, "+" de archivos y calendario) **no flotan sobre el contenido cuando el módulo está embebido**: se integran como botón compacto en la cabecera del módulo (`router.embedded`), y sus menús desplegables se anclan bajo esa cabecera; en modo pantalla completa siguen siendo botones flotantes. El host acepta `initialPath`/`initialParams` para abrir el módulo directamente en un elemento concreto (un correo, una conversación) y `rootParams` para pasar datos a la pantalla raíz (lo usa la vista "Todas").

**Vista general "Todas" (chip por defecto):** el primer chip del Home es `Todas` (`LayoutGrid`), siempre presente y fuera de la personalización, y es el que está seleccionado al abrir la app. Renderiza `AllModulesOverview` — un **feed vertical con una sección por cada módulo activo**, en el mismo orden que los chips del usuario, cada una con los **últimos 5 ítems** del módulo. Cada sección (`OverviewSection`) tiene cabecera con el ícono y el nombre del módulo y un botón **"Ver más"** que cambia el chip activo a ese módulo (se abre embebido en su pantalla de lista). El diseño es **limpio y plano, calcado del módulo de Correos**: sin tarjetas ni fondos de color, cabeceras de sección con el ícono del módulo en su color y "Ver más" en morado, secciones separadas solo por espaciado y filas separadas por una línea de 1 px. Los ítems usan `OverviewItem`, una fila **uniforme para todos los módulos** (avatar circular de 40 px con iniciales — texto blanco u oscuro según el tono — o ícono de tipo, título en negrita con insignias en línea, subtítulo gris, hora/fecha arriba a la derecha y punto morado de no leído); no reimplementa las filas propias de cada módulo. Al tocar un ítem, **el detalle se abre dentro de la propia vista "Todas"**: la vista está registrada en el registro embebido (`OVERVIEW_PATH`) y su stack puede empujar las pantallas de detalle de cualquier módulo, así que el chip no cambia y la flecha de volver regresa al resumen.

**Búsqueda unificada:** los módulos **ya no tienen buscador propio**. La única búsqueda de la app es la **barra global del Home** (`HomeHeader`), con su filtro por tipo de contenido (correo, chat, nota, contacto, archivo, evento). Cada módulo conserva sus **chips de filtro** (carpetas de correo, filtros de notas, pestañas de contactos, tipos de archivo, próximos/pasados de agenda), que son filtros y no búsqueda.

**Listas uniformes estilo Correos:** todos los módulos presentan su contenido en una **lista de una sola columna con filas planas** — sin tarjetas por ítem, sin bordes ni sombras — siguiendo la anatomía del módulo de Correos: avatar o ícono redondo a la izquierda, título en negrita con insignias en línea, subtítulo gris, fecha/hora a la derecha, indicadores sutiles (no leído, candado, estrella, firmado) y una línea de 1 px entre filas. **Se eliminó la opción de vista en cuadrícula** de Almacenamiento y de Notas, con su botón de cambio de vista.

**Notas protegidas:** una nota protegida con el PIN **oculta su título y su vista previa** en la lista: muestra un candado en el círculo del avatar, el texto genérico "Nota protegida" y "Desbloquea para ver el contenido" (la fecha sí se conserva). Lo mismo ocurre en la sección de Notas de la vista "Todas". El contenido solo aparece tras desbloquear con el PIN (`PinLockModal`), cuyo funcionamiento no cambia.

**Chat con el asistente de IA:** el módulo de Chat abre con un **chat fijado con el asistente** (`AI_CHAT_ID`), siempre primero y fuera de la lista deslizable — **no se puede eliminar, silenciar ni desfijar**. Su avatar es el logo de BeeApp (ícono `Bot` sobre círculo morado) en vez de iniciales, y junto al nombre lleva un badge **IA**. Al abrirlo se usa la **misma pantalla de conversación** que el resto de chats, con burbujas (`MessageBubble`) y barra de escritura: las respuestas del asistente van en burbuja morada suave y el usuario puede escribir, pero **el asistente no responde solo** (todo es mock). Desde la cabecera de ese chat —y solo de ese— se abre la **configuración del asistente** (`ai-settings`): nombre, tono (Profesional / Amigable / Directo / Creativo) e idioma, con "Guardar cambios" simulado. No hay ningún otro acceso a esa configuración: ni en Perfil ni en el menú lateral.

Navegación transversal: `FloatingTabBar` — barra flotante de **3 opciones**: botón izquierdo (Notificaciones), botón central del **asistente por voz** (micrófono, siempre visible incluso con un módulo embebido abierto) y botón derecho (Chats y llamadas). Los botones laterales muestran ícono, badge y ticker sincronizados dinámicamente: el ícono y el conteo (badge) cambian con un fundido suave de 150ms según el tipo de notificación que el ticker (`NotificationTicker`) está mostrando en ese momento (correo → Mail, nota → FileText, almacenamiento/documento → FolderOpen, agenda → Calendar, chat → MessageCircle, llamada → Phone, etc.). No hay labels fijos. Cada badge muestra las notificaciones sin leer agrupadas por el módulo/tipo que se muestra en ese instante (se oculta si es cero, y usa "9+" si pasa de nueve). Los botones laterales abren un **popover** (`NotificationsPopover`) con la lista completa de su categoría — cada ítem sin leer marcado con un punto rojo y un contador "N sin leer" en la cabecera; al abrir uno se marca como leído y el badge baja (estado mock local); tocar una notificación individual abre ese elemento en el **módulo embebido** correspondiente (en pantallas sueltas, como fallback, usa el router real). El ticker (`NotificationTicker`) comunica al padre mediante la prop `onCurrentChange` la notificación activa para sincronizar el estado.

La barra flotante está **siempre presente** para tener el asistente a mano: además del Home y de los módulos en pantalla completa, se muestra en las pantallas a las que se llega desde el menú lateral — **Editar perfil, Seguridad, Integraciones externas, Suscripción, Términos y Condiciones y Política de Privacidad** (todas con espacio inferior extra para que el último elemento no quede tapado). **Excepción:** en el momento de **teclear un código** (crear, confirmar, validar o recuperar el PIN, y al desbloquear un elemento protegido con `PinLockModal`) la barra **no se muestra**, para no competir con el teclado numérico.

**BeeServices:** sección accesible desde el **menú lateral** (entrada "BeeServices", sin subtítulo) donde el usuario gestiona sus propios productos y servicios: crear, editar, ver detalle y eliminar (`my-services/`). La pantalla principal tiene cabecera "BeeServices", una fila de **chips de filtro** — Todos / Productos / Servicios, con la misma anatomía que los chips de carpeta de Correos (el activo va con fondo morado de marca y texto blanco) — y debajo una **lista limpia estilo Correos**: filas planas separadas por una línea de 1 px, sin tarjetas, con círculo de ícono (`Package` para productos, `Wrench` para servicios), nombre en negrita, subtítulo gris "categoría · precio" (o "Cotización" cuando no hay precio) y badge de estado **Activo** (verde) / **Inactivo** (gris). Cuando el filtro no devuelve nada se muestra un estado vacío centrado con un ícono `Package` grande y el botón "Crear nuevo". Un **botón flotante circular +** abajo a la derecha abre el formulario de creación. El descubrimiento de productos y servicios **de otros usuarios** no vive aquí: se hace a través del asistente de IA en el chat, que muestra los resultados en un modal (`AiCatalogModal`) con opción de ver el detalle y contactar al vendedor.

**Safe area (barra de estado y notch):** ninguna pantalla se monta debajo de la barra de estado. `SafeAreaProvider` envuelve toda la app en `app/_layout.tsx` y el componente compartido `layout/ScreenSafeArea` (que sustituye al `SafeAreaView` de React Native, inoperante en Android) aplica como `paddingTop` el valor real de `useSafeAreaInsets().top`. El Home aplica el inset en su contenedor y el drawer lateral en su panel, ambos con el valor dinámico; nunca se usan paddings fijos por plataforma. Las pantallas de módulo **embebidas** en el Home reciben inset 0, porque el Home ya empujó el contenido debajo de la barra de estado.

**Verificación de cuentas (Bee Verify):** servicio con el que el equipo de BeeApp revisa la identidad de una cuenta y le otorga la **insignia azul de verificado**. En la app se gestiona desde el menú lateral → **Suscripción y Verificación** (`profile/subscription-hub`), que resume el plan y el estado de verificación y ofrece dos caminos: *Mi plan* (pantalla de planes existente) y *Verificación* (`profile/verification`), donde se explica qué es Bee Verify, para qué sirve, cómo se verá la insignia junto al nombre, los requisitos (mock, con estado cumplido/pendiente) y el botón "Solicitar verificación" — **visual, sin proceso real**. La insignia se dibuja con el componente compartido `VerifiedBadge` y aparece junto al nombre en chats (lista, cabecera de conversación y remitente en grupos), estados, contactos, red y llamadas, correo, el selector de nuevo chat y tus productos y servicios; se muestra solo cuando el dato mock del usuario tiene `verified: true`. En el **panel admin** el estado vive en `verificacionRed` (`verificado` / `pendiente` / `no_solicitado`), el mismo campo que gobierna las acciones de aprobar, rechazar y revocar del detalle de usuario.

**Asistente de IA (solo voz):** el único acceso es el **botón central del menú flotante**, con un **halo animado de brillo** (`AssistantGlow`) porque el asistente es la acción principal de la app. Al tocarlo se abre `VoiceAssistantScreen`, una experiencia **inmersiva a pantalla completa** sobre fondo púrpura profundo con un **visual orgánico animado** (`VoiceOrb`: capas de blobs SVG que rotan a distintas velocidades con pulso de respiración, y que se mueve más al escuchar o responder). La conversación es **solo por voz, sin teclado ni burbujas de chat**: la voz del usuario aparece **transcrita palabra por palabra** en pantalla, el asistente "piensa" un instante y su respuesta se transcribe igual, en un diálogo continuo. Los controles inferiores son mínimos: reiniciar conversación, micrófono (hablar/pausar) y cerrar. Todo es simulación mock — no hay reconocimiento de voz ni IA reales.

**Descubrimiento y Búsqueda por IA (Chat y Asistente):** El usuario puede chatear por texto con el asistente de IA (`ai-assistant`). Al realizar una consulta de búsqueda (ej. pedir un diseñador gráfico), la IA responde y de forma inmediata despliega un bottom sheet modal (`AiCatalogModal`) con los resultados de otros proveedores. El usuario puede tocar 'Ver detalle' para expandir la descripción de cada oferta inline, o 'Contactar' para iniciar/abrir una conversación directamente con el vendedor enviando un mensaje preestablecido. La integración de este catálogo en la experiencia de voz (`VoiceAssistantScreen`) queda pendiente para fases futuras.

### Admin Web (`apps/admin-web/src/app/`)

| Sección | Páginas / componentes | Qué hace |
|---|---|---|
| **Auth y legales** | `login/`, `verify/`, `terms/`, `privacy/` | Acceso al panel y páginas legales |
| **Dashboard home** | `dashboard/page.tsx` | KPIs globales, consumo y costos operativos de la plataforma, crecimiento de usuarios, ingresos y uso por módulo, feed de actividad reciente |
| **Usuarios** | `usuarios/page.tsx`, `usuarios/[id]/page.tsx` | Tabla de usuarios con filtros, paginación y filtro de **Verificación** (verificados / pendientes / sin verificar) con contadores de toda la base en la cabecera; columna "Verificación" e insignia azul junto al nombre. El detalle muestra métricas, integraciones, onboarding, Mis Productos y Servicios, privacidad y el chip **Bee Verify** con las acciones de aprobar, rechazar o revocar |
| **Suscripciones** | `suscripciones/page.tsx` | KPIs de suscripción, distribución y flujo de ingresos, y tabla de transacciones. La edición de planes se trasladó a Configuraciones |
| **Configuraciones** | `dashboard/configuracion/page.tsx` | Gestión legal de términos y condiciones (editable), políticas de privacidad (editable) y planes de suscripción (precios, límites, funciones). Incluye sección 'Canal de Soporte' para configurar el enlace (URL) al que se dirige a los usuarios desde el botón de soporte de la app (WhatsApp, sitio web, correo u otro) |
| **Perfil** | `dashboard/perfil/page.tsx` | Perfil administrativo para ver y editar nombre completo, correo (con validación de formato) y foto de perfil, con teléfono de solo lectura |

**Bloqueo con PIN (mock):** un único PIN global de 4 dígitos protege archivos, carpetas, notas y chats. Se gestiona en **Perfil → Seguridad** (`profile/security`): si no existe, se crea escribiéndolo y confirmándolo; si ya existe, hay que introducirlo para entrar a la sección y poder cambiarlo, y existe recuperación **"¿Olvidaste tu PIN?"** donde la recuperación de PIN ofrece dos métodos de envío del código: SMS o correo electrónico. El usuario elige antes de recibir el código de 6 dígitos. Se activa desde el menú de tres puntos de cada **archivo o carpeta** (o long-press/menú en chats), y desde el **interior de la nota** (fila "Proteger con PIN / Protegida con PIN" en el editor) — en la lista de notas o chats el candado es solo **indicador de estado**, no un botón; los elementos protegidos muestran un candado en la lista y piden el PIN (`PinLockModal`) antes de abrirse. Si aún no hay PIN creado, la app guía a Perfil → Seguridad. Todo el estado vive en memoria (`src/stores/pinStore.ts`): **no hay cifrado ni almacenamiento seguro** — eso llega con el backend.

---

## 5. Componentes reutilizables

### Mobile (`apps/mobile/src/components/`)

| Componente | Descripción |
|---|---|
| `AnimatedLogo.tsx` | Logo animado vectorial con alas giratorias (clockwise/counter-clockwise), cuadro central estático e inclinado (12 grados), y opción de autodetenerse (`autoStopAfter`) |
| `FloatingTabBar.tsx` | Barra flotante de 3 opciones (Notificaciones / asistente por voz / Chats y llamadas) con badge de no leídos en ambos laterales; abren popovers, nunca navegan; prop `onOpenNotificationTarget` para abrir el destino embebido |
| `VerifiedBadge.tsx` | Insignia azul de cuenta verificada (Bee Verify) con tamaño ajustable; exporta `VERIFIED_COLOR`. Se pinta junto al nombre cuando el dato mock del usuario tiene `verified` |
| `NotificationTicker.tsx` | Línea de notificación que rota sus mensajes con fade + deslizamiento (exporta mapas tipo→ícono/color) |
| `NotificationsPopover.tsx` | Ventana anclada sobre la barra con la lista completa de notificaciones de una categoría, marcando las no leídas; cada ítem abre su elemento y se marca como leído |
| `assistant/VoiceAssistantScreen.tsx` | Experiencia de voz inmersiva a pantalla completa: estados escuchando/pensando/respondiendo, transcripción progresiva y controles mínimos |
| `assistant/VoiceOrb.tsx` | Visual orgánico animado (blobs SVG rotando + pulso) que reacciona al estado del asistente |
| `assistant/AssistantGlow.tsx` | Halo pulsante reutilizable que hace resaltar los botones del asistente |
| `security/PinPad.tsx` | Teclado numérico reutilizable de código (4 dígitos para el PIN, 6 para el SMS) con puntos, estados de error (vibración) y éxito |
| `security/PinLockModal.tsx` | Modal que pide el PIN antes de abrir un elemento protegido y valida contra el PIN guardado |
| `chat/AiCatalogModal.tsx` | Modal bottom sheet que muestra los resultados de productos/servicios encontrados por la IA |
| `chat/AiCatalogItem.tsx` | Tarjeta de resultado del catálogo de IA con opciones para expandir detalles inline y contactar al proveedor |
| `assistant/voiceAssistantStyles.ts` | Estilos de la pantalla de voz (separados para mantener archivos <300 líneas) |
| `embedded/EmbeddedNavContext.tsx` | Shim de navegación: `useModuleNav` (con `embedded` y `canGoBack`) / `useScreenParams` para que las pantallas funcionen embebidas o como rutas reales |
| `embedded/embeddedRegistry.ts` | Registro ruta→componente de las 21 pantallas embebibles (incluida la vista "Todas" en `OVERVIEW_PATH`) + raíz de cada módulo (BeeServices no está: va a pantalla completa) |
| `layout/ScreenSafeArea.tsx` | Contenedor de pantalla que aplica el inset superior del dispositivo (`useSafeAreaInsets`); devuelve 0 cuando la pantalla corre embebida en el Home |
| `my-services/MyServicesHeader.tsx` | Cabecera de BeeServices con botón de volver y opcionalmente acción derecha |
| `my-services/MyServicesFilterChips.tsx` | Chips de filtro de BeeServices (Todos / Productos / Servicios) con la anatomía de los chips de carpeta de Correos |
| `my-services/MyServiceItem.tsx` | Fila plana de producto/servicio al estilo de Correos: círculo con `Package`/`Wrench`, nombre, subtítulo "categoría · precio" y badge de estado (Activo/Inactivo) |
| `my-services/MyServiceForm.tsx` | Formulario reutilizable para crear y editar, distinguiendo campos específicos |

| `embedded/EmbeddedModuleHost.tsx` | Contenedor que renderiza un módulo dentro del Home con stack interno, **sin estilo visual propio** (sin tarjeta, borde, sombra ni margen) y sin cabecera propia (la del módulo es la única) |
| `calendar/CalendarHeader.tsx` | Cabecera de Agenda (título, Hoy, selector Día/Sem/Mes) + chips de filtro (exporta `ViewMode`/`FilterChip`) |
| `calendar/CalendarWeekStrip.tsx` | Tira horizontal compacta de la semana con flechas de navegación (vista por defecto de Agenda) |
| `calendar/CalendarMonthGrid.tsx` | Cuadrícula mensual del mes de la fecha seleccionada (columnas responsive, semanas de lunes a domingo) |
| `calendar/CalendarHourlyAgenda.tsx` | Agenda del día por horas |
| `calendar/CalendarEventsList.tsx` | Lista de eventos en filas planas (hora y duración, título, modalidad e invitados) |
| `calendar/CalendarMenus.tsx` | Menú contextual de evento + menú FAB de creación |
| `chat/ChatListItem.tsx` | Fila de chat en la lista de conversaciones (con acciones swipe) |
| `chat/AiChatListItem.tsx` | Fila fijada del asistente: avatar con el logo (`Bot`), badge **IA**, ícono de fijado y sin acciones swipe |
| `chat/AiSettingsScreen.tsx` | Configuración del asistente: avatar, nombre editable, tono (Profesional / Amigable / Directo / Creativo), idioma y "Guardar cambios" (mock) |
| `chat/MessageBubble.tsx` | Burbuja de mensaje (texto, adjuntos, estados) |
| `chat/WriteBar.tsx` | Barra de escritura de mensajes |
| `home/HomeHeader.tsx` | Buscador con filtro por tipo de contenido (correo/chat/nota/contacto/archivo/evento) + botón de menú lateral; el disparador del filtro es **solo ícono** y mide su posición para anclar el desplegable |
| `home/SearchFilterMenu.tsx` | Desplegable del filtro en **overlay** (Modal transparente): siempre por encima de los chips y del módulo embebido, anclado bajo el botón, se cierra al tocar fuera o al elegir |
| `home/searchFilters.ts` | Tipos y catálogo de filtros de contenido del buscador del Home |
| `home/HomeSideMenu.tsx` | Drawer lateral que reemplaza la pestaña Perfil: tarjeta de perfil, **BeeServices** (destacado), suscripción y verificación, integraciones, seguridad, visibilidad, compartir, soporte, legal y cerrar sesión |
| `home/homeSideMenuStyles.ts` | Estilos del drawer (separados para mantener archivos <300 líneas) |
| `home/ModuleSwitcherRow.tsx` | Chips horizontales: **"Todas"** siempre primero y luego los módulos activos (elige qué se muestra embebido) + botón de personalización; los no seleccionados son **solo ícono** sin acento morado y el seleccionado muestra ícono + nombre con borde morado |
| `home/AllModulesOverview.tsx` | Pantalla raíz del chip "Todas": feed de fondo transparente (padding horizontal de 16 px para alinear con la barra superior) con una sección por módulo activo (orden de los chips); abre los detalles dentro de la propia vista |
| `home/OverviewSection.tsx` | Sección reutilizable del resumen, sin contenedor: cabecera plana con ícono/nombre del módulo y "Ver más", y hasta 5 `OverviewItem` debajo |
| `home/OverviewItem.tsx` | Fila plana y uniforme del resumen al estilo de Correos (avatar circular de iniciales o ícono, título en negrita con insignias, subtítulo gris, hora/fecha arriba a la derecha, punto de no leído y línea separadora de 1 px salvo en la última) |
| `home/overviewDataMappers.ts` | Mapeo de los mocks de cada módulo a las filas del resumen y a la ruta de detalle que abre cada ítem |
| `home/HomeCustomizeModal.tsx` | Modal de personalización: activar/desactivar módulos sin límite y reordenar los chips **arrastrándolos** (`react-native-draggable-flatlist` con `ScaleDecorator`); su contenido va dentro de un `GestureHandlerRootView` propio para que el arrastre funcione dentro del `Modal`; "Todas" no aparece: es fijo |
| `home/CustomizeModuleRow.tsx` | Fila del personalizador: **asa de arrastre `GripVertical`** a la izquierda, ícono y color del módulo, nombre y descripción, y el interruptor de activación; se eleva con sombra mientras se arrastra |
| `home/homeModules.ts` | Configuración del pool de módulos (iconos, colores, descripciones) incluido el especial `todas` (`isOverview`) y la lista `CUSTOMIZABLE_MODULES` |
| `mail/MailHeader.tsx` | Cabecera con selector de cuenta y botón de redactar |
| `mail/MailFolderChips.tsx` | Chips de carpetas con contadores de no leídos |
| `mail/MailListItem.tsx` | Fila de correo con avatar, badges y acciones swipe (**referencia visual** del resto de listas) |
| `notes/NoteListRow.tsx` | Fila plana de nota: ícono redondo con el color de la nota, título con candado, vista previa de una línea, recordatorio, fecha, favorito y acciones de editar/borrar al mantener pulsado |
| `onboarding/AboutYouSection.tsx` | Paso 1: datos personales |
| `onboarding/BusinessSection.tsx` | Paso 2: datos del negocio y tipo de oferta |
| `onboarding/AssistantSection.tsx` | Paso 3: nombre y tono del asistente con vista previa |
| `onboarding/FeaturesSection.tsx` | Paso 4: beneficios y permisos |
| `onboarding/onboardingShared.ts` | Estilos compartidos y helper `getInitials` de los pasos |
| `storage/StorageHeader.tsx` | Cabecera con ordenación y botón de crear/subir |
| `storage/StorageSummaryFilters.tsx` | Tarjeta resumen, chips de filtro y breadcrumbs |
| `storage/StorageItemsView.tsx` | Lista de archivos y carpetas en filas planas (ícono redondo, nombre, tamaño o nº de elementos, fecha, sello de firmado y menú), candado en los elementos protegidos y estado vacío |
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
| `VerifiedBadge.tsx` | Insignia azul de cuenta verificada (Bee Verify); se pinta cuando `verificacionRed === 'verificado'` |
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
| `mocks/chats.ts` | Chats, historias y mensajes de conversación (`ChatItem`, `MOCK_CHATS`, `MOCK_STORIES`, `MOCK_CONVERSATION_MESSAGES`) más el chat del asistente (`AI_CHAT_ID`, `AI_ASSISTANT_NAME`, `AI_CONVERSATION_MESSAGES`) |
| `mocks/notes.ts` | Resumen de notas para vistas externas al módulo (`NoteSummary`, `MOCK_NOTES`): ids alineados con las notas del módulo |
| `mocks/subscription.ts` | Beneficios del plan Plus (`BENEFICIOS_PLUS`) |
| `mocks/countries.ts` | Lista mundial completa de indicativos telefónicos y banderas de países (`COUNTRIES`) |
| `mocks/myServices.ts` | Productos y servicios del usuario para BeeServices (`MyProductService`, `BEE_CATEGORIES`, `formatPrice`) con métodos para agregar, actualizar, listar y eliminar en memoria |
| `mocks/aiSearchResults.ts` | Resultados de búsqueda de ofertas de otros usuarios (`AiSearchResult`, `AI_SEARCH_RESULTS`) mostrados por el asistente de IA |
| `mocks/voiceAssistant.ts` | Diálogo simulado del asistente por voz: turnos usuario/asistente que se transcriben en pantalla (`VOICE_CONVERSATION`) |
| `mocks/tabNotifications.ts` | Notificaciones del menú flotante: generales y de chat/llamadas (`GENERAL_NOTIFICATIONS`, `CHAT_NOTIFICATIONS`), cada una con id, hora y `target` (módulo + pantalla + params, con ids reales de los mocks) |
| `mocks/currentUser.ts` | Datos del usuario logueado tal como los dejó el onboarding (`CURRENT_USER`); el checkout de BeeServices los reutiliza |

| `stores/calendarStore.ts` | Eventos de calendario con invitados (`CalendarEvent`, `getEvents`/`setEvents`) — estado mutable compartido entre pantallas |
| `stores/pinStore.ts` | PIN global de protección e ids de elementos protegidos (`hasPin`, `isPinCorrect`, `setPin`, `isProtected`, `setProtected`) — estado mock en memoria |
| `stores/storageStore.ts` | Archivos y carpetas (`StorageItem`, `getItems`/`setItems`) — estado mutable compartido entre pantallas |

El campo mock **`verified`** (o `senderVerified` en correos) viaja en los datos de usuario de `contacts.ts`, `chats.ts` y `emails.ts`, y es el que decide si se pinta la insignia de verificado.

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
- **Navegación en pantallas de módulo (mobile):** usar `useModuleNav()` y `useScreenParams()` (de `src/components/embedded/EmbeddedNavContext`) en lugar de `useRouter`/`useLocalSearchParams`, para que la pantalla funcione tanto embebida en el Home como en su ruta real.
- **Safe area (mobile):** la raíz de cada pantalla usa `ScreenSafeArea` (`src/components/layout/`), nunca el `SafeAreaView` de React Native (no hace nada en Android) ni un padding superior fijo por plataforma; cuando hace falta el valor a mano se lee con `useSafeAreaInsets()`.
