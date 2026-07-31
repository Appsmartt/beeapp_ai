/** Carpetas del módulo de Correo. `unread` y `starred` son vistas, no carpetas reales */
export type MailFolder =
  | 'inbox'
  | 'unread'
  | 'sent'
  | 'drafts'
  | 'starred'
  | 'trash'
  | 'archive';

export interface MailAttachment {
  name: string;
  /** Tamaño mock, ya formateado */
  size: string;
  /** Etiqueta corta del tipo de archivo: PDF, DOCX… */
  kind: string;
}

export interface EmailItem {
  id: string;
  sender: string;
  /** Mock: muestra la insignia de verificado junto al remitente */
  senderVerified?: boolean;
  email: string;
  subject: string;
  preview: string;
  body?: string;
  timestamp: string;
  /** Fecha larga que se muestra en el detalle */
  date?: string;
  unread: boolean;
  starred: boolean;
  hasAttachment: boolean;
  folder: MailFolder;
  /** Cuenta a la que llegó el correo */
  account: string;
  /** Color del avatar de iniciales del remitente */
  initialsColor: string;
  attachments?: MailAttachment[];
}

/** Cuentas de correo conectadas (mock) */
export const MAIL_ACCOUNTS = ['santiago@appsmartt.com', 'contacto@beeapp.ai'];

