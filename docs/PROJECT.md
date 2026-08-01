# BeeApp AI — Documentación del Proyecto

> Estado actual del proyecto a julio de 2026. Este documento describe **lo que existe hoy**: toda la interfaz está implementada con datos mock, sin backend conectado.

---

## 1. Descripción general

**BeeApp AI** es un ecosistema de comunicación y productividad empresarial. Integra en una sola plataforma los módulos que una empresa usa a diario — chat, correo, calendario, contactos, notas, almacenamiento de archivos y un asistente de IA — junto con un panel de administración web para gestionar usuarios, suscripciones y notificaciones.

El proyecto es un **monorepo** con dos aplicaciones y paquetes compartidos:

| Ruta | Qué es |
|---|---|
| `apps/mobile` | App móvil (React Native + Expo) para el usuario final |
| `apps/mobile-web` | Aplicación web (Next.js 14 + Tailwind CSS) para el usuario final |
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

### Mobile Web (`@beeapp/mobile-web`)
- **Next.js** ^14.2.35 con **App Router**
- **TypeScript** ^5.4.0 + **Tailwind CSS** ^3.4.1
- `lucide-react` (iconos web)
- Comparte tokens de diseño con el paquete `@beeapp/design-system` vía CSS variables (`--brand-primary: #6025d2`, `--brand-dark: #5B2CD9`, neutros y semánticos)

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
│   ├── mobile-web/
│   │   ├── src/
│   │   │   ├── app/          # Rutas App Router (Next.js 14)
│   │   │   │   ├── layout.tsx      # Layout raíz limpio con metadata
│   │   │   │   ├── page.tsx        # Landing Page principal
│   │   │   │   ├── globals.css     # CSS variables del design-system y Tailwind
│   │   │   │   ├── login/          # Ruta /login
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── verify/         # Ruta /verify (OTP)
│   │   │   │   │   └── page.tsx
│   │   │   │   └── app/            # Placeholder post-login (/app)
│   │   │   │       └── page.tsx
│   │   │   └── components/
│   │   │       ├── landing/        # LandingNavbar, Hero, Features, HowItWorks, Security, Cta, Footer
│   │   │       └── auth/           # LoginForm, OtpForm, CountrySelector
│   │   ├── tailwind.config.ts  # Configuración Tailwind con tokens de marca
│   │   └── package.json        # `@beeapp/mobile-web`
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
| **Auth** `(auth)/` | `login`, `verify`, `app-lock-setup`, `terms`, `privacy` | Inicio de sesión (con selector de país internacional), verificación por código (con indicativo coherente), **App Lock Setup** (configuración obligatoria del bloqueo de app con biometría o PIN de 6 dígitos), y páginas legales |
| **Onboarding** `onboarding/` | `index` | Flujo guiado de **3 pasos** (datos personales, tono del asistente y beneficios/permisos) que se ejecuta tras configurar el bloqueo de la app. **No pide información de empresa ni de negocio**: eso se gestiona después desde BeeServices |
| **Home** `(main)/index` | `index` | Pantalla central "todo en uno" con exactamente tres bloques: (1) barra superior — buscador con filtro por tipo de contenido (disparador **solo ícono**, desplegable en overlay) + botón de menú lateral; (2) fila de **chips**: primero **"Todas"** (fijo, no reordenable) y después **todos los módulos** —ninguno se puede ocultar, la personalización solo cambia su orden—, todos **solo ícono** salvo el seleccionado, + engranaje de personalización, justo debajo de la barra superior; (3) lo que muestra el chip seleccionado, **renderizado embebido** debajo de ellos: la **vista general "Todas"** (por defecto al abrir la app) o el módulo elegido |
| **BeeServices** `(main)/my-services/` | `index`, `business-detail`, `product-detail`, `service-detail` | Sección accesible desde el menú lateral donde el usuario gestiona sus **negocios** y sus respectivos catálogos de productos y servicios. La pantalla principal (`index`) lista los negocios. Al tocar un negocio, se navega a `business-detail` para visualizar la información del negocio (`BusinessHeader`), editarlo o eliminarlo, filtrar el catálogo (Todos / Productos / Servicios) y ver las ofertas (`CatalogItem`). Un botón flotante `+` abre modales fullscreen (`CreateProductModal` y `CreateServiceModal`) para añadir ítems con imágenes y características dinámicas. Tocar un artículo del catálogo navega a `product-detail` o `service-detail` para ver su ficha completa, editarlo o eliminarlo. |
| **Chat** `(main)/chat/` | `index`, `conversation`, `chat-profile`, `community`, `community-profile`, `new`, `call`, `ai-settings` | Tres pestañas — **Chats**, **Comunidades** y **Contactos** — con la **fila de estados** y los **chips de categoría** arriba de la lista y el **chat fijado del asistente de IA**, conversación con burbujas de mensajes, **perfil del chat**, nuevo chat, llamada y configuración del asistente. La pestaña *Contactos* renderiza `ContactsListView` (mis contactos, descubrir red y registro de llamadas) y el botón de la cabecera cambia de `SquarePen` a `UserPlus` para crear un contacto en vez de abrir el menú de crear chat. Los chats (personales, grupales y de la IA) se pueden proteger con el PIN de 4 dígitos. En la lista, los protegidos ocultan el preview del último mensaje y muestran 'Chat protegido'. Abrir uno pide el PIN vía PinLockModal. Se activa/desactiva desde el menú contextual del chat. |
| **Agenda** `(main)/calendar/` | `index`, `detail`, `edit` | Vista compacta por defecto: tira horizontal de la semana (día seleccionado y hoy resaltados, punto en los días con eventos) con flechas laterales para navegar, y debajo la lista de eventos del día. El selector Día/Sem/Mes cambia el paso de las flechas y añade la planificación por horas (Día) o la cuadrícula mensual (Mes). Incluye filtros, creación de reunión/evento, detalle con enlace de videollamada y edición con invitados. La ruta interna sigue siendo `calendar` |
| **Contacts** `(main)/contacts/` | `index`, `detail` | **Ya no es un módulo del Home**: no tiene chip ni raíz en `MODULE_ROOTS`. La lista (mis contactos, descubrir red y registro de llamadas) vive como **pestaña Contactos dentro de Chat**, y ambas la comparten vía `ContactsListView`. `detail` sigue registrado en `EMBEDDED_SCREENS` para que la ficha del contacto se abra embebida desde esa pestaña; `index` se conserva como ruta pero ya no se enlaza desde el Home |
| **Mail** `(main)/mail/` | `index`, `detail`, `compose` | Bandeja con multi-cuenta, carpetas con contadores, búsqueda, acciones swipe (leer/archivar/eliminar), detalle y redacción |
| **Notes** `(main)/notes/` | `index`, `edit` | Lista de notas (el candado indica cuáles están protegidas) y editor, donde se activa o retira la **protección con PIN** de esa nota; abrir una protegida pide el PIN |
| **Storage** `(main)/storage/` | `index`, `preview`, `sign` | Explorador de archivos y carpetas (lista de una columna, filtros, ordenación, breadcrumbs), vista previa y flujo de firma de documentos; archivos y carpetas pueden **protegerse con el PIN** (candado visible y PIN al abrirlos) |
| **Profile** `(main)/profile/` | `index`, `edit`, `subscription-hub`, `subscription`, `verification`, `integrations`, `devices`, `security` | Se accede desde el **menú lateral del Home** (no hay pestaña Perfil). **Dispositivos** (`devices`, `DevicesScreen`) vincula **BeeApp Web**: un botón grande "Escanear código QR" abre un simulacro de cámara (rectángulo oscuro con marco de escaneo y el texto "Apunta la cámara al código QR de BeeApp Web" — **no abre la cámara real**), y debajo lista los **dispositivos activos** (mock `src/mocks/devices.ts`: "Chrome - Windows" y "Safari - macOS", con su última conexión) con "Cerrar sesión" en rojo por fila y "Cerrar todas las sesiones" al final; ambos piden confirmación con `Alert` y solo quitan el dispositivo de la lista en memoria. Perfil → Editar: **solo datos personales** — foto, nombre, correo electrónico (con validación de formato) y teléfono (con selector de indicativo de país). No hay campos de empresa, cargo ni tipo de oferta: **toda la información de negocio vive exclusivamente en BeeServices**. **Suscripción y Verificación** (`subscription-hub`, con dos opciones: el plan en `subscription` y **Bee Verify** en `verification`), integraciones y **Seguridad** (gestión del PIN de protección). `index` quedó huérfano — el drawer lo reemplaza |
| **Explore** `(main)/explore` | `explore` | Catálogo de módulos (absorbido por los chips de módulos del Home; la ruta se conserva pero ya no se enlaza) |
| **Notifications** `(main)/notifications` | `notifications` | Centro de notificaciones del usuario |

