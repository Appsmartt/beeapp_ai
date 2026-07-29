export interface EmailItem {
  id: string;
  sender: string;
  email: string;
  subject: string;
  preview: string;
  timestamp: string;
  unread: boolean;
  starred: boolean;
  hasAttachment: boolean;
  body?: string;
  folder?: string;
}

export const MOCK_EMAILS: EmailItem[] = [
  {
    id: 'em-1',
    sender: 'Soporte BeeApp',
    email: 'soporte@beeapp.ai',
    subject: 'Bienvenido a BeeApp AI',
    preview: 'Gracias por registrarte. Descubre todas las funciones disponibles...',
    timestamp: '10:30 AM',
    unread: true,
    starred: true,
    hasAttachment: false,
    body: 'Gracias por registrarte en BeeApp AI. Tu cuenta ha sido verificada exitosamente. Explora los módulos de chat, notas, almacenamiento y BeeServices para gestionar tu negocio.',
    folder: 'inbox',
  },
  {
    id: 'em-2',
    sender: 'Carlos Mendoza',
    email: 'carlos@techcorp.com',
    subject: 'Propuesta de integración de API',
    preview: 'Adjunto el documento detallado con las especificaciones técnicas para la integración...',
    timestamp: 'Ayer',
    unread: false,
    starred: false,
    hasAttachment: true,
    body: 'Hola Santiago, te envío la propuesta técnica para conectar la API de pagos con BeeServices. Quedo atento a tus comentarios.',
    folder: 'inbox',
  },
  {
    id: 'em-3',
    sender: 'María Fernanda Gómez',
    email: 'mfgomez@design.co',
    subject: 'Diseños de la campaña publicitaria',
    preview: 'Ya tenemos listos los artes finales para la publicación en la red empresarial...',
    timestamp: '25 Jul',
    unread: false,
    starred: true,
    hasAttachment: true,
    body: 'Adjunto los banners formateados en PNG para la sección de anuncios y catálogo.',
    folder: 'inbox',
  },
  {
    id: 'em-4',
    sender: 'Notificaciones Financieras',
    email: 'pagos@facturas.net',
    subject: 'Recibo de pago de suscripción #8492',
    preview: 'Tu pago del Plan Pro BeeApp ha sido procesado correctamente por $29.99...',
    timestamp: '24 Jul',
    unread: false,
    starred: false,
    hasAttachment: false,
    body: 'Confirmamos la recepción de tu pago mensual. Tu suscripción se renueva el 24 de Agosto de 2026.',
    folder: 'inbox',
  },
  {
    id: 'em-5',
    sender: 'Andrés Felipe Silva',
    email: 'andres.silva@innovacion.org',
    subject: 'Invitación al seminario de IA y Ventas',
    preview: 'Nos gustaría contar con tu presencia como ponente en el evento del próximo mes...',
    timestamp: '20 Jul',
    unread: false,
    starred: false,
    hasAttachment: false,
    body: 'Te invitamos a compartir la experiencia de tu negocio con BeeApp AI en nuestro pánel de transformación digital.',
    folder: 'inbox',
  },
];
