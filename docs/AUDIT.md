# Auditoría comparativa — App Móvil vs Web App

## SECCIÓN 1 — Resumen

- **Calificación general:** 9.5 / 10
- **Justificación:** La aplicación web (`apps/mobile-web`) recrea con fidelidad excepcional el 100% de las pantallas, módulos, flujos de navegación, interacciones y datos mock definidos para la aplicación móvil (`apps/mobile`). Adicionalmente, la versión web enriquece la experiencia al incluir una arquitectura responsive adaptada a 3 breakpoints (móvil, tablet y escritorio), menú lateral permanente en pantallas grandes y un esquema maestro-detalle simultáneo (estilo Gmail / WhatsApp Web). La ligera diferencia de 0.5 puntos corresponde únicamente al comportamiento nativo de gestos táctiles (swipe para archivar en correos y gestos táctiles libres `PanGesture` para mover texto en historias), que en la web se resuelven mediante interacción adaptada a mouse y teclado.

---

## SECCIÓN 2 — Tabla comparativa módulo por módulo

| Módulo | Funcionalidad | Existe en Móvil | Existe en Web | Observaciones |
|---|---|:---:|:---:|---|
| **Auth** | Login con selector de país internacional | Sí | Sí | Idéntico selector con banderas e indicativos telefónicos (+57 por defecto). |
| **Auth** | Verificación OTP 6 dígitos | Sí | Sí | Cuadros independientes con salto automático y temporizador de reenvío de 30s. |
| **Auth** | App Lock Setup (configuración previa) | Sí | Sí | Configuración de PIN 6 dígitos / Huella / Face ID. |
| **Auth** | Términos y Condiciones / Privacidad | Sí | Sí | Enlaces presentes en footer de login y menú lateral. |
| **Onboarding** | Flujo guiado de 3 pasos | Sí | Sí | En móvil como asistente inicial; en web integrado en Configuración del Asistente y Perfil. |
| **Home** | Fila de chips de módulos | Sí | Sí | Scroll horizontal en móvil; distribuido adaptativamente en tablet y desktop. |
| **Home** | Vista "Todas" (Feed unificado 5 ítems) | Sí | Sí | Identica estructura plana de 5 ítems por módulo con botón "Ver más". En web en grid responsive (2-3 cols en tablet/desktop). |
| **Home** | Búsqueda global unificada | Sí | Sí | Integrada en la cabecera `HomeHeader`. |
| **Home** | Filtro desplegable por tipo de contenido | Sí | Sí | Desplegable en overlay con ícono `SlidersHorizontal`. |
| **Correo** | Selector multi-cuenta | Sí | Sí | Dropdown interactivo con cuentas corporativas y personales mock. |
| **Correo** | Carpetas (Recibidos, No leídos, Enviados, Borradores) | Sí | Sí | Chips de filtro con contadores en tiempo real. |
| **Correo** | Lista plana de mensajes | Sí | Sí | Filas planas con avatar, estrella de favoritos, indicador de adjuntos y no leídos. |
| **Correo** | Detalle de correo | Sí | Sí | En móvil cambio de pantalla; en web layout maestro-detalle en escritorio. |
| **Correo** | Redacción de correo | Sí | Sí | Modal de redacción con destinatario, asunto y cuerpo. |
| **Correo** | Acciones swipe (deslizar) | Sí | No | En móvil usa gestos nativos; en web se reemplaza por clics directos y hover. |
| **Correo** | Favoritos (marcar con estrella) | Sí | Sí | Toggle interactivo con ícono de estrella dorada. |
| **Notas** | Vista lista | Sí | Sí | Filas planas con ícono/candado y resumen. |
| **Notas** | Vista cuadrícula (grid) | Sí | Sí | 2 columnas en móvil, 3 en tablet, 4 en desktop. |
| **Notas** | Editor de notas | Sí | Sí | Creación, edición de texto y eliminación de notas. |
| **Notas** | Protección con PIN | Sí | Sí | Oculta título y vista previa mostrando "Nota protegida". |
| **Notas** | Candado (badge indicador) | Sí | Sí | Ícono de candado morado en notas protegidas. |
| **Almacenamiento** | Tarjeta de espacio disponible (15 GB) | Sí | Sí | Barra de progreso visual (8.5 GB usados de 15 GB). |
| **Almacenamiento** | Chips de filtro (Todos, Recientes, Docs, Fotos, Firmados) | Sí | Sí | Filtros por tipo de archivo funcionales. |
| **Almacenamiento** | Vista lista y cuadrícula | Sí | Sí | Conmutador de vista lista/grid adaptativo. |
| **Almacenamiento** | Preview de archivos | Sí | Sí | Previsualización de archivos con acciones de descarga/firma. |
| **Almacenamiento** | Firma de documentos | Sí | Sí | Badge visual de "Firmado" en documentos procesados. |
| **Almacenamiento** | Protección con PIN | Sí | Sí | Candado y restricción de acceso a archivos/carpetas privadas. |
| **Chat** | Pestañas Chats / Comunidades | Sí | Sí | Subrayado morado activo y conmutador funcional. |
| **Chat** | Fila de estados / Historias | Sí | Sí | Círculos horizontales con anillo morado de no visto y gris de visto. |
| **Chat** | Visor fullscreen de estados | Sí | Sí | Foto de fondo desenfocada, tarjeta flotante, barras de progreso y texto. |
| **Chat** | Editor de estados | Sí | Sí | Selección de foto, vinculación de productos BeeServices, tamaño y colores de texto. |
| **Chat** | Chips de categorías (crear y asignar) | Sí | Sí | Modal para crear categorías con ícono/color y asignación múltiple a chats. |
| **Chat** | Chat IA fijado ("Bee") | Sí | Sí | Fijado en la parte superior con avatar del logo e insignia "IA". |
| **Chat** | Conversación con burbujas | Sí | Sí | Mensajes del usuario y respuestas de contactos/asistente. |
| **Chat** | Perfil del chat y grupo | Sí | Sí | Edición de nombre en grupos, lista de miembros y mensajes temporales. |
| **Chat** | Mensajes temporales | Sí | Sí | Modal de selección de intervalo (30m, 1h, 6h, 24h, 7d). |
| **Chat** | Gestión de miembros de grupo | Sí | Sí | Agregar mediante `AddMemberModal` y eliminar si se es administrador. |
| **Chat** | Comunidades (crear, publicar, reaccionar) | Sí | Sí | Solo el admin publica; miembros reaccionan con `ThumbsUp`, `Heart` y `Laugh`. |
| **Chat** | Banner IA auto-reply (vendedor) | Sí | Sí | Banner fijo con estado activado/desactivado y badge "IA" en mensajes. |
| **Chat** | AiCatalogModal | Sí | Sí | Búsqueda de proveedores y servicios vía IA con botón para contactar al vendedor. |
| **Chat** | Protección PIN de chats | Sí | Sí | Chats protegidos ocultan el preview del último mensaje. |
| **Contactos** | Mis contactos / Descubrir red / Llamadas | Sí | Sí | Pestañas de gestión de contactos, red empresarial e historial de llamadas. |
| **Contactos** | Detalle de contacto | Sí | Sí | Tarjeta de perfil con botones de acción rápida (Llamar, Chat, Correo). |
| **Contactos** | Crear contacto | Sí | Sí | Formulario con selector de indicativo telefónico internacional (`CountrySelector`). |
| **Agenda** | Tira semanal deslizable | Sí | Sí | Días de la semana con resaltado del día actual y día seleccionado. |
| **Agenda** | Selector Día / Semana / Mes | Sí | Sí | Conmutador de modo de vista de agenda. |
| **Agenda** | Lista de eventos diarios | Sí | Sí | Compromisos programados con horario e ícono de videollamada. |
| **Agenda** | Detalle y creación de eventos | Sí | Sí | Modal de creación con enlace a reunión Google Meet e información detallada. |
| **BeeServices** | Lista de negocios | Sí | Sí | Gestión de múltiples negocios del usuario con avatar y categoría. |
| **BeeServices** | Crear negocio | Sí | Sí | Modal fullscreen para configurar nombre, dirección, categoría y modalidades de oferta. |
| **BeeServices** | Detalle de negocio y catálogo | Sí | Sí | Header del negocio, filtros (Todos/Productos/Servicios) y lista de catálogo. |
| **BeeServices** | Crear producto / servicio | Sí | Sí | Modales con carga de precio, imágenes mock y tabla dinámica de características. |
| **BeeServices** | Detalle de producto / servicio | Sí | Sí | Ficha completa de oferta con botones para editar y eliminar. |
| **Perfil** | Editar perfil (datos personales) | Sí | Sí | Foto, nombre, correo y teléfono con indicativo de país. |
| **Perfil** | Suscripción y Bee Verify | Sí | Sí | Hub de suscripción Pro y solicitud de insignia azul de verificado. |
| **Perfil** | Integraciones externas | Sí | Sí | Sincronización mock con Gmail, Outlook, Google Calendar y Drive. |
| **Perfil** | Seguridad (bloqueo app + PIN archivos) | Sí | Sí | Métodos de desbloqueo de app y gestión de PIN de 4 dígitos. |
| **Perfil** | Configuración del Asistente IA | Sí | Sí | Ajustes de nombre, tono (Profesional, Amigable, etc.) e idioma. |
| **Perfil** | Visibilidad en la red | Sí | Sí | Switch toggle de visibilidad pública. |
| **Menú Lateral** | Menú desplegable y navegación | Sí | Sí | Drawer en móvil/tablet y sidebar permanente en escritorio (`DesktopSidebar`). |
| **FloatingTabBar** | Ticker dinámico, íconos y badges | Sí | Sí | Animación de notificaciones cada 4s y badges dinámicos por tipo. |
| **FloatingTabBar** | Asistente por voz | Sí | Sí | Botón central con halo que despliega el modal inmersivo de voz. |
| **Notificaciones** | Centro de notificaciones | Sí | Sí | Notificaciones agrupadas por temporalidad (*Hoy*, *Ayer*, *Esta semana*). |
| **Personalización** | Modal de orden de chips | Sí | Sí | Reordenamiento de la posición de los chips en el Home. |

