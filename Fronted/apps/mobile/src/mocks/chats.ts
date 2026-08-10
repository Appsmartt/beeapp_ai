/**
 * Datos mock del módulo de Chat.
 * Extraídos de app/(main)/chat/ sin modificar su contenido.
 */

/** Id del chat fijado con el asistente de IA */
export const AI_CHAT_ID = 'ai-assistant';
/** Nombre que el usuario le puso al asistente en el onboarding (mock) */
export const AI_ASSISTANT_NAME = 'Bee';

/** Member of a group chat (mock). The current user is always the admin. */
export interface GroupMember {
  id: string;
  name: string;
  role: 'admin' | 'member';
  initials: string;
  /** Background of the initials avatar */
  color: string;
  /** The logged user: shown first and tagged "Tú" */
  isCurrentUser?: boolean;
}

/** Categoría de chats creada por el usuario (mock) */
export interface ChatCategory {
  id: string;
  name: string;
  /** Nombre del ícono de Lucide elegido en el modal de crear */
  icon: string;
  /** Color del chip (elegido por el usuario, no es un token del sistema) */
  color: string;
}

export const MOCK_CATEGORIES: ChatCategory[] = [
  { id: 'cat-friends', name: 'Amigos', icon: 'Users', color: '#EBF5FF' },
  { id: 'cat-work', name: 'Trabajo', icon: 'Briefcase', color: '#F1F3F5' },
  { id: 'cat-family', name: 'Familia', icon: 'Heart', color: '#FCE7F3' },
];

/** Agrega una categoría nueva (mock en memoria) */
export function addCategory(category: Omit<ChatCategory, 'id'>): ChatCategory {
  const created: ChatCategory = { ...category, id: 'cat_' + Date.now().toString(36) };
  MOCK_CATEGORIES.push(created);
  return created;
}

/** Reemplaza las categorías de un chat (un chat puede estar en varias) */
export function setChatCategories(chatId: string, categoryIds: string[]) {
  const chat = MOCK_CHATS.find((c) => c.id === chatId);
  if (chat) chat.categoryIds = categoryIds;
}

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
  /** Only on group chats: who is in the group */
  members?: GroupMember[];
  /** Categories the user filed this chat under (the assistant has none) */
  categoryIds?: string[];
  /** Chat is archived by the user */
  isArchived?: boolean;
  /** A customer wrote about something the user sells: enables the AI auto-reply banner */
  isSellerChat?: boolean;
  /** What the customer is asking about (only on seller chats) */
  linkedProduct?: SellerChatProduct | null;
}

/** Producto o servicio de BeeServices por el que un cliente escribió */
export interface SellerChatProduct {
  name: string;
  businessName: string;
}

/**
 * Members of the mock group chat ("Equipo de Desarrollo").
 * The ids of the ones that are also contacts match `MY_CONTACTS`, so the
 * "agregar miembro" sheet never offers someone who is already in the group.
 */
export const MOCK_GROUP_MEMBERS: GroupMember[] = [
  { id: 'me', name: 'Santiago Valencia', role: 'admin', initials: 'SV', color: '#F3E8FF', isCurrentUser: true },
  { id: 'c1', name: 'Carlos Mendoza', role: 'member', initials: 'CM', color: '#EBF5FF' },
  { id: 'c3', name: 'María Gómez', role: 'member', initials: 'MG', color: '#ECFDF5' },
  { id: 'g1', name: 'Laura Restrepo', role: 'member', initials: 'LR', color: '#FFEBEE' },
];

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
    categoryIds: ['cat-work', 'cat-friends'],
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
    members: MOCK_GROUP_MEMBERS,
    categoryIds: ['cat-work'],
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
    categoryIds: ['cat-family'],
    isSellerChat: true,
    linkedProduct: { name: 'Asesoría Legal', businessName: 'Consultores Asociados S.A.S.' },
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
    isArchived: true,
    isSellerChat: true,
    linkedProduct: { name: 'Laptop HP', businessName: 'TechStore Bogotá' },
  },
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
  /** El asistente contestó por el vendedor: la burbuja lleva el badge "IA" */
  sentByAi?: boolean;
  isPinned?: boolean;
  isEdited?: boolean;
  isDestroyed?: boolean;
}

/** Hilo mock de un chat de vendedor: el cliente pregunta y la IA contesta */
export const SELLER_CONVERSATION_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    senderName: 'Cliente',
    isUser: false,
    type: 'text',
    text: 'Hola, buenas tardes. ¿Todavía tienes disponible lo que publicaste en BeeApp?',
    time: '09:12',
    status: 'read',
  },
  {
    id: 2,
    isUser: true,
    type: 'text',
    text: 'Hola, gracias por escribir. Sí, sigue disponible. ¿Quieres que te comparta los detalles y el precio?',
    time: '09:12',
    status: 'read',
    sentByAi: true,
  },
  {
    id: 3,
    senderName: 'Cliente',
    isUser: false,
    type: 'text',
    text: 'Sí, por favor. ¿Y cuánto tardaría la entrega?',
    time: '09:14',
    status: 'read',
  },
  {
    id: 4,
    isUser: true,
    type: 'text',
    text: 'La entrega toma entre dos y tres días hábiles en Bogotá. Te paso la cotización formal en un momento.',
    time: '09:15',
    status: 'delivered',
    sentByAi: true,
  },
];

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