export const MOCK_EMAILS: EmailItem[] = [
  {
    id: 'em-1',
    sender: 'Soporte BeeApp',
    senderVerified: true,
    email: 'soporte@beeapp.ai',
    subject: 'Bienvenido a BeeApp AI',
    preview: 'Gracias por registrarte. Descubre todas las funciones disponibles...',
    timestamp: '10:30 AM',
    date: '26 de julio de 2026, 10:30',
    unread: true,
    starred: true,
    hasAttachment: false,
    folder: 'inbox',
    account: 'contacto@beeapp.ai',
    initialsColor: '#D97706',
    body: 'Gracias por registrarte en BeeApp AI. Tu cuenta ha sido verificada exitosamente. Explora los módulos de chat, notas, almacenamiento y BeeServices para gestionar tu negocio.',
  },
  {
    id: 'em-2',
    sender: 'Carlos Mendoza',
    email: 'carlos@techcorp.com',
    subject: 'Propuesta de integración de API',
    preview: 'Adjunto el documento detallado con las especificaciones técnicas para la integración...',
    timestamp: 'Ayer',
    date: '25 de julio de 2026, 16:04',
    unread: true,
    starred: false,
    hasAttachment: true,
    folder: 'inbox',
    account: 'santiago@appsmartt.com',
    initialsColor: '#7C3AED',
    body: 'Hola Santiago,\n\nTe envío la propuesta técnica para conectar la API de pagos con BeeServices.\n\nQuedo atento a tus comentarios.\n\nCarlos Mendoza',
    attachments: [
      { name: 'Propuesta_API_v3.pdf', size: '1.2 MB', kind: 'PDF' },
      { name: 'Diagrama_Integracion.png', size: '480 KB', kind: 'PNG' },
    ],
  },
  {
    id: 'em-3',
    sender: 'María Fernanda Gómez',
    senderVerified: true,
    email: 'mfgomez@design.co',
    subject: 'Diseños de la campaña publicitaria',
    preview: 'Ya tenemos listos los artes finales para la publicación en la red empresarial...',
    timestamp: '25 Jul',
    date: '25 de julio de 2026, 09:12',
    unread: false,
    starred: true,
    hasAttachment: true,
    folder: 'inbox',
    account: 'contacto@beeapp.ai',
    initialsColor: '#059669',
    body: 'Adjunto los banners formateados en PNG para la sección de anuncios y catálogo.',
    attachments: [{ name: 'Banners_Campana.zip', size: '8.4 MB', kind: 'ZIP' }],
  },
  {
    id: 'em-4',
    sender: 'Notificaciones Financieras',
    email: 'pagos@facturas.net',
    subject: 'Recibo de pago de suscripción #8492',
    preview: 'Tu pago del Plan Pro BeeApp ha sido procesado correctamente por $29.99...',
    timestamp: '24 Jul',
    date: '24 de julio de 2026, 07:45',
    unread: false,
    starred: false,
    hasAttachment: false,
    folder: 'inbox',
    account: 'santiago@appsmartt.com',
    initialsColor: '#1E88E5',
    body: 'Confirmamos la recepción de tu pago mensual. Tu suscripción se renueva el 24 de agosto de 2026.',
  },
  {
    id: 'em-5',
    sender: 'Andrés Felipe Silva',
    email: 'andres.silva@innovacion.org',
    subject: 'Invitación al seminario de IA y Ventas',
    preview: 'Nos gustaría contar con tu presencia como ponente en el evento del próximo mes...',
    timestamp: '20 Jul',
    date: '20 de julio de 2026, 11:20',
    unread: false,
    starred: false,
    hasAttachment: false,
    folder: 'inbox',
    account: 'contacto@beeapp.ai',
    initialsColor: '#DB2777',
    body: 'Te invitamos a compartir la experiencia de tu negocio con BeeApp AI en nuestro panel de transformación digital.',
  },
  {
    id: 'em-6',
    sender: 'Santiago Morales',
    email: 'etorres@empresa-cliente.com',
    subject: 'Propuesta comercial preliminar - Cliente Q3',
    preview: 'Adjunto envío el borrador con la propuesta estructurada. Favor revisar precios...',
    timestamp: '23 Jul',
    date: '23 de julio de 2026, 18:30',
    unread: false,
    starred: false,
    hasAttachment: true,
    folder: 'sent',
    account: 'santiago@appsmartt.com',
    initialsColor: '#6025d2',
    body: 'Adjunto envío el borrador con la propuesta estructurada para Eduardo. Favor revisar precios y condiciones comerciales antes del envío formal.',
    attachments: [{ name: 'Propuesta_Q3.docx', size: '340 KB', kind: 'DOCX' }],
  },
  {
    id: 'em-7',
    sender: 'Santiago Morales',
    email: 'mgomez@consultores.com',
    subject: 'Seguimiento reunión equipo legal',
    preview: 'Hola María, quedo pendiente de la minuta con los puntos de protección de datos...',
    timestamp: '22 Jul',
    date: '22 de julio de 2026, 08:05',
    unread: false,
    starred: false,
    hasAttachment: false,
    folder: 'drafts',
    account: 'santiago@appsmartt.com',
    initialsColor: '#6025d2',
    body: 'Hola María, quedo pendiente de la minuta con los puntos de protección de datos y las cláusulas NDA para consultores externos.',
  },
  {
    id: 'em-8',
    sender: 'Newsletter Marketing',
    email: 'promo@marketing-ideas.com',
    subject: 'Consigue 100 clientes en 7 días con IA',
    preview: 'Oferta exclusiva por tiempo limitado. Aprende las mejores estrategias...',
    timestamp: '19 Jul',
    date: '19 de julio de 2026, 13:50',
    unread: false,
    starred: false,
    hasAttachment: false,
    folder: 'trash',
    account: 'contacto@beeapp.ai',
    initialsColor: '#DC2626',
    body: 'Oferta exclusiva por tiempo limitado. Aprende las mejores estrategias de automatización del mercado.',
  },
  {
    id: 'em-9',
    sender: 'Laura Restrepo',
    email: 'laura@mentoriafinanzas.co',
    subject: 'Resumen de la mentoría de finanzas',
    preview: 'Te comparto el resumen de la sesión y los indicadores que revisamos...',
    timestamp: '18 Jul',
    date: '18 de julio de 2026, 15:15',
    unread: false,
    starred: true,
    hasAttachment: true,
    folder: 'archive',
    account: 'santiago@appsmartt.com',
    initialsColor: '#0891B2',
    body: 'Te comparto el resumen de la sesión y los indicadores que revisamos para el cierre del trimestre.',
    attachments: [{ name: 'Resumen_Mentoria.pdf', size: '760 KB', kind: 'PDF' }],
  },
];