**Arquitectura del Home ("todo en una sola pantalla"):** la app no navega entre pantallas para usar los módulos. Siempre hay un módulo abierto **embebido dentro del Home, justo debajo de los chips** (la barra de búsqueda permanece visible arriba); tocar otro chip (`ModuleSwitcherRow`) cambia el módulo mostrado. El contenedor `EmbeddedModuleHost` mantiene un stack interno propio (lista → detalle → edición) sin cambiar de ruta, **no tiene apariencia propia** (sin tarjeta: ni fondo, ni borde, ni sombra, ni margen — el módulo fluye a lo ancho justo debajo de los chips, integrado con el fondo del Home) y **no dibuja cabecera propia**: la única cabecera es la del propio módulo, que muestra su flecha de volver solo cuando hay a dónde volver (`router.canGoBack` del shim), de modo que nunca hay dos flechas ni dos cabeceras. Las pantallas de módulo funcionan en ambos modos (embebido y como ruta real) gracias al shim de navegación `useModuleNav`/`useScreenParams` (`src/components/embedded/EmbeddedNavContext.tsx`); los destinos fuera del registro embebido (p. ej. integraciones o **BeeServices**, que es un módulo a pantalla completa) cierran el módulo y usan el router real. Los botones de acción (Redactar, Nueva nota, "+" de archivos y calendario) **no flotan sobre el contenido cuando el módulo está embebido**: se integran como botón compacto en la cabecera del módulo (`router.embedded`), y sus menús desplegables se anclan bajo esa cabecera; en modo pantalla completa siguen siendo botones flotantes. El host acepta `initialPath`/`initialParams` para abrir el módulo directamente en un elemento concreto (un correo, una conversación) y `rootParams` para pasar datos a la pantalla raíz (lo usa la vista "Todas").

**Vista general "Todas" (chip por defecto):** el primer chip del Home es `Todas` (`LayoutGrid`), siempre presente y fuera de la personalización, y es el que está seleccionado al abrir la app. Renderiza `AllModulesOverview` — un **Dashboard interactivo con tarjetas de resumen y métricas por módulo**. En la parte superior incluye una **Tarjeta de Bienvenida IA** (saludo personalizado, ícono Sparkles y chips de sugerencias rápidas como *"Resume mis correos"*, *"Prepara mi próxima reunión"*, *"Busca un diseñador gráfico"* que simulan abrir el asistente). Debajo, un **grid de tarjetas de resumen** para Chat (badges de no leídos y avatares de contactos recientes), Correos (mensajes sin leer y preview), Agenda (eventos del día y próximo compromiso), Notas (notas nuevas y preview) y Almacenamiento (porcentaje de uso y barra de progreso mini). En Web (3 columnas), el grid incluye una tarjeta de **Actividad reciente** con timeline cronológico cruzado de eventos. Finalmente, al pie se muestra la tarjeta de **BeeServices** en ancho completo con métricas compactas (*"2 Negocios • 4 Productos • 3 Servicios"*).

**Búsqueda unificada:** los módulos **ya no tienen buscador propio**. La única búsqueda de la app es la **barra global del Home** (`HomeHeader`), con su filtro por tipo de contenido (correo, chat, nota, contacto, archivo, evento). Cada módulo conserva sus **chips de filtro** (carpetas de correo, filtros de notas, pestañas de contactos, tipos de archivo, próximos/pasados de agenda), que son filtros y no búsqueda.

**Listas uniformes estilo Correos:** todos los módulos presentan su contenido en una **lista de una sola columna con filas planas** — sin tarjetas por ítem, sin bordes ni sombras — siguiendo la anatomía del módulo de Correos: avatar o ícono redondo a la izquierda, título en negrita con insignias en línea, subtítulo gris, fecha/hora a la derecha, indicadores sutiles (no leído, candado, estrella, firmado) y una línea de 1 px entre filas.

**Chips del Home:** la fila muestra **siempre los seis módulos**, en este orden por defecto: **Todas, Chat, Correos, Notas, Almacenamiento y Agenda** — Chat es el primer módulo después de "Todas", y **Contactos ya no es un módulo** (es una pestaña dentro de Chat). Ninguno se activa ni se desactiva, y `HomeCustomizeModal` **solo reordena** arrastrando los cinco reordenables ("Todas" va siempre primero). Los chips son grandes y cómodos de tocar — 46 px de diámetro con el ícono a 28 px; el seleccionado crece a lo ancho para mostrar su nombre sin cambiar de altura. Si todos caben en el ancho de la pantalla se reparten con `space-evenly` sin scroll; si no caben (por ejemplo con el chip expandido) la fila pasa a `ScrollView` horizontal, que nunca deja hueco al final.

**Vista lista o cuadrícula (Notas y Almacenamiento):** ambos módulos tienen en su cabecera un **conmutador de vista** (`ViewModeToggle`, íconos `List` y `Grid2x2`, el activo en morado de marca). La **lista es la vista por defecto** y es la fila plana descrita arriba. La **cuadrícula es adaptativa**: calcula las columnas con `useWindowDimensions` — **2 columnas** por debajo de 700 px de ancho y **3 columnas** de ahí en adelante (tablet o web). En Notas cada tarjeta tiene alto fijo, borde fino, título en 600, vista previa gris y fecha abajo a la derecha; las notas protegidas muestran "Nota protegida" con candado y sin contenido. En Almacenamiento cada tarjeta lleva el ícono grande del tipo de archivo arriba, el nombre a una línea, el tamaño o el número de elementos, y los indicadores de firmado y protegido. La **tarjeta de espacio disponible y los chips de filtro se quedan arriba** en cualquiera de las dos vistas. El modo elegido vive en `useState` y no persiste entre sesiones.

**Categorización de archivos y carpetas en Almacenamiento:** El módulo de Almacenamiento cuenta con un sistema de categorías personalizables para clasificar archivos y carpetas. En la app móvil (`apps/mobile/`), se presenta una fila de chips de filtro (`StorageCategoryChips`) en la cabecera debajo de la tarjeta de espacio ("Todos", categorías predeterminadas como *Personal*, *Trabajo*, *Importante*, y el chip `+` para crear nuevas categorías mediante un modal interactivo de nombre, ícono y color). En la versión web (`apps/mobile-web/`), las categorías se despliegan como íconos interactivos con su color distintivo y tooltip explicativo en el sidebar izquierdo (`StorageOptionsBar`), situadas debajo de los filtros por tipo con un separador fino y el botón `+` para añadir categorías. En ambas plataformas, el menú contextual de tres puntos de cada archivo y carpeta incluye la opción *"Asignar a categoría"* (con ícono `Tag`), la cual despliega un modal con checkboxes (`StorageAssignCategoryModal` / `AssignCategoryModal`) que permite asociar múltiples categorías a cualquier elemento.

**Notas organizadas por categorías (mobile y web):** la vista principal del módulo de Notas ya no es la lista de notas, sino una **cuadrícula de categorías** — 2 columnas en mobile, 2 o 3 en web según el ancho del panel. Cada tarjeta lleva el ícono de la categoría dentro de un círculo de su color al 10 %, el nombre al lado y el conteo de notas en gris; radio 16 px, borde fino `gray200` y padding 16 px. Las dos primeras son **fijas y no se eliminan**: *Todas* (`FileText`) y *Protegidas* (`Lock`, las notas con PIN). Detrás van diez **predeterminadas eliminables** — Documento, Proyecto, Reunión, Presupuesto, Viaje, Receta, Idea, Hogar, Estudio y Personal — cada una con su ícono de Lucide y su color. El botón `FolderPlus` de la cabecera abre un modal para **crear categorías** con nombre, uno de 15 íconos y uno de 8 colores. Al tocar una categoría el panel cambia a la **lista de notas filtrada**, con su nombre en la cabecera y una flecha para volver a la cuadrícula; en mobile la lista conserva el conmutador lista/cuadrícula y los chips de *Todas / Recientes / Con recordatorio / Favoritas / Papelera*, que ahora filtran **dentro** de la categoría abierta. Las categorías viven en `mocks/noteCategories.ts` (idéntico en las dos apps, con el ícono guardado como clave y resuelto en `noteCategoryIcons.ts`), y cada nota mock lleva su `categoryId`. En web, el sidebar vertical de Notas quedó **solo con la campana de notificaciones**: la navegación es la cuadrícula.

**Editor de notas con formato:** el editor pasó de un campo de texto plano a uno con **barra de herramientas de formato** fija bajo el contenido, con los mismos siete botones en ambas plataformas — negrita, itálica, viñetas (`List`), lista numerada (`ListOrdered`), título (`Heading`, que cicla entre niveles), enlace (`Link`) e imagen (`ImagePlus`) — y el **contador de palabras** a la derecha. Debajo del título van los **chips de las categorías** de la nota, cada uno con su color y una `X` para quitarlo, más un `+` que abre el selector para asignar más de una.
 - **Mobile:** sin librerías WYSIWYG. Los botones insertan **marcadores tipo markdown** en el `TextInput` (`**negrita**`, `*itálica*`, `- ` para viñetas, `1. ` para numeradas, `# ` y `## ` para títulos), operando sobre la selección real gracias a `onSelectionChange`. `noteFormat.ts` concentra esa lógica y `NoteMarkdownText` hace el parsing para pintar el resultado; el ícono `Eye` de la cabecera alterna entre **editar y vista previa con formato**.
 - **Web:** editor `contentEditable` con `document.execCommand` (`bold`, `italic`, `insertUnorderedList`, `insertOrderedList`, `formatBlock` para H1/H2/H3, `createLink` con la URL pedida por `prompt`, e `insertHTML` para el placeholder de imagen). Los botones hacen `preventDefault` en `mousedown` para no robarle el foco al editor. Como Tailwind resetea `h1`/`ul`/`ol`, las clases `.note-editor` de `globals.css` devuelven la jerarquía visual.
 - **Tarjeta AI Insight (solo web):** dentro del contenido de dos notas mock (`hasAiInsight`) aparece una tarjeta de fondo `brand-primary` al 5 %, radio 12 px, con ícono `Sparkles`, título "AI Insight" en morado, un texto sugerido y el botón "Generar resumen" que solo cambia a "Resumen generado". Es mock: no hay resumen real.

