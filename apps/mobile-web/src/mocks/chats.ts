export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  sentByAi?: boolean;
}

export interface ChatItem {
  id: string;
  name: string;
  preview: string;
  timestamp: string;
  unreadCount: number;
  isAi: boolean;
  isGroup: boolean;
  isProtected: boolean;
  verified: boolean;
  avatar?: string;
  isSellerChat?: boolean;
  categoryIds?: string[];
  messages?: ChatMessage[];
}

export const MOCK_CHATS: ChatItem[] = [
  {
    id: 'ai-assistant',
    name: 'Bee (Asistente IA)',
    preview: 'Hola Santiago, ¿en qué te puedo ayudar hoy?',
    timestamp: '11:05 AM',
    unreadCount: 0,
    isAi: true,
    isGroup: false,
    isProtected: false,
    verified: true,
    messages: [
      { id: 'm1', sender: 'Bee', text: 'Hola Santiago, ¿en qué te puedo ayudar hoy con tu negocio?', timestamp: '11:05 AM', isMe: false }
    ],
  },
  {
    id: 'ch-1',
    name: 'Laura Restrepo',
    preview: '¿Me puedes confirmar el precio del servicio de diseño?',
    timestamp: '10:48 AM',
    unreadCount: 2,
    isAi: false,
    isGroup: false,
    isProtected: false,
    verified: true,
    isSellerChat: true,
    messages: [
      { id: 'm1', sender: 'Laura Restrepo', text: 'Hola, vi tu catálogo en BeeServices', timestamp: '10:45 AM', isMe: false },
      { id: 'm2', sender: 'Laura Restrepo', text: '¿Me puedes confirmar el precio del servicio de diseño?', timestamp: '10:48 AM', isMe: false }
    ],
  },
  {
    id: 'ch-2',
    name: 'Equipo de Desarrollo',
    preview: 'Diego: Ya subimos los cambios del layout web a staging.',
    timestamp: '09:30 AM',
    unreadCount: 5,
    isAi: false,
    isGroup: true,
    isProtected: false,
    verified: false,
    messages: [
      { id: 'm1', sender: 'Diego', text: 'Ya subimos los cambios del layout web a staging.', timestamp: '09:30 AM', isMe: false }
    ],
  },
  {
    id: 'ch-3',
    name: 'Documentos Confidenciales',
    preview: 'Chat protegido',
    timestamp: 'Ayer',
    unreadCount: 0,
    isAi: false,
    isGroup: false,
    isProtected: true,
    verified: false,
  },
  {
    id: 'ch-4',
    name: 'Camilo Torres',
    preview: 'Nos vemos a las 3:00 PM para la revisión de contrato.',
    timestamp: '27 Jul',
    unreadCount: 0,
    isAi: false,
    isGroup: false,
    isProtected: false,
    verified: false,
  },
];