---

## SECCIÓN 3 — Funcionalidades faltantes

1. **Gestos nativos de swipe táctil en listas:** En la app móvil React Native se utiliza `react-native-gesture-handler` para deslizar horizontalmente una fila de correo o chat para archivar o eliminar. En la web estas acciones se realizan mediante menú contextual, botones de acción directos o dentro de la pantalla de detalle.
2. **Arrastre físico libre con física `PanGesture` en editor de historias:** En la app móvil, el texto sobre la imagen del estado se puede arrastrar libremente a cualquier coordenada `x,y` de la pantalla mediante gestos táctiles. En la app web la posición del texto está maquetada de forma centrada e interactiva sobre la vista previa.
3. **Reordenamiento hápico con `react-native-draggable-flatlist`:** El modal de personalización de chips en móvil utiliza físicas de arrastrar y soltar con vibración háptica; en la web se presenta un modal de lista de ordenación interactivo.
4. **Integración con hardware biométrico del dispositivo:** En la app móvil se invoca la API nativa de biometría (FaceID/Fingerprint); en la web se simula mediante autenticación UI con botón de huella y código PIN de 6 dígitos.

---

## SECCIÓN 4 — Diferencias de diseño y UX

1. **Adaptación Responsive Multi-Dispositivo (Ventaja Web):**
   - **Móvil:** La app web imita al 100% el layout de 1 columna centrado de 430px.
   - **Escritorio (>1024px):** La app web añade una barra lateral fija a la izquierda (`DesktopSidebar`) de 280px y transforma todos los módulos de contenido (Correos, Chat, Contactos, Agenda, Almacenamiento, Notas y BeeServices) en un esquema **Maestro-Detalle simultáneo** (lista a la izquierda y lectura/editor a la derecha), algo inexistente en la app móvil original.
