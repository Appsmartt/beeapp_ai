import type { ElementType } from 'react';
import { MessageCircle, Megaphone, Users, Globe, Phone, CircleDashed, Bot, Archive } from 'lucide-react';

export type ChatSection =
  | 'chats'
  | 'communities'
  | 'contacts'
  | 'discover'
  | 'calls'
  | 'statuses'
  | 'ai'
  | 'archived'; 

export type ContactsTab = 'my_contacts' | 'discover' | 'calls';

export const CHAT_SECTIONS: { key: ChatSection; label: string; icon: ElementType }[] = [
  { key: 'chats', label: 'Chats', icon: MessageCircle },
  { key: 'communities', label: 'Comunidades', icon: Megaphone },
  { key: 'contacts', label: 'Contactos', icon: Users },
  { key: 'discover', label: 'Descubrir red', icon: Globe },
  { key: 'calls', label: 'Llamadas', icon: Phone },
  { key: 'statuses', label: 'Estados', icon: CircleDashed },
  { key: 'ai', label: 'Asistente IA', icon: Bot },
  { key: 'archived', label: 'Chats archivados', icon: Archive },
];
