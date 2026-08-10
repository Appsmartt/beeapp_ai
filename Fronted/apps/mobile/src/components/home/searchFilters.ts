import { Mail, MessageCircle, StickyNote, UserRound, Folder, CalendarDays } from 'lucide-react-native';

export type SearchFilterType = 'correo' | 'chat' | 'nota' | 'contacto' | 'archivo' | 'evento';

export interface SearchFilterOption {
  id: SearchFilterType;
  label: string;
  icon: typeof Mail;
}

/** Content types the Home search can be narrowed down to */
export const FILTER_OPTIONS: SearchFilterOption[] = [
  { id: 'correo', label: 'Correo', icon: Mail },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'nota', label: 'Nota', icon: StickyNote },
  { id: 'contacto', label: 'Contacto', icon: UserRound },
  { id: 'archivo', label: 'Archivo', icon: Folder },
  { id: 'evento', label: 'Evento', icon: CalendarDays },
];