**Notas protegidas:** una nota protegida con el PIN **oculta su título y su vista previa** en la lista: muestra un candado en el círculo del avatar, el texto genérico "Nota protegida" y "Desbloquea para ver el contenido" (la fecha sí se conserva). Lo mismo ocurre en la sección de Notas de la vista "Todas". El contenido solo aparece tras desbloquear con el PIN (`PinLockModal`), cuyo funcionamiento no cambia.

**Crear contacto:** en la pestaña *Contactos* del módulo de Chat la cabecera muestra un botón `UserPlus` que abre `CreateContactModal`, un bottom sheet con el formulario básico: nombre, apellido, teléfono con **selector de indicativo de país** (`CountryCodeModal`, con buscador sobre la lista mundial de `mocks/countries.ts`), correo, empresa y cargo. Los campos son filas planas con ícono a la izquierda, sin contenedores. "Guardar" agrega el contacto al principio de `MY_CONTACTS` (mock en memoria) y salta a la pestaña *Mis contactos*; "Cancelar" cierra sin hacer nada.

**Pestañas del módulo de Chat:** bajo el título "Chats" hay dos pestañas de ancho completo con subrayado (`ChatTabs`): la activa va en morado de marca con línea inferior y peso 600, la inactiva en gris y peso 400. **Chats** muestra los estados, los chips de categoría y la lista de conversaciones; **Comunidades** muestra la lista de comunidades. El cambio de pestaña es simple estado local, sin librerías de tabs.

**Comunidades:** una comunidad es un **grupo grande con una regla propia — solo el administrador (quien la creó) publica, y el resto de miembros únicamente reacciona**. Todas las comunidades son **privadas: se entra por invitación**, así que no hay comunidades públicas, ni sección de descubrimiento, ni buscador. La pestaña *Comunidades* (`CommunitiesTabView`) es una **lista plana, sin títulos de sección**, con las comunidades a las que el usuario pertenece. Cada fila es un `CommunityListItem`: avatar circular de iniciales, nombre, número de miembros debajo y, a la derecha, la insignia **Admin** si la creó él y el badge de no leídos. Las comunidades nuevas se crean desde el **menú de la cabecera del módulo**, no desde un botón flotante.

**Botón de crear del módulo de Chat:** el botón `SquarePen` de la cabecera ya no abre el nuevo chat directamente: despliega `ChatCreateMenu`, un menú anclado bajo el botón (fondo blanco, esquinas de 12 px, sombra suave y separadores finos) con tres opciones — **Nuevo chat** (`MessageCircle`, abre `chat/new`), **Nuevo grupo** (`Users`, abre `chat/new` directamente en su asistente de grupo con `mode=group`) y **Nueva comunidad** (`Megaphone`, abre `CreateCommunityModal`). Se cierra al elegir una opción o al tocar fuera, y está disponible **en las dos pestañas**, porque vive en la cabecera del módulo y no dentro de un tab. `CreateCommunityModal` pide foto (marcador, mock), nombre (obligatorio), descripción y **categoría** (Negocios, Tecnología, Diseño, Finanzas, Educación, Comunidad); al crear, la comunidad se agrega al mock y la app salta a la pestaña *Comunidades*.

**Pantalla de una comunidad (`chat/community`):** en la cabecera van el avatar, el nombre y el número de miembros, y tocarla abre el perfil. El contenido **no son burbujas de chat sino publicaciones**: cada una es una tarjeta (`CommunityPostCard`) con avatar del autor, nombre y antigüedad arriba, el texto debajo y una **fila de reacciones** con los íconos de Lucide `ThumbsUp`, `Heart` y `Laugh` (íconos, nunca emojis Unicode); tocar una la marca o desmarca y el conteo sube o baja. Si el usuario es el **administrador** aparece abajo la barra de escritura (`WriteBar`) y lo que publica entra al principio del feed; si es **miembro** no hay barra, sino la nota centrada *"Solo el administrador puede publicar"*.

**Perfil de la comunidad (`chat/community-profile`):** avatar grande, nombre y descripción — **editables en línea solo para el administrador**, de solo lectura para el resto —, el conteo de miembros y los chips de **categoría** (también solo editables por el admin). Debajo reutiliza `MemberListSection` con la misma anatomía que los grupos: el usuario actual primero con la etiqueta "Tú", rol Admin/Miembro, y —si eres admin— la `X` para quitar a alguien y el botón "Agregar" que abre `AddMemberModal`. Cierra con las acciones: **Silenciar notificaciones** (interruptor), **Salir de la comunidad** en rojo y, solo para el administrador, **Eliminar comunidad**; ambas destructivas solo muestran un diálogo de confirmación. Todo el estado vive en `mocks/communities.ts`.

**Categorías de chats:** entre los estados y la lista hay una fila de chips de filtro (`ChatCategoryChips`). El primero es **"Todos"** (activo por defecto, sin filtro) y luego van las categorías del usuario, cada una con su ícono y su color de chip; el chip activo se pinta en morado de marca. Al final hay un chip punteado con `Plus` que abre **`CreateCategoryModal`**: nombre, uno de ocho íconos de Lucide (`Users`, `Briefcase`, `Heart`, `Home`, `Star`, `GraduationCap`, `Coffee`, `Gamepad2`) y uno de seis colores de chip. Un chat se archiva en categorías desde su **menú de opciones** (mantener pulsado → "Asignar a categoría"), que abre **`AssignCategoryModal`** con checkmarks: **un chat puede estar en varias categorías** a la vez. El chat del asistente no tiene categoría y desaparece de la lista cuando hay un filtro activo. Todo vive en memoria (`MOCK_CATEGORIES`, campo `categoryIds` de cada chat).

**Estados:** encima de la lista de chats van los estados como **círculos horizontales** (`StatusCirclesRow`, `ScrollView` horizontal de avatares de 50 px con el nombre debajo). El **primer círculo es el del usuario**, con las iniciales y una insignia `Plus` que abre el editor. Los demás son los estados de los contactos: **anillo morado si no se han visto** y anillo gris si ya se vieron.

**Visor (`StatusViewer`):** al tocar un círculo se abre a pantalla completa, con una estética propia (no la de una app de mensajería). El fondo es **la misma foto desenfocada** (`blurRadius` del `Image` de React Native, sin librerías extra) y oscurecida, y sobre ella la **foto nítida flota como tarjeta** con esquinas de 20 px, márgenes de 24 px y sombra; en los estados de solo texto el fondo es el color que eligió el autor con un velo sutil. El **texto del estado se dibuja donde su autor lo dejó** (coordenadas en porcentaje) y respeta su tamaño, peso y color. Arriba, fuera de la foto, van el botón `X`, el avatar, el nombre y la antigüedad; justo debajo, las **barras de progreso en forma de píldora** (bordes completamente redondeados): la activa se llena en ~6 s en `brand.primary`, las completadas en blanco opaco y las pendientes en blanco tenue. Al terminar salta sola al siguiente. **Tocar el tercio derecho avanza, el izquierdo retrocede y deslizar hacia abajo cierra** el visor (gesto de `react-native-gesture-handler`). Si el estado tiene un **producto de BeeServices vinculado**, aparece abajo como tarjeta blanca flotante (radio 16, sombra) con ícono `ShoppingBag`, nombre, precio o "Cotización" y botón **Contactar**; se puede deslizar hacia abajo para ocultarla.

**Editor (`CreateStatusModal`):** ocupa la pantalla completa. Arriba: `X` para cancelar y botón **Publicar** en morado. Debajo, una **zona de preview** que muestra en vivo cómo quedará el estado (la foto de fondo o el color elegido) y, encima, el **texto arrastrable**: se mueve con el dedo mediante `Gesture.Pan` de `react-native-gesture-handler` y `react-native-reanimated`, y al publicar su posición se guarda como **porcentaje x/y**. El texto se escribe en un `TextInput` transparente sobre el propio preview ("Escribe tu estado..."). La **barra de herramientas** (`StatusEditorToolbar`) trae: botón de foto (mock, con `X` para quitarla), botón "Vincular producto" que abre `ProductLinkSelector`, control de **tamaño** (A− / A+ de 16 a 40 px con barra de progreso), toggle de **negrita** y filas de círculos de **color de texto** (9 opciones) y **color de fondo** (6 opciones, solo cuando no hay foto). Todo se refleja en el preview al instante y "Publicar" agrega el estado al mock en memoria.

