import type { ElementType } from 'react';
import {
  LayoutGrid,
  Mail,
  FileText,
  FolderOpen,
  Calendar,
  MessageCircle,
} from 'lucide-react';

export type ModuleKey = 'overview' | 'mail' | 'notes' | 'storage' | 'calendar' | 'chat';

export const MODULES: { key: ModuleKey; label: string; icon: ElementType }[] = [
  { key: 'overview', label: 'Todas', icon: LayoutGrid },
  { key: 'chat', label: 'Chat', icon: MessageCircle },
  { key: 'mail', label: 'Correos', icon: Mail },
  { key: 'notes', label: 'Notas', icon: FileText },
  { key: 'storage', label: 'Almacenamiento', icon: FolderOpen },
  { key: 'calendar', label: 'Agenda', icon: Calendar },
];

export const REORDERABLE_MODULE_KEYS: ModuleKey[] = MODULES.filter(
  (m) => m.key !== 'overview'
).map((m) => m.key);

export const getModule = (key: ModuleKey) => MODULES.find((m) => m.key === key);
