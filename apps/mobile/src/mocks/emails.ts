/**
 * Datos mock del módulo de Correos.
 * Extraídos de app/(main)/mail/ sin modificar su contenido.
 */

export interface EmailItem {
  id: string;
  senderName: string;
  /** Mock: shows the verified badge next to the sender name (Bee Verify) */
  senderVerified?: boolean;
  senderEmail: string;
  subject: string;
  bodyPreview: string;
  body: string;
  time: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachment: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'starred' | 'spam' | 'trash';
  account: 'all' | 'santiago.valencia@consultores.com' | 'ventas@empresa.com';
  initialsColor: string;
  attachments?: string[];
}

export const MOCK_EMAILS: EmailItem[] = [
  {
    id: 'm1',
    senderName: 'Eduardo Torres',
    senderVerified: false,
    senderEmail: 'etorres@empresa-cliente.com',
    subject: 'Cotización aprobada para el proyecto Q3',
    bodyPreview: 'Hola Santiago, te confirmo que la junta directiva aprobó el presupuesto estimado para el proyecto de consultoría. Quedamos a la espera del contrato de servicios...',
    body: 'Hola Santiago,\n\nTe confirmo que la junta directiva aprobó el presupuesto estimado para el proyecto de consultoría en su sesión del martes. Todo el equipo de ventas está entusiasmado por iniciar.\n\nQuedamos a la espera del contrato de servicios final para que nuestro equipo legal lo revise y podamos agendar la reunión de kick-off.\n\nSaludos cordiales,\nEduardo Torres\nDirector de Proyectos',
    time: '09:15 AM',
    date: '23 Jul',
    isRead: false,
    isStarred: true,
    hasAttachment: true,
    folder: 'inbox',
    account: 'santiago.valencia@consultores.com',
    initialsColor: '#7C3AED',
    attachments: ['Presupuesto_Aprobado_Q3.pdf', 'Cronograma_Actividades.xlsx'],
  },
  {
    id: 'm2',
    senderName: 'María Alejandra Gomez',
    senderVerified: true,
    senderEmail: 'mgomez@consultores.com',
    subject: 'Minuta de la reunión con el equipo legal',
    bodyPreview: 'Hola equipo, les comparto los puntos clave tratados en la llamada de ayer respecto a la protección de datos y las nuevas cláusulas NDA para consultores externos...',
    body: 'Hola equipo,\n\nLes comparto los puntos clave tratados en la llamada de ayer respecto a la protección de datos y las nuevas cláusulas NDA para consultores externos.\n\n1. Aprobación del NDA estándar para contratos nuevos.\n2. Almacenamiento seguro de llaves criptográficas.\n3. Protocolo de comunicación con clientes en Colombia.\n\nPor favor revisen los adjuntos antes del viernes.\n\nAtentamente,\nMaría Alejandra Gomez',
    time: 'Ayer',
    date: '22 Jul',
    isRead: true,
    isStarred: false,
    hasAttachment: true,
    folder: 'inbox',
    account: 'santiago.valencia@consultores.com',
    initialsColor: '#059669',
    attachments: ['NDA_Consultores_v2.docx'],
  },
  {
    id: 'm3',
    senderName: 'Soporte BeeApp',
    senderVerified: true,
    senderEmail: 'soporte@beeapp.ai',
    subject: 'Bienvenido a BeeApp AI - Primeros pasos',
    bodyPreview: '¡Hola Santiago! Tu cuenta ya está lista. Descubre cómo usar los accesos rápidos de correo, notas y el asistente inteligente BeeAI para simplificar tu flujo...',
    body: '¡Hola Santiago!\n\nTu cuenta ya está lista. Descubre cómo usar los accesos rápidos de correo, notas y el asistente inteligente BeeAI para simplificar tu flujo.\n\nEn este correo encontrarás una pequeña guía rápida:\n- Vincula tus cuentas de Gmail y Outlook desde el Perfil.\n- Utiliza el botón central del chat para interactuar directamente con tu negocio.\n\nEstamos para ayudarte.\nEl equipo de BeeApp',
    time: '21 Jul',
    date: '21 Jul',
    isRead: true,
    isStarred: true,
    hasAttachment: false,
    folder: 'inbox',
    account: 'ventas@empresa.com',
    initialsColor: '#D97706',
  },
  {
    id: 'm4',
    senderName: 'Santiago Valencia',
    senderVerified: false,
    senderEmail: 'santiago.valencia@consultores.com',
    subject: 'Propuesta comercial preliminar - Cliente Q3',
    bodyPreview: 'Adjunto envío borrador con la propuesta estructurada para Eduardo. Favor revisar precios y condiciones comerciales antes del envío formal...',
    body: 'Adjunto envío borrador con la propuesta estructurada para Eduardo. Favor revisar precios y condiciones comerciales antes del envío formal.\n\nQuedo atento a sus sugerencias.',
    time: '20 Jul',
    date: '20 Jul',
    isRead: true,
    isStarred: false,
    hasAttachment: false,
    folder: 'sent',
    account: 'santiago.valencia@consultores.com',
    initialsColor: '#1E88E5',
  },
  {
    id: 'm5',
    senderName: 'Newsletter Marketing',
    senderVerified: false,
    senderEmail: 'promo@marketin-ideas.com',
    subject: '¡Consigue 100 clientes en 7 días con IA!',
    bodyPreview: 'Oferta exclusiva por tiempo limitado. Aprende las mejores estrategias de automatización del mercado y dispara tus métricas de conversión comercial...',
    body: 'Oferta exclusiva por tiempo limitado. Aprende las mejores estrategias de automatización del mercado y dispara tus métricas de conversión comercial.\n\nCompra hoy mismo.',
    time: '19 Jul',
    date: '19 Jul',
    isRead: true,
    isStarred: false,
    hasAttachment: false,
    folder: 'spam',
    account: 'ventas@empresa.com',
    initialsColor: '#DC2626',
  },
];

export const SENDER_ACCOUNTS = [
  'santiago.valencia@consultores.com',
  'ventas@empresa.com',
];