**Perfil del chat (`chat/chat-profile`):** se abre tocando **el avatar o el nombre** en la cabecera de la conversación (en el chat del asistente ese toque no navega: ahí la cabecera lleva a `ai-settings`). Es un `ScrollView` de filas planas que se adapta al tipo de chat:
- **Arriba:** avatar circular grande (100 px) con las iniciales, el nombre debajo —**editable en línea** con un `TextInput` en los grupos, de solo lectura en los chats individuales— y una línea secundaria: cargo y empresa del contacto (individuales, tomados de `MY_CONTACTS`) o el conteo de miembros (grupos). Los grupos llevan además un **botón de cámara** sobre el avatar para cambiar la foto (mock).
- **Privacidad:** fila "Mensajes temporales" con ícono `Timer` e interruptor. Apagado muestra "Desactivado"; encendido muestra el intervalo elegido ("Cada 1 hora") y abre `DisappearingMessagesModal` (30 minutos / 1 hora / 6 horas / 24 horas / 7 días, con checkmark morado y botón "Guardar"). Arranca desactivado y no borra nada realmente.
- **Miembros (solo grupos):** cabecera "Miembros (N)" con botón "Agregar" (`UserPlus`) y la lista en filas planas — avatar de iniciales, nombre y rol (Admin / Miembro) debajo. El usuario actual va primero, etiquetado "Tú", y es el admin del grupo mock. Si el usuario es admin, cada miembro normal muestra una `X` para quitarlo. "Agregar" abre `AddMemberModal`: buscador, contactos de `MY_CONTACTS` que aún no están en el grupo, selección múltiple con checkmark y botón "Agregar" (estado en memoria, no persiste).
- **Acciones:** "Buscar en la conversación" (`Search`, mock), "Silenciar notificaciones" (`BellOff`, con interruptor), "Archivos multimedia compartidos" (`ImageIcon`, mock) y, tras un separador, la fila roja **"Salir del grupo"** / **"Eliminar chat"** (`LogOut`), que solo muestra un diálogo de confirmación.

**Respuesta automática de la IA en chats de vendedor:** cuando un cliente escribe al usuario **por un producto o servicio publicado en BeeServices**, ese chat queda marcado como *chat de vendedor* (`isSellerChat`, con `linkedProduct`: nombre del producto y del negocio). En esos chats —y **solo** en esos, nunca en los personales, grupos, comunidades ni el chat del asistente— la conversación muestra `AiAutoReplyBanner`, una **barra fija de 44 px justo debajo de la cabecera** (no se desplaza con los mensajes; la lista empieza debajo). Tiene dos estados:
- **Desactivado:** fondo gris suave, ícono `Bot` y el texto "Asistente IA desactivado" en gris, con el interruptor apagado.
- **Activado:** fondo morado de marca al 15 %, ícono `Bot` y el texto "Asistente IA respondiendo" en morado, un **punto pulsante** que late suavemente junto al ícono, y el interruptor encendido.

Cuando está activado, la idea es que la IA conteste al cliente en nombre del vendedor. Los mensajes que envía el asistente por él llevan `sentByAi` y se pintan en la **misma burbuja morada del usuario**, con un pequeño **badge "IA"** (ícono `Bot` + texto) en la esquina superior de la burbuja como única diferencia, para que el vendedor sepa qué contestó la IA. **Todo esto es visual/mock**: el interruptor solo cambia la apariencia de la barra y los mensajes con badge vienen del mock `SELLER_CONVERSATION_MESSAGES`; la respuesta automática real se conectará con el backend.

**Chat con el asistente de IA:** el módulo de Chat abre con un **chat fijado con el asistente** (`AI_CHAT_ID`), siempre primero y fuera de la lista deslizable — **no se puede eliminar, silenciar ni desfijar**. Su avatar es el logo de BeeApp (ícono `Bot` sobre círculo morado) en vez de iniciales, y junto al nombre lleva un badge **IA**. Al abrirlo se usa la **misma pantalla de conversación** que el resto de chats, con burbujas (`MessageBubble`) y barra de escritura: las respuestas del asistente van en burbuja morada suave y el usuario puede escribir, pero **el asistente no responde solo** (todo es mock). La **configuración del asistente** (`ai-settings`) —nombre, tono (Profesional / Amigable / Directo / Creativo) e idioma, con "Guardar cambios" simulado— tiene **dos accesos**: la cabecera de ese chat (y solo de ese) y la fila **"Configuración del Asistente"** del menú lateral, en la sección *Mi cuenta*. Ambos abren la misma pantalla; no hay una copia en Perfil.

**Asistente por voz flotante y notificaciones por módulo:** La barra flotante inferior previa fue reemplazada por un **botón flotante circular de asistente por voz de IA** (`VoiceAssistantFab`) de **64px ubicado en el CENTRO inferior** de la pantalla (`bottom: 24px`, `alignSelf: 'center'` en mobile; `left-1/2 -translate-x-1/2` en web) con fondo `brand-primary`, ícono `Mic` de 28px en blanco y brillo/glow pulsante animado. No posee ningún contenedor ni franja por detrás y flota directamente sobre el contenido. Al tocarlo abre la experiencia por voz (`VoiceAssistantScreen` en mobile, `VoiceAssistantModal` en web). Las notificaciones viven **dentro de cada módulo individual**: en mobile se integran mediante un ícono `Bell` con contador badge en la cabecera del módulo; en web se ubican al final del sidebar izquierdo de cada módulo (`Chat`, `Correo`, `Notas`, `Almacenamiento`, `Agenda`).

**BeeServices:** el **único** lugar donde vive la información de negocio del usuario (ni el onboarding ni el perfil la piden). Sección accesible desde el **menú lateral** (entrada "BeeServices", sin subtítulo) donde el usuario gestiona sus **negocios** y, dentro de cada uno, su catálogo de productos y servicios (`my-services/`). En la versión web (`mobile-web`), al tocar "BeeServices" en el menú lateral, la sección se abre dentro de un panel lateral dedicado de 540px dentro del mismo overlay del menú (`BeeServicesPanel`), con navegación jerárquica por estados internos (lista de negocios -> detalle del negocio -> detalle de producto/servicio) y botón de cierre `X` o flechas de retorno `ChevronLeft`, en lugar de navegar a una ruta separada. El flujo es jerárquico: el usuario primero **crea un negocio** (nombre, logo, categoría, descripción, dirección), define si ofrece **productos** y/o **servicios**, y configura los **métodos de entrega** (Domicilio/`Truck`, Recoger en establecimiento/`Store`, Consumir en establecimiento/`UtensilsCrossed` — solo si ofrece productos) y las **modalidades de servicio** (Virtual/`Monitor`, Presencial/`MapPin` — solo si ofrece servicios). Un usuario puede tener varios negocios. La pantalla principal tiene cabecera "BeeServices" y muestra la **lista de negocios** como filas planas estilo Correos: avatar circular con iniciales, nombre, categoría en gris, conteo de productos/servicios en caption y `ChevronRight`. Cuando no hay negocios se muestra un estado vacío centrado con ícono `Store` grande en gris y botón "Crear negocio". Los modales de creación (`CreateBusinessModal`, `CreateProductModal`, `CreateServiceModal`) se despliegan por encima del panel.

**Detalle del Negocio y Catálogo (`business-detail`):** Esta pantalla presenta la información detallada del negocio en la parte superior (`BusinessHeader.tsx`): avatar con iniciales, nombre, categoría, dirección con MapPin, descripción, chips de métodos de entrega y modalidades, y opciones para **Editar** (abre el modal prellenado) y **Eliminar** (alert de confirmación). Debajo del header se ubica una fila de **chips de filtro** ("Todos", "Productos" —solo si el negocio los ofrece—, "Servicios" —solo si el negocio los ofrece—). La sección inferior renderiza el catálogo en una lista de filas planas con `CatalogItem.tsx`: ícono redondo (`Package` para productos, `Wrench` para servicios), nombre, subtítulo con precio y entrega/modalidad, y hasta 2 pequeños chips de características. El **FAB circular +** de esta pantalla permite agregar ofertas: si el negocio ofrece ambos tipos, abre un menú inferior interactivo para seleccionar entre "Nuevo producto" o "Nuevo servicio"; en caso contrario, abre directamente el modal correspondiente. Si el catálogo está vacío, se dibuja un estado vacío con ícono `Package`, texto "Tu catálogo está vacío" y un botón para crear el primer artículo.

**Detalle de Artículo y Modales de Creación (`product-detail`, `service-detail`):**
Tocar un elemento del catálogo navega a su ficha de detalle (`ProductDetailScreen.tsx` o `ServiceDetailScreen.tsx`), la cual despliega una galería/placeholder de imágenes, nombre (`fontWeight: '600'`), descripción (`fontWeight: '400'`), precio ("Cotización" si es un servicio con precio nulo), método de entrega o modalidad en chips, y la lista completa de características clave-valor. Cuenta con botones para **Editar** (abre el modal prellenado correspondiente) y **Eliminar** (alert de confirmación que elimina el item y regresa a la pantalla anterior).
La creación/edición de ofertas se gestiona con `CreateProductModal.tsx` y `CreateServiceModal.tsx`. Son modales fullscreen con campos para nombre, descripción, precio y la carga mock de hasta 5 imágenes. La sección de **características** es dinámica, permitiendo añadir hasta 10 pares de inputs (Propiedad y Valor) y eliminarlos con un botón `X`. Los chips de entrega o modalidad vienen filtrados y preseleccionados según la configuración general del negocio, permitiendo al usuario decidir cuáles aplican específicamente a ese artículo.

El descubrimiento de productos y servicios **de otros usuarios** no vive aquí: se hace a través del asistente de IA en el chat, que muestra los resultados en un modal (`AiCatalogModal`) con opción de ver el detalle y contactar al vendedor.

**Safe area (barra de estado y notch):** ninguna pantalla se monta debajo de la barra de estado. `SafeAreaProvider` envuelve toda la app en `app/_layout.tsx` y el componente compartido `layout/ScreenSafeArea` (que sustituye al `SafeAreaView` de React Native, inoperante en Android) aplica como `paddingTop` el valor real de `useSafeAreaInsets().top`. El Home aplica el inset en su contenedor y el drawer lateral en su panel, ambos con el valor dinámico; nunca se usan paddings fijos por plataforma. Las pantallas de módulo **embebidas** en el Home reciben inset 0, porque el Home ya empujó el contenido debajo de la barra de estado.