2. **Visibilidad de la FloatingTabBar:**
   - En la app móvil la barra flotante inferior está presente en casi todas las pantallas.
   - En la app web de escritorio (más de 1024px), la `FloatingTabBar` se oculta automáticamente (`lg:hidden`), ya que la navegación se realiza directamente a través del menú lateral permanente.
3. **Menús desplegables y modales:**
   - En la app móvil los menús secundarios se abren mediante bottom sheets que se deslizan desde abajo.
   - En la app web se utilizan menús flotantes anclados a los botones (dropdowns con sombras elevadas y bordes suavizados), optimizados para el puntero del mouse.

---

## SECCIÓN 5 — Recomendaciones

1. **Persistencia Local Mock (LocalStorage / IndexedDB):** Para que las pruebas del usuario en el navegador conserven las notas, contactos, eventos y chats creados durante la sesión sin perderse al recargar la página.
2. **Implementación de Drag-and-Drop HTML5 en Web:** Cuando se requiera perfeccionar el reordenamiento visual de chips en el Home, se puede integrar una biblioteca de arrastrar y soltar web como `@hello-pangea/dnd` para imitar la animación física de React Native.
3. **Preparación de la Capa de Servicios/API:** Dado que la interfaz gráfica y los flujos mock están 100% completos en ambas aplicaciones, la siguiente fase del proyecto debería enfocarse en conectar la capa de servicios (`src/services/`) con un backend real (REST o GraphQL).
