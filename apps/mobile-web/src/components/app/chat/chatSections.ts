import type { ElementType } from 'react';
import { MessageCircle, Megaphone, Users, Globe, Phone, CircleDashed, Bot } from 'lucide-react';

/**
 * Qué se muestra en el panel izquierdo del módulo de Chat.
 * En desktop lo controla el sidebar derecho; en móvil, las pestañas del panel.
 */
export type ChatSection =
  | 'chats'
  | 'communities'
  | 'contacts'
  | 'discover'
  | 'calls'
  | 'statuses'
  | 'ai';

/** Sub-pestañas del panel de contactos dentro de Chat */
export type ContactsTab = 'my_contacts' | 'discover' | 'calls';

/** Opciones contextuales de Chat en el sidebar derecho (solo desktop) */
export const CHAT_SECTIONS: { key: ChatSection; label: string; icon: ElementType }[] = [
  { key: 'chats', label: 'Chats', icon: MessageCircle },
  { key: 'communities', label: 'Comunidades', icon: Megaphone },
  { key: 'contacts', label: 'Contactos', icon: Users },
  { key: 'discover', label: 'Descubrir red', icon: Globe },
  { key: 'calls', label: 'Llamadas', icon: Phone },
  { key: 'statuses', label: 'Estados', icon: CircleDashed },
  { key: 'ai', label: 'Asistente IA', icon: Bot },
];