**Bloqueo de la Aplicación (App Lock):** Sistema obligatorio e independiente de seguridad que protege el acceso a BeeApp **en la app móvil**. El flujo de autenticación inicial es: **Login (teléfono) → OTP → App Lock Setup (configuración) → Onboarding (3 pasos) → Home**. **No aplica en la web**: allí la sesión se autoriza escaneando el código QR desde el móvil y `/app` entra directo al Home.
- **Métodos de bloqueo**: El usuario puede configurar **Huella dactilar** (ícono `Fingerprint`), **Face ID** (ícono `ScanFace`) o **Código de acceso** (PIN de 6 dígitos mediante `AppLockPinPad.tsx`).
- **Overlay global (`AppLockScreen.tsx`)**: Se monta en `app/_layout.tsx`. Escucha el estado de la aplicación (`AppState`). Al regresar de segundo plano (background → active), la app se bloquea de forma inmediata mostrando un overlay blanco con el logotipo de BeeApp y el método configurado. Si se falla la biometría 3 veces, el sistema cae automáticamente al PIN de 6 dígitos como fallback.
| **Personalización** `/app` (overlay) | `CustomizeModal` | Modal de personalización/reordenamiento de chips de módulos. **En la web ya no hay App Lock**: entrar a `/app` no pide PIN ni biometría, porque la sesión queda autorizada al escanear el QR desde la app móvil. El componente `AppLockScreen.tsx` sigue en el repositorio pero **no se renderiza en ninguna parte**. |

**Opciones y Menú de Chat:** En la app móvil y en la web app, las opciones de cada conversación (fijar/desfijar, silenciar/activar, proteger/quitar PIN, asignar a categoría, archivar y eliminar) se acceden **exclusivamente desde el botón de tres puntos (`MoreVertical`) siempre visible a la derecha de cada fila de chat**, eliminando las acciones por deslizamiento (swipe) y pulsación larga (long-press). Al pulsar los tres puntos se abre un menú contextual desplegable anclado a la fila (en el chat de la IA se ocultan las opciones de archivar y eliminar).

La aplicación web `@beeapp/mobile-web` opera con el siguiente modelo de visualización:

1. **Sección de Trabajo (`/app/*`) — Exclusivo Desktop & Tablet (≥ 768px)**:
   - Funciona únicamente en pantallas con ancho igual o superior a 768px (PC de escritorio, laptops y tablets grandes).
   - **Bloqueo Móvil**: Si se accede a `/app/*` desde un dispositivo celular (< 768px), se activa automáticamente la pantalla `MobileBlockScreen` con el logo de BeeApp AI, ícono de Smartphone, título *"BeeApp Web no está disponible en este formato"*, subtítulo explicativo, botón principal *"Descargar la app"* y enlace *"Ir al inicio"*.
   - **Layout Desktop**: Panel amplio full-width con sidebar derecho de módulos (56px) con reordenamiento drag & drop, sidebar izquierdo contextual de Chat (56px + 320px listado) y barra flotante inferior fija con tickers y asistente por voz.

2. **Rutas Públicas 100 % Responsive**:
   - **Landing Page (`/`)**: Completamente adaptada y accesible en celulares, tablets y computadores.
   - **Login QR (`/login`)**: Accesible desde cualquier navegador y resolución para iniciar sesión escaneando el código QR desde la app móvil.

### Editor de estados en web (`components/app/chat/CreateStatusModal.tsx` + `chat/status/`)

Overlay a pantalla completa dividido en **dos paneles**, con fondo blanco en toda la superficie (nunca oscuro):

- **Panel izquierdo (70 %) — preview.** `StatusPreviewStage` dibuja el estado como una **hoja 9:16 flotando** sobre un fondo `neutral-50`: contenedor centrado con esquinas de 24 px y sombra difusa. El color, el degradado o la foto viven **dentro** de la hoja, nunca en toda la pantalla. Encima se apilan todas las capas del estado, cada una **arrastrable con el mouse** (`DraggableLayer` usa captura de puntero, así que el arrastre sigue al cursor aunque se salga de la capa; la posición se guarda en porcentaje x/y acotado al 5-95 %).
- **Panel derecho (30 %, máx. 320 px) — herramientas.** Fondo blanco, borde izquierdo fino y scroll vertical propio. Su cabecera lleva `X` a la izquierda, el título "Crear estado" al centro (peso 600) y **Publicar** en `brand-primary` a la derecha, habilitado en cuanto haya texto, foto, imagen o sticker. Debajo, **secciones colapsables** (`StatusToolSection`) separadas por líneas finas, cada una con su título en gris, minúsculas versalitas y peso 400, en este orden: **Texto, Tipografía, Color de texto, Fondo, Imagen, Stickers, Música y Producto**.
  1. **Texto** — `textarea` sin marco que edita **la capa seleccionada**, más el botón "Agregar texto N/5".
  2. **Tipografía** — slider de tamaño de **16 a 40 px** con el valor a la derecha, toggle de negrita y tres botones de alineación (`AlignLeft`, `AlignCenter`, `AlignRight`); los activos van en `brand-primary` sobre su fondo al 10 %.
  3. **Color de texto** — nueve círculos de 28 px con separación de 8 px (`StatusSwatchRow`), sombra interior sutil y anillo `brand-primary` separado en el seleccionado, para que el color propio se siga viendo entero.
  4. **Fondo** — los mismos círculos sobre `STATUS_BACKGROUNDS`: tres **degradados** (morado, azul y verde oscuro) más negro, gris oscuro y blanco; debajo, el botón "Foto de fondo" (`Camera`).
  5. **Producto** — "Vincular producto de BeeServices" (`ShoppingBag`) abre `ProductLinkSelector`; una vez vinculado muestra el nombre y el precio con una `X` para quitarlo.

  Tipografía y Color de texto se atenúan y quedan inertes mientras no haya una capa de texto seleccionada.

### Capas del editor de estados (móvil y web)

El editor trabaja por **capas**, con el mismo modelo en las dos plataformas — en móvil desde la barra de herramientas inferior, en web desde el panel derecho:

- **Varios textos.** Hasta **5** capas de texto; la primera se crea al abrir el editor. Cada una se arrastra por separado y guarda su propio tamaño, peso y color, así que los controles de tipografía aplican **solo a la capa seleccionada**. La activa se marca con un borde punteado en `brand-primary` y una `X` para eliminarla. En móvil la capa seleccionada se escribe directamente sobre el lienzo (`TextInput`); en web se escribe en el `textarea` del panel.
- **Varias imágenes.** Hasta **3** capas, cada una un placeholder de color distinto (`STATUS_IMAGE_COLORS`) con el ícono `Image` al centro. Se arrastran y se redimensionan con los botones `−`/`+` entre **80 y 220 px** en pasos de 20. No abre galería real.
- **Stickers.** Hasta **3**, elegidos de una cuadrícula de **12 íconos de Lucide** sobre círculos de color suave (`stickerCatalog.ts`: Heart, ThumbsUp, Star, Zap, Coffee, Rocket, PartyPopper, Flame, Trophy, Check, Crown, Sparkles). Tamaño fijo de 80 px sobre el lienzo. En móvil se eligen en una hoja inferior (`StickerPicker`); en web, en la sección "Stickers".
- **Música de fondo.** Cinco canciones mock (`STATUS_SONGS`, con título, artista y duración) presentadas con `Play` a la izquierda y `Check` morado en la elegida. La seleccionada aparece como **chip flotante** arriba del lienzo con ícono `Music`, el título y una `X` para quitarla. No se reproduce nada.
- **Menciones con `@`.** Al escribir `@` en la capa de texto activa se abre la lista de `MY_CONTACTS` (avatar de iniciales y nombre); al elegir un contacto se inserta `@Nombre`. Las menciones se dibujan en `brand-primary` sobre el lienzo (`MentionText` parte el contenido comparándolo con los nombres conocidos). Es solo color: no hay enlace ni notificación.

El estado del editor vive en el hook `useStatusLayers`, y al publicar el `StatusItem` viaja con `textLayers`, `imageLayers`, `stickerLayers` y `music`. Los campos sueltos de siempre (`text`, `textPosition`, `textSize`, `textWeight`, `textColor`) siguen reflejando la **primera** capa de texto, así que los estados mock antiguos y el visor no se rompen. Los fondos se guardan como valor CSS de `background`, de modo que el mismo dato sirve para el lienzo, el visor (`StatusViewer`) y los círculos del panel. Todo es mock: publicar solo agrega el estado a `MOCK_STATUSES` en memoria. Por debajo de 768 px los dos paneles de la web se apilan, aunque `/app/*` ya está bloqueado en esa franja.

