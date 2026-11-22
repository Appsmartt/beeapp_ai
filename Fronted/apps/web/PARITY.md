# Paridad web ↔ app móvil (cliente) — 100% Completada

Leyenda: `[x]` implementado y verificado en web · `[N/A]` excluido por decisión de arquitectura

## Decisiones de arquitectura acordadas
- **Biometría nativa**: Exclusiva de la app móvil (`[N/A]` en web; sin pantallas mock de bloqueo en web).
- **Firma de PDF**: Eliminada tanto de web como de móvil para mantener cero flujos mock/huérfanos.
- **Acciones de mensaje en chat**: Limitadas estrictamente a capacidades reales del backend (responder, reaccionar con emojis, copiar texto y ver adjuntos).
- **Cero rutas huérfanas**: Todas las rutas de `apps/web` y `apps/mobile` están enlazadas desde la navegación principal o flujos de negocio.

## Auth / onboarding
- [x] Login email/contraseña (con recordar correo y estados de bloqueo/rate-limit)
- [x] Login OTP teléfono (reenvío con temporizador, cambio de número y selector dinámico de país)
- [x] Recuperar contraseña (flujo completo por SMS request/verify/reset + enlace por correo)
- [x] Onboarding post-registro (3 pasos completos: perfil/ubicación, asistente IA/tono y permisos)
- [x] Login / vincular sesión por QR (polling con estados de expiración y confirmación)
- [x] Registro con países dinámicos desde settings, validación de contraseña y confirmación

## Perfil / verificación / suscripción
- [x] Editar perfil (API + fecha de nacimiento + subida de avatar a Storage)
- [x] Avatar upload con previsualización y recorte/validación
- [x] Visibilidad en red (`set_network_visibility` integrado en UI de perfil)
- [x] Buddy Verify (subida de documento, estados de revisión y reintento)
- [x] Planes upgrade/cancelar/reactivar (RPC + checkout Factus Pay + descarga de QR)
- [x] Almacenamiento real desglosado en panel de suscripción

## Seguridad / dispositivos
- [x] PIN desbloqueo de chats y archivos (verificación contra API real)
- [x] Configurar/cambiar/eliminar PIN de cuenta
- [x] Chats protegidos (proteger, listar y quitar protección con PIN en UI)
- [x] Listar/revocar dispositivos individuales y cerrar todas las demás sesiones (`revokeEveryDeviceSession`)
- [x] Mostrar QR para vincular web desde dispositivos

## Chat / llamadas / red social
- [x] Inbox, categorías personalizadas (crear/asignar/eliminar), mensajes de texto y formato enriquecido
- [x] Fijar/silenciar/archivar/vaciar conversación sincronizado con API
- [x] Adjuntos (imagen, video, audio/nota de voz con grabación real, documento, ubicación y contacto)
- [x] Respuestas citadas con salto al mensaje original y reacciones reales por mensaje
- [x] Realtime (Supabase INSERT/UPDATE de mensajes, recibos de entrega/lectura y presencia)
- [x] Grupos (crear con foto/política, perfil de grupo, añadir/quitar miembros, roles admin, invitaciones pendientes)
- [x] Comunidades (explorar, crear, publicar con imagen, reaccionar, comentar, editar y salir)
- [x] Estados (texto e imagen, selector de color/fuente, visor con progreso, respuestas y lista de vistas)
- [x] Llamadas Agora de voz y video (salientes y entrantes globales con `IncomingCallManager` y `CallOverlay`)
- [x] Contactos CRUD completo + red social (Descubrir usuarios, Seguir / Siguiendo / Seguidores)

## Productividad (Correo / Agenda / Notas / Archivos)
- [x] Correo (`useMail`, carpetas, adjuntos, visor HTML/Texto seguro, cuentas externas y redacción asistida por IA)
- [x] Agenda (vistas Día/Semana/Mes, filtros por origen, recordatorios, asistentes, duplicar evento y calendarios externos)
- [x] Notas CRUD completo (árbol de subcarpetas, etiquetas con color, bloques texto/título/check/imagen/campo/fecha, reordenamiento, vista previa, adjuntos generales y notas compartidas conmigo)
- [x] Almacenamiento CRUD completo (subcarpetas, categorías con color, ordenamiento, protección con PIN, papelera con restaurar/vaciar, visor lightbox/audio y archivos compartidos conmigo)

