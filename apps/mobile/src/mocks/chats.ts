/**
 * Datos mock del módulo de Chat.
 * Extraídos de app/(main)/chat/ sin modificar su contenido.
 */

/** Id del chat fijado con el asistente de IA */
export const AI_CHAT_ID = 'ai-assistant';
/** Nombre que el usuario le puso al asistente en el onboarding (mock) */
export const AI_ASSISTANT_NAME = 'Bee';

export interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isGroup: boolean;
  status: 'sent' | 'delivered' | 'read';
  online?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  /** Mock: shows the verified badge next to the name (Bee Verify) */
  verified?: boolean;
  /** The BeeApp assistant: pinned on top, logo avatar and no swipe actions */
  isAI?: boolean;
  isProtected?: boolean;
}

export const MOCK_CHATS: ChatItem[] = [
  {
    id: AI_CHAT_ID,
    isAI: true,
    name: AI_ASSISTANT_NAME,
    lastMessage: '¡Hola! ¿En qué te puedo ayudar hoy?',
    time: 'Ahora',
    unreadCount: 0,
    isGroup: false,
    status: 'read',
    online: true,
    isPinned: true,
    isMuted: false,
    isProtected: false,
  },
  {
    id: '1',
    verified: true,
    name: 'Carlos Mendoza',
    lastMessage: 'Claro, nos vemos en la tarde para revisar la propuesta de BeeApp.',
    time: '14:32',
    unreadCount: 2,
    isGroup: false,
    status: 'read' as const,
    online: true,
    isPinned: true,
    isMuted: false,
    isProtected: true,
  },
  {
    id: '2',
    verified: false,
    name: 'Equipo de Desarrollo 🐝',
    lastMessage: 'Santiago: Acabo de subir el patch de expo-router a GitHub.',
    time: '12:15',
    unreadCount: 0,
    isGroup: true,
    status: 'read' as const,
    online: false,
    isPinned: true,
    isMuted: true,
    isProtected: true,
  },
  {
    id: '3',
    verified: true,
    name: 'Mariana Gómez',
    lastMessage: '¿Lograste firmar el documento del contrato?',
    time: 'Ayer',
    unreadCount: 0,
    isGroup: false,
    status: 'delivered' as const,
    online: false,
    isPinned: false,
    isMuted: false,
  },
  {
    id: '4',
    verified: true,
    name: 'Alejandro Reyes (Soporte)',
    lastMessage: 'Tu solicitud #1425 ha sido resuelta con éxito.',
    time: 'Ayer',
    unreadCount: 0,
    isGroup: false,
    status: 'sent' as const,
    online: true,
    isPinned: false,
    isMuted: false,
  },
];

export const MOCK_STORIES = [
  { id: 'tu', name: 'Tu estado', hasActive: false, isUser: true, verified: false },
  { id: '1', name: 'Carlos', hasActive: true, initials: 'C', verified: true },
  { id: '2', name: 'Mariana', hasActive: true, initials: 'M', verified: true },
  { id: '3', name: 'Alejandro', hasActive: false, initials: 'A', verified: true },
  { id: '4', name: 'Laura', hasActive: true, initials: 'L', verified: true },
  { id: '5', name: 'Felipe', hasActive: false, initials: 'F', verified: false },
];

export interface ChatMessage {
  id: number;
  senderName?: string;
  /** Mock: shows the verified badge next to the sender name (Bee Verify) */
  senderVerified?: boolean;
  isUser: boolean;
  type: 'text' | 'image' | 'file' | 'audio';
  text?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioDuration?: string;
  status: 'sent' | 'delivered' | 'read';
  time: string;
  replyTo?: {
    sender: string;
    text: string;
  };
  showCatalog?: boolean;
}

export const MOCK_CONVERSATION_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    senderName: 'Carlos Mendoza',
    senderVerified: true,
    isUser: false,
    type: 'text' as const,
    text: 'Hola Santiago, ¿cómo estás? Te escribo para confirmar la reunión.',
    time: '12:00',
    status: 'read' as const,
  },
  {
    id: 2,
    isUser: true,
    type: 'text' as const,
    text: '¡Hola Carlos! Todo bien por aquí. Sí, claro, confírmame la hora.',
    time: '12:02',
    status: 'read' as const,
    replyTo: {
      sender: 'Carlos Mendoza',
      text: 'Hola Santiago, ¿cómo estás? Te escribo para confirmar la reunión.',
    },
  },
  {
    id: 3,
    senderName: 'Carlos Mendoza',
    senderVerified: true,
    isUser: false,
    type: 'file' as const,
    fileName: 'Propuesta_Comercial_BeeApp.pdf',
    fileSize: '1.4 MB',
    time: '12:05',
    status: 'read' as const,
  },
  {
    id: 4,
    isUser: true,
    type: 'audio' as const,
    audioDuration: '0:14',
    time: '12:08',
    status: 'read' as const,
  },
  {
    id: 5,
    senderName: 'Carlos Mendoza',
    senderVerified: true,
    isUser: false,
    type: 'image' as const,
    mediaUrl: 'https://picsum.photos/400/300',
    text: 'Esta es la captura de los avances del diseño que te comentaba.',
    time: '12:10',
    status: 'read' as const,
  },
];

/** Conversación mock del chat fijado con el asistente de IA */
export const AI_CONVERSATION_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    senderName: AI_ASSISTANT_NAME,
    isUser: false,
    type: 'text',
    text: '¡Hola Santiago! Soy Bee, tu asistente. Puedo resumirte correos, prepararte reuniones o buscar archivos. ¿En qué te ayudo hoy?',
    time: '08:40',
    status: 'read',
  },
  {
    id: 2,
    isUser: true,
    type: 'text',
    text: '¿Qué tengo pendiente para hoy?',
    time: '08:41',
    status: 'read',
  },
  {
    id: 3,
    senderName: AI_ASSISTANT_NAME,
    isUser: false,
    type: 'text',
    text: 'Tienes la sincronización semanal de equipo a las 14:00 (45 min, videollamada) y dos correos sin responder: la cotización del proyecto Q3 y la minuta del equipo legal.',
    time: '08:41',
    status: 'read',
  },
  {
    id: 4,
    isUser: true,
    type: 'text',
    text: 'Prepárame un resumen de la cotización antes de la reunión.',
    time: '08:43',
    status: 'read',
  },
  {
    id: 5,
    senderName: AI_ASSISTANT_NAME,
    isUser: false,
    type: 'text',
    text: 'Listo. La junta aprobó el presupuesto del proyecto de consultoría y esperan el contrato de servicios para revisión legal. Te dejo el resumen preparado antes de las 14:00.',
    time: '08:43',
    status: 'read',
  },
  {
    id: 6,
    isUser: true,
    type: 'text',
    text: 'Necesito un diseñador gráfico para mi logo',
    time: '08:45',
    status: 'read',
  },
  {
    id: 7,
    senderName: AI_ASSISTANT_NAME,
    isUser: false,
    type: 'text',
    text: 'Encontré 3 opciones para ti:',
    time: '08:45',
    status: 'read',
    showCatalog: true,
  },
];