> **Pendiente:** `StatusViewer` (móvil y web) sigue dibujando solo la primera capa de texto. Un estado publicado con varias capas, imágenes, stickers o música guarda esos datos, pero el visor todavía no los pinta.

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
| `security/AppLockPinPad.tsx` | Teclado numérico especializado de 6 dígitos para el desbloqueo de la app, con botón de alternancia biométrica |
| `security/BiometricButton.tsx` | Botón interactivo para simular escaneo biométrico (huella o rostro) con animaciones de carga y éxito |
| `security/AppLockScreen.tsx` | Pantalla de overlay de bloqueo global, activada en transiciones desde background. Soporta biometría y PIN fallback |
| `security/AppLockSettingsSection.tsx` | Sección de Perfil -> Seguridad que expone la configuración del método de bloqueo y el sub-flujo de cambio de PIN de 6 dígitos |
| `security/AppLockSetupScreen.tsx` | Asistente de configuración de bloqueo inicial (3 opciones de tarjeta) que se ejecuta antes del onboarding |
| `chat/AiCatalogModal.tsx` | Modal bottom sheet que muestra los resultados de productos/servicios encontrados por la IA |
| `chat/AiCatalogItem.tsx` | Tarjeta de resultado del catálogo de IA con opciones para expandir detalles inline y contactar al proveedor |
| `chat/ChatMessageMenuModal.tsx` | Menú contextual con 7 opciones completas para mensajes de chat (Responder, Editar, Reenviar, Fijar, Copiar, Eliminar, Destruir) |
| `chat/ForwardMessageModal.tsx` | Modal de búsqueda y selección de chat para reenviar mensajes con confirmación |
| `chat/PinnedMessageBanner.tsx` | Barra de mensaje fijado en la parte superior del chat con opción de desfijar |
| `assistant/voiceAssistantStyles.ts` | Estilos de la pantalla de voz (separados para mantener archivos <300 líneas) |
| `embedded/EmbeddedNavContext.tsx` | Shim de navegación: `useModuleNav` (con `embedded` y `canGoBack`) / `useScreenParams` para que las pantallas funcionen embebidas o como rutas reales |
| `embedded/embeddedRegistry.ts` | Registro ruta→componente de las 21 pantallas embebibles (incluida la vista "Todas" en `OVERVIEW_PATH`) + raíz de cada módulo (BeeServices no está: va a pantalla completa) |
| `layout/ScreenSafeArea.tsx` | Contenedor de pantalla que aplica el inset superior del dispositivo (`useSafeAreaInsets`); devuelve 0 cuando la pantalla corre embebida en el Home |
| `my-services/MyServicesHeader.tsx` | Cabecera de BeeServices con botón de volver y opcionalmente acción derecha |
| `my-services/BusinessListItem.tsx` | Fila plana de negocio estilo Correos: avatar con iniciales, nombre, categoría, conteo de productos/servicios y ChevronRight |
| `my-services/CreateBusinessModal.tsx` | Modal fullscreen para crear/editar un negocio: logo, nombre, categoría (9 opciones), descripción, dirección, tipo de oferta, métodos de entrega (condicional) y modalidad de servicio (condicional). Soporta modo edición vía `initialData` |
| `my-services/BusinessHeader.tsx` | Cabecera del detalle de negocio que muestra el logo/iniciales, nombre, categoría, dirección, descripción, chips de entrega/modalidad y botones de editar/eliminar |
| `my-services/CatalogItem.tsx` | Fila plana por producto/servicio en el catálogo: ícono redondo (`Package`/`Wrench`), nombre, precio, entrega/modalidad y chips pequeños de características |
| `my-services/CreateProductModal.tsx` | Modal fullscreen para crear/editar productos: nombre, descripción, precio, carga mock de imágenes, características dinámicas y chips de entrega heredados del negocio |
| `my-services/CreateServiceModal.tsx` | Modal fullscreen para crear/editar servicios: nombre, descripción, precio opcional (Cotización), imágenes, características dinámicas y modalidad heredada |
| `my-services/ProductDetailScreen.tsx` | Vista detallada del producto: galería, info básica, características clave-valor, chips de entrega y botones para editar/eliminar |
| `my-services/ServiceDetailScreen.tsx` | Vista detallada del servicio: galería, info básica (soporta Cotización), características, modalidad y botones de editar/eliminar |
| `my-services/MyServicesFilterChips.tsx` | Chips de filtro de BeeServices (Todos / Productos / Servicios) con la anatomía de los chips de carpeta de Correos |
| `my-services/MyServiceItem.tsx` | Fila plana de producto/servicio al estilo de Correos: círculo con `Package`/`Wrench`, nombre, subtítulo "categoría · precio" y badge de estado (Activo/Inactivo) |