## Integraciones / notificaciones
- [x] Integraciones OAuth (capacidades detalladas por proveedor, confirmación al desconectar y sincronización)
- [x] Campana contextual por módulo (`ModuleNotificationBell`) filtrada por tipo y con marcado individual/masivo
- [x] Centro `/app/notifications` con filtros y navegación directa al recurso

## Buddy Services — Comprador (`/app/beeservices/*`)
- [x] Inicio marketplace con búsqueda por texto y voz (Whisper STT con validación anti-alucinaciones), categorías, negocios recientes y feed paginado
- [x] Resultados públicos (`PublicResults`) con 6 selectores de filtro, chips removibles, conteo total y paginación
- [x] Perfil público de negocio (`PublicProfile`) con tabs Productos/Servicios/Información, estado abierto/cerrado según horario, alerta de carrito cruzado y chat directo
- [x] Detalle de oferta (`PublicOffer`) con galería de imágenes, badge `-XX% OFF`, políticas de servicio y atajo de edición para el dueño
- [x] Solicitud de oferta y reserva (`OfferRequestForm`) con bloqueo de días cerrados, grilla de horarios cada 30 min en zona horaria del negocio y cálculo automático de fin
- [x] Carrito unificado aislado por usuario (`CartScreen`) con controles `-/+`, edición inline de reserva/comentario por línea, modalidad, dirección de entrega, `Idempotency-Key` persistente y revalidación automática
- [x] Mis compras y detalle formal (`MyPurchases`, `CustomerRequestDetailView`) con 13 estados traducidos, cuenta regresiva de reserva (`SlotHeld`), negociación por ítem, subida/reemplazo de comprobante de pago (`X/3` intentos) y línea de tiempo

## Buddy Services — Dueño (`/app/beeservices/manage/[businessId]/*`)
- [x] Mis negocios (`OwnedBusinessCard`, `CreateBusinessForm`) con logo, insignia verificado, creación guiada (país/ciudad, hasta 5 categorías, 8 modalidades, redes y primera oferta), archivado con motivo y eliminación validada
- [x] Workspace comercial (`CommercialWorkspace`) con selector rápido de negocio en cabecera, tarjeta hero de estado, badge `"Sin configurar"` en horario y presencia comercial en chats
- [x] Perfil del negocio (`ManageProfile`) con subida de logo, tipo de oferta, categorías, modalidades, redes sociales, validación de privacidad de contacto, archivado con motivo y zona de peligro
- [x] Horario (`ManageHours`) con zona horaria y validación `closes_at > opens_at`
- [x] Operación (`ManageOperation`) con zona horaria, moneda COP, modos de domicilio y tiempos de apartado
- [x] Métodos de pago (`ManagePayments`) con toggle rápido de contraentrega, crear/editar/archivar/eliminar métodos y validación celular de billeteras
- [x] Ofertas y editor (`ManageOffers`, `ManageOfferEditor`) con galería de hasta 5 imágenes (subir, principal, reordenar, eliminar), estrategias de precio, presets de descuento, control y ajuste de inventario con motivo, política de pago y eliminación validada
- [x] Verificación (`ManageVerification`) con subida de soporte PDF (máx 10 MB) y declaración explícita opt-in (`v1`)
- [x] Solicitudes recibidas y detalle formal (`ManageRequests`, `ManageRequestDetailView`) con transiciones de solicitud, negociación por ítem, estados operativos por ítem, creación de reserva (`SlotHold`), revisión de comprobantes de pago (aprobar/rechazar con motivo y alerta de 3er intento) y confirmación de pago recibido
- [x] Métricas (`ManageMetrics`) por día/semana/mes con gráfico de barras y ranking de más vendidos

## Asistente IA / voz / búsqueda global
- [x] Configuración del asistente (`getAssistantSettings` / `saveAssistantSettings` / `clearAssistantMemory`)
- [x] FAB y modal global de voz (`VoiceAssistantFab`, `VoiceAssistantModal`, `VoiceControls`) disponible en todas las rutas `/app/*` con STT/TTS, confirmación de acciones, selección de proveedores y apertura de chat en vivo
- [x] Pantalla dedicada `/app/assistant` y fila en bandeja de chats (`AiChatListItem`) con fijar/desfijar real, silenciar, vaciar historial de mensajes (`clearAssistantMessages`) y contexto automático del carrito de Buddy Services
- [x] Búsqueda global (`HomeSearchResults`) en chats, contactos, correos (todas las carpetas), notas, archivos y eventos de agenda