| `embedded/EmbeddedModuleHost.tsx` | Contenedor que renderiza un módulo dentro del Home con stack interno, **sin estilo visual propio** (sin tarjeta, borde, sombra ni margen) y sin cabecera propia (la del módulo es la única) |
| `calendar/CalendarHeader.tsx` | Cabecera de Agenda (título, Hoy, selector Día/Sem/Mes) + chips de filtro (exporta `ViewMode`/`FilterChip`) |
| `calendar/CalendarWeekStrip.tsx` | Tira horizontal compacta de la semana con flechas de navegación (vista por defecto de Agenda) |
| `calendar/CalendarMonthGrid.tsx` | Cuadrícula mensual del mes de la fecha seleccionada (columnas responsive, semanas de lunes a domingo) |
| `calendar/CalendarHourlyAgenda.tsx` | Agenda del día por horas |
| `calendar/CalendarEventsList.tsx` | Lista de eventos en filas planas (hora y duración, título, modalidad e invitados) |
| `calendar/CalendarMenus.tsx` | Menú contextual de evento + menú FAB de creación |
| `chat/ChatTabs.tsx` | Pestañas subrayadas del módulo de Chat: Chats, Comunidades y Contactos |
| `chat/ChatCategoryModals.tsx` | Agrupa los modales de crear y de asignar categoría del módulo de Chat |
| `chat/ChatCategoryChips.tsx` | Chips de filtro por categoría ("Todos" + las del usuario) y chip `Plus` para crear una nueva |
| `chat/CreateCategoryModal.tsx` | Bottom sheet para crear una categoría: nombre, ícono de Lucide y color del chip |
| `chat/AssignCategoryModal.tsx` | Bottom sheet para archivar un chat en una o varias categorías |
| `chat/categoryIcons.ts` | Catálogo de íconos y colores que puede llevar una categoría |
| `chat/ChatOptionsSheet.tsx` | Menú de un chat al mantenerlo pulsado: PIN, asignar a categoría, fijar, silenciar y eliminar |
| `chat/CommunitiesTabView.tsx` | Pestaña de Comunidades: lista plana de las comunidades a las que pertenece el usuario |
| `chat/CommunityListItem.tsx` | Fila de comunidad: avatar, nombre, número de miembros, insignia Admin y badge de no leídos |
| `chat/ChatCreateMenu.tsx` | Menú del botón de crear de la cabecera: Nuevo chat, Nuevo grupo y Nueva comunidad |
| `chat/ChatListView.tsx` | Lista desplazable de conversaciones de la pestaña Chats (asistente fijado arriba) |
| `chat/CommunityScreen.tsx` | Feed de una comunidad: publicaciones con reacciones; barra de escritura solo para el administrador |
| `chat/CommunityPostCard.tsx` | Publicación de la comunidad: autor, texto y reacciones `ThumbsUp`/`Heart`/`Laugh` con su conteo |
| `chat/CommunityProfileScreen.tsx` | Perfil de la comunidad: info editable por el admin, privacidad, miembros y acciones |
| `chat/CreateCommunityModal.tsx` | Bottom sheet para crear una comunidad: foto (mock), nombre, descripción y categoría |
| `chat/ChatListItem.tsx` | Fila de chat en la lista de conversaciones (con acciones swipe) |
| `chat/AiChatListItem.tsx` | Fila fijada del asistente: avatar con el logo (`Bot`), badge **IA**, ícono de fijado y sin acciones swipe |
| `chat/AiSettingsScreen.tsx` | Configuración del asistente: avatar, nombre editable, tono (Profesional / Amigable / Directo / Creativo), idioma y "Guardar cambios" (mock) |
| `chat/StatusCirclesRow.tsx` | Fila horizontal de estados en círculos sobre la lista de chats; el primero es el del usuario con la insignia `Plus` |
| `chat/StatusViewer.tsx` | Visor a pantalla completa: fondo desenfocado, foto flotante, texto en la posición del autor, píldoras de progreso, gestos y tarjeta de producto |
| `chat/StatusProgressPills.tsx` | Barras de progreso en forma de píldora del visor de estados |
| `chat/CreateStatusModal.tsx` | Editor de estado a pantalla completa: preview en vivo, texto arrastrable y publicación |
| `chat/StatusEditorToolbar.tsx` | Herramientas del editor: foto, producto, tamaño, negrita y colores de texto y de fondo |
| `chat/ProductLinkSelector.tsx` | Lista de productos y servicios propios para vincular uno al estado |
| `chat/ChatProfileScreen.tsx` | Perfil del chat: cabecera, mensajes temporales, miembros (grupos) y acciones; orquesta los modales |
| `chat/ChatProfileHeader.tsx` | Avatar grande, nombre (editable en grupos, solo lectura en individuales), info secundaria y botón de cámara del grupo |
| `chat/ChatProfileRow.tsx` | Fila plana reutilizable del perfil: ícono, texto, subtítulo opcional y ranura derecha (interruptor o nada); variante roja para la acción destructiva |
| `chat/MemberListSection.tsx` | Miembros del grupo en filas planas (avatar de iniciales, nombre con "Tú", rol) + botón "Agregar" y quitar miembro si eres admin |
| `chat/AddMemberModal.tsx` | Bottom sheet para agregar miembros: buscador, contactos disponibles y selección múltiple con checkmark |
| `chat/DisappearingMessagesModal.tsx` | Bottom sheet para elegir cada cuánto desaparecen los mensajes (30 min a 7 días) |
| `chat/AiAutoReplyBanner.tsx` | Barra fija de los chats de vendedor: interruptor de respuesta automática de la IA, con punto pulsante cuando está activa |
| `chat/MessageBubble.tsx` | Burbuja de mensaje (texto, adjuntos, estados) y badge **IA** cuando el mensaje lo envió el asistente por el vendedor |
| `chat/WriteBar.tsx` | Barra de escritura de mensajes |
| `home/HomeHeader.tsx` | Buscador con filtro por tipo de contenido (correo/chat/nota/contacto/archivo/evento) + botón de menú lateral; el disparador del filtro es **solo ícono** y mide su posición para anclar el desplegable |
| `home/SearchFilterMenu.tsx` | Desplegable del filtro en **overlay** (Modal transparente): siempre por encima de los chips y del módulo embebido, anclado bajo el botón, se cierra al tocar fuera o al elegir |
| `home/searchFilters.ts` | Tipos y catálogo de filtros de contenido del buscador del Home |
| `home/HomeSideMenu.tsx` | Drawer lateral que reemplaza la pestaña Perfil: tarjeta de perfil (solo nombre y correo, sin cargo ni empresa), **BeeServices** (destacado), suscripción y verificación, **configuración del asistente de IA**, integraciones, **Dispositivos** (ícono `Monitor`, entre Integraciones Externas y Seguridad y PIN), seguridad, visibilidad, compartir, soporte, legal y cerrar sesión |
| `profile/DevicesScreen.tsx` | Pantalla de Dispositivos: escaneo simulado del QR de BeeApp Web y gestión de las sesiones vinculadas |
| `profile/devicesStyles.ts` | Estilos de la pantalla de Dispositivos (separados para mantener archivos <300 líneas) |
| `home/homeSideMenuStyles.ts` | Estilos del drawer (separados para mantener archivos <300 líneas) |
| `home/ModuleSwitcherRow.tsx` | Chips horizontales de **todos** los módulos con **"Todas"** siempre primero (elige qué se muestra embebido) + botón de personalización; chips de 46 px con ícono de 28 px, solo ícono salvo el seleccionado, y reparto `space-evenly` o scroll horizontal según quepan |
| `home/AllModulesOverview.tsx` | Pantalla raíz del chip "Todas": Dashboard interactivo con tarjeta de bienvenida IA (sugerencias rápidas), grid de tarjetas de resumen por módulo con métricas/badges (Chat, Correos, Agenda, Notas, Archivos), tarjeta de Actividad reciente (timeline en Web) y tarjeta de BeeServices |
| `home/OverviewSection.tsx` | Sección reutilizable del resumen, sin contenedor: cabecera plana con ícono/nombre del módulo y "Ver más", y hasta 5 `OverviewItem` debajo |
| `home/OverviewItem.tsx` | Fila plana y uniforme del resumen al estilo de Correos (avatar circular de iniciales o ícono, título en negrita con insignias, subtítulo gris, hora/fecha arriba a la derecha, punto de no leído y línea separadora de 1 px salvo en la última) |
| `home/overviewDataMappers.ts` | Mapeo de los mocks de cada módulo a las filas del resumen y a la ruta de detalle que abre cada ítem |
| `home/HomeCustomizeModal.tsx` | Modal de personalización: **solo reordena** los chips arrastrándolos (`react-native-draggable-flatlist` con `ScaleDecorator`), sin activar ni desactivar nada; su contenido va dentro de un `GestureHandlerRootView` propio para que el arrastre funcione dentro del `Modal`; "Todas" no aparece: es fijo |
| `home/CustomizeModuleRow.tsx` | Fila del personalizador: **asa de arrastre `GripVertical`** a la izquierda, ícono y color del módulo, nombre y descripción; se eleva con sombra mientras se arrastra |
| `home/homeModules.ts` | Configuración del pool de módulos (iconos, colores, descripciones) incluido el especial `todas` (`isOverview`) y la lista `CUSTOMIZABLE_MODULES` |
| `mail/MailHeader.tsx` | Cabecera con selector de cuenta y botón de redactar |
| `mail/MailFolderChips.tsx` | Chips de carpetas con contadores de no leídos |
| `mail/MailListItem.tsx` | Fila de correo con avatar, badges y acciones swipe (**referencia visual** del resto de listas) |
| `layout/ViewModeToggle.tsx` | Conmutador lista/cuadrícula de Notas y Almacenamiento; exporta `useGridColumns()`, que devuelve 2 o 3 columnas según el ancho de pantalla |
| `contacts/CreateContactModal.tsx` | Formulario de contacto nuevo: nombre, apellido, teléfono con indicativo, correo, empresa y cargo |
| `contacts/CountryCodeModal.tsx` | Selector con buscador del indicativo telefónico del país |
| `contacts/ContactsListView.tsx` | Lista de contactos con sus tres pestañas; la comparten la ruta `(main)/contacts` y la pestaña Contactos del módulo de Chat |
| `contacts/ContactsTabs.tsx` | Selector de las tres pestañas de Contactos (Mis contactos, Descubrir red, Llamadas) |
| `contacts/contactsStyles.ts` | Estilos de la pantalla de Contactos (separados para mantener archivos <300 líneas) |
| `notes/NotesGridView.tsx` | Cuadrícula adaptativa de notas: tarjeta con título, vista previa y fecha; las protegidas ocultan su contenido |
| `notes/notesListStyles.ts` | Estilos de la lista de notas (separados para mantener archivos <300 líneas) |
| `notes/NoteListRow.tsx` | Fila plana de nota: ícono redondo con el color de la nota, título con candado, vista previa de una línea, recordatorio, fecha, favorito y acciones de editar/borrar al mantener pulsado |
| `onboarding/AboutYouSection.tsx` | Paso 1: datos personales (foto, nombre, correo, a qué se dedica y ciudad) |
| `onboarding/AssistantSection.tsx` | Paso 2: nombre y tono del asistente con vista previa |
| `onboarding/FeaturesSection.tsx` | Paso 3: beneficios y permisos |
| `onboarding/onboardingShared.ts` | Estilos compartidos y helper `getInitials` de los pasos |
| `storage/StorageHeader.tsx` | Cabecera con ordenación y botón de crear/subir |
| `storage/StorageSummaryFilters.tsx` | Tarjeta resumen, chips de filtro y breadcrumbs |
| `storage/StorageItemsView.tsx` | Archivos y carpetas en filas planas (ícono redondo, nombre, tamaño o nº de elementos, fecha, sello de firmado y menú), candado en los protegidos y estado vacío; delega en la cuadrícula cuando la vista es `grid` |
| `storage/StorageItemsGrid.tsx` | Cuadrícula adaptativa de archivos y carpetas: ícono grande, nombre, tamaño o nº de elementos e indicadores de firmado y protegido |
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
| `mocks/chats.ts` | Chats y mensajes de conversación (`ChatItem`, `MOCK_CHATS`, `MOCK_CONVERSATION_MESSAGES`), los chats de vendedor (`isSellerChat`, `SellerChatProduct`, `SELLER_CONVERSATION_MESSAGES` y el campo `sentByAi` de los mensajes), las categorías (`ChatCategory`, `MOCK_CATEGORIES`, `addCategory`, `setChatCategories` y el campo `categoryIds` de cada chat), los miembros del grupo (`GroupMember`, `MOCK_GROUP_MEMBERS`, campo `members` de los chats grupales) y el chat del asistente (`AI_CHAT_ID`, `AI_ASSISTANT_NAME`, `AI_CONVERSATION_MESSAGES`) |
| `mocks/notesModule.ts` | Notas del módulo de Notas (`NoteItem`, `MOCK_MODULE_NOTES`) con contenido, favoritos, recordatorios y papelera |
| `mocks/notes.ts` | Resumen de notas para vistas externas al módulo (`NoteSummary`, `MOCK_NOTES`): ids alineados con las notas del módulo |
| `mocks/subscription.ts` | Beneficios del plan Plus (`BENEFICIOS_PLUS`) |
| `mocks/countries.ts` | Lista mundial completa de indicativos telefónicos y banderas de países (`COUNTRIES`) |
| `mocks/myServices.ts` | Negocios del usuario para BeeServices (`Business`, `BusinessProduct`, `BusinessService`, `BUSINESS_CATEGORIES`, `formatPrice`). Cada negocio tiene nombre, logo, categoría, descripción, dirección, tipo de oferta, métodos de entrega, modalidades de servicio y un catálogo de productos/servicios. CRUD: `getBusinesses`, `addBusiness`, `updateBusiness`, `removeBusiness`, `addProduct`, `removeProduct`, `addService`, `removeService`. Mantiene `getMyItems()` y `formatPrice()` como exports retrocompatibles |
| `mocks/communities.ts` | Comunidades privadas (`Community`, `CommunityMember`, `CommunityPost`, `ReactionType`, `COMMUNITY_CATEGORIES`, `MOCK_COMMUNITIES`) con `getCommunity`, `isCommunityAdmin` y `addCommunity` en memoria |
| `mocks/statuses.ts` | Estados (`StatusItem` con `textPosition`, `textSize`, `textWeight` y `textColor`, `StatusProductLink`, `MOCK_STATUSES`, `STATUS_TEXT_COLORS`, `STATUS_BG_COLORS`) con `addStatus` y `markStatusViewed` en memoria |
| `mocks/aiSearchResults.ts` | Resultados de búsqueda de ofertas de otros usuarios (`AiSearchResult`, `AI_SEARCH_RESULTS`) mostrados por el asistente de IA |
| `mocks/voiceAssistant.ts` | Diálogo simulado del asistente por voz: turnos usuario/asistente que se transcriben en pantalla (`VOICE_CONVERSATION`) |
| `mocks/tabNotifications.ts` | Notificaciones del menú flotante: generales y de chat/llamadas (`GENERAL_NOTIFICATIONS`, `CHAT_NOTIFICATIONS`), cada una con id, hora y `target` (módulo + pantalla + params, con ids reales de los mocks) |
| `mocks/currentUser.ts` | Datos **personales** del usuario logueado (`CURRENT_USER`: nombre, iniciales, teléfono, correo, ciudad); sin datos de empresa, que viven en BeeServices |

| `stores/calendarStore.ts` | Eventos de calendario con invitados (`CalendarEvent`, `getEvents`/`setEvents`) — estado mutable compartido entre pantallas |
| `stores/pinStore.ts` | PIN global de protección e ids de elementos protegidos (`hasPin`, `isPinCorrect`, `setPin`, `isProtected`, `setProtected`) — estado mock en memoria |
| `stores/appLockStore.ts` | Configuración y estado del bloqueo global de la app (`appLockEnabled`, `appLockMethod`, `appLockPin`, `isLocked`, `lastBackgroundTime`) |
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

- **Backend: NO conectado.** Toda la aplicación (mobile y mobile-web) funciona exclusivamente con datos mock; no hay llamadas de red ni persistencia real.
- **Módulos web completados en FASE 2:** Chat, Notas, Almacenamiento y Agenda/Calendario con sidebars contextuales de 56px, listas de 40% de ancho, menús contextuales desplegables de tres puntos y modales dedicados.
- **Barra flotante inferior web:** Integración de popovers deslizantes superiores para Notificaciones generales (izq) y Chats/Llamadas (der) sin cambiar de página.

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

**Build APK standalone (mobile):**

```bash
# 1. Instalar EAS CLI (una sola vez) y autenticarse en Expo
npm install -g eas-cli
eas login

# 2. Generar el APK standalone compilando en la máquina local
cd apps/mobile
eas build -p android --profile preview --local
```
# 3. Generar el APK standalone compilando en la máquina local
cd android
./gradlew assembleRelease

El perfil `preview` de `apps/mobile/eas.json` genera un **APK sin dev-client** (`developmentClient: false`, `android.buildType: "apk"`, `distribution: "internal"`): el bundle de JavaScript queda embebido en el instalador, así que la app corre en cualquier teléfono Android **sin Metro y sin computadora conectada**.

El flag `--local` compila en la máquina local y **no sube nada a la nube de Expo** (requiere el entorno Android de la tabla anterior: JDK 17, `ANDROID_HOME` y el NDK). El APK resultante se puede compartir por cualquier medio e instalar directamente en el teléfono habilitando **"Instalar desde fuentes desconocidas"**. Sin `--local`, el mismo comando compila en los servidores de Expo y devuelve un enlace de descarga.

El perfil `production` genera un **AAB** (Android App Bundle, `android.buildType: "app-bundle"`), que es el formato requerido para publicar en **Google Play Store**:

```bash
cd apps/mobile && eas build -p android --profile production
```

La primera ejecución de `eas build` pide vincular el proyecto a una cuenta de Expo y escribe el campo `extra.eas.projectId` en `app.json` automáticamente; no hay que agregarlo a mano.

**Build mobile:** el proceso completo de development builds (local con Android Studio/Xcode, EAS cloud o EAS local) está detallado en `apps/mobile/Build.MD`. La app usa `expo-dev-client`, por lo que no funciona con Expo Go. Existe además `apps/mobile/scripts/patch-expo-router.js` como parche post-install de expo-router.

---

## 10. Convenciones

- **Brand & Iconos:** Púrpura (`colors.brand.primary` y con opacidad para fondos como `colors.brand.primary + '15'`). Los iconos son monocromáticos y sobrios: gris neutro (`colors.neutral.gray600` o `gray700`) cuando están inactivos, y color de marca (`colors.brand.primary`) cuando están activos o seleccionados. Los fondos circulares de los iconos son gris muy suave (`colors.neutral.gray100`) para inactivos y morado marca con baja opacidad para activos. No se usan colores específicos por módulo (como verde para almacenamiento o amarillo para notas) en iconos ni avatares del sistema.
- **Tipografía:** Se reduce el uso de negrilla (bold) al mínimo (máximo 10% del contenido). Se usa peso `600`/`700` (bold/semibold) únicamente en títulos principales de pantallas, nombres de usuario en perfiles, KPIs grandes y en la primera línea de ítems de listas (nombres de contactos o remitentes). En el admin, las cabeceras de tablas (`.data-table-th`) se definen con peso `500` (medium). Todo lo demás (subtítulos, descripciones, labels, previews, opciones del menú lateral, celdas de tablas, fechas, etc.) lleva peso normal (`400` / `normal`).
- **Contenedores:** Se minimiza el uso de tarjetas, sombras pesadas y bordes para mantener la interfaz ligera y limpia. En el menú lateral y el grid del Home de mobile, los contenedores individuales de opciones se renderizan sin bordes (borderless) sobre el fondo de la pantalla.
- **Tema:** Solo **light mode** en mobile (y en admin).
- **Idioma de la UI:** español.
- **Iconos:** Lucide React Native en mobile, Lucide React en admin. **No se usan emojis en la UI.**
- **Componentes:** nombres en **PascalCase** (`MailListItem.tsx`); helpers/configs no-componente en camelCase (`storageHelpers.ts`, `homeModules.ts`).
- **Rutas:** convención de Expo Router en mobile (grupos `(auth)`/`(main)`, `modulo/index.tsx` por pantalla principal, kebab-case en archivos multi-palabra como `chat-profile.tsx`); App Router de Next.js en admin (carpetas en minúscula, segmentos dinámicos `[id]`).
- **Tamaño de archivos:** objetivo de mantener pantallas y componentes por debajo de ~300 líneas, extrayendo sub-componentes por módulo en `src/components/<modulo>/`.
- **Imports en mobile:** rutas relativas (`../../src/...`); el alias `@/*` existe en tsconfig pero no se usa en runtime.
- **Datos mock:** siempre centralizados en `src/mocks/` (con tipos exportados) o `src/stores/` cuando varias pantallas comparten estado.
- **Navegación en pantallas de módulo (mobile):** usar `useModuleNav()` y `useScreenParams()` (de `src/components/embedded/EmbeddedNavContext`) en lugar de `useRouter`/`useLocalSearchParams`, para que la pantalla funcione tanto embebida en el Home como en su ruta real.
- **Safe area (mobile):** la raíz de cada pantalla usa `ScreenSafeArea` (`src/components/layout/`), nunca el `SafeAreaView` de React Native (no hace nada en Android) ni un padding superior fijo por plataforma; cuando hace falta el valor a mano se lee con `useSafeAreaInsets()`.

---

## 11. Cambios recientes (Agosto 2026)

### 1. Chats restringidos (PIN) y archivados accesibles
- **Mobile**: `RestrictedAndArchivedRows.tsx` integrado en `ChatListView.tsx` y `app/(main)/chat/index.tsx`. Ofrece dos filas de acceso rápido ("Chats restringidos" solicitando PIN y "Chats archivados") filtrando las conversaciones de la lista.
- **Web**: Secciones `Lock` ("Chats restringidos") y `Archive` ("Chats archivados") agregadas al sidebar izquierdo en `chatSections.ts`, `ChatPanelTabs.tsx` y `ChatModule.tsx`.

### 2. Redes sociales en perfil y detalle de contacto
- Se agregaron campos para **Instagram, Facebook, LinkedIn, TikTok, YouTube y Threads** a los modelos mock de contactos en `src/mocks/contacts.ts`.
- **Mobile**: Componente `SocialNetworksSection.tsx` en `src/components/profile/`, campos editables en `profile/edit.tsx` y renderizado en `contacts/detail.tsx`.
- **Web**: Componente `SocialNetworksSection.tsx` en `src/components/app/`, integrado en `ContactDetail.tsx`.

### 3. Navegación directa a BeeServices desde Dashboard
- **Mobile**: La tarjeta de BeeServices en `AllModulesOverview.tsx` navega directamente a `my-services` (`router.push('/(main)/my-services')`).
- **Web**: La tarjeta de BeeServices en `AllModulesOverview.tsx` abre el menú lateral (`SideMenu`) seleccionando automáticamente la opción `beeservices` (`initialOption="beeservices"`).

### 4. Privacidad y contador de vistas en Estados
- **Creación de estados**: Selector de privacidad `StatusPrivacySelector` (mobile) y `StatusPrivacySection` (web) con 3 chips: "Todos mis contactos", "Seleccionar contactos" (con modal de checkboxes) y "Una categoría" (con desplegable de categorías).
- **Visor de estados propios**: En `StatusViewer.tsx` (mobile y web), los estados propios muestran el botón "Visto por N" con ícono `Eye` que abre un sheet/popover con la lista detallada de personas y la hora de visualización.

