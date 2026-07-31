import { Mail, FileText, Folder, Calendar, MessageCircle, LayoutGrid } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

export interface HomeModule {
  id: string;
  name: string;
  icon: typeof Mail;
  bgColor: string;
  iconColor: string;
  desc: string;
  /** Special chip: renders the cross-module overview instead of a module */
  isOverview?: boolean;
}

/** Id of the always-present overview chip */
export const OVERVIEW_MODULE_ID = 'todas';

// Módulos disponibles para los accesos rápidos personalizables del home.
// Cada uno se abre EMBEBIDO dentro del Home (nunca navega a otra ruta).
export const MODULES_POOL: HomeModule[] = [
  { id: OVERVIEW_MODULE_ID, name: 'Todas', icon: LayoutGrid, bgColor: colors.brand.primary + '15', iconColor: colors.brand.primary, desc: 'Resumen de todos los módulos activos', isOverview: true },
  { id: 'chat', name: 'Chat', icon: MessageCircle, bgColor: colors.neutral.gray100, iconColor: colors.neutral.gray600, desc: 'Mensajes, historias y llamadas' },
  { id: 'mail', name: 'Correos', icon: Mail, bgColor: colors.neutral.gray100, iconColor: colors.neutral.gray600, desc: 'Bandeja de entrada y correos' },
  { id: 'notes', name: 'Notas', icon: FileText, bgColor: colors.neutral.gray100, iconColor: colors.neutral.gray600, desc: 'Notas y apuntes personales' },
  { id: 'files', name: 'Almacenamiento', icon: Folder, bgColor: colors.neutral.gray100, iconColor: colors.neutral.gray600, desc: 'Archivos y firma digital de documentos' },
  { id: 'calendar', name: 'Agenda', icon: Calendar, bgColor: colors.neutral.gray100, iconColor: colors.neutral.gray600, desc: 'Agenda de reuniones y eventos' },
];

/** Modules the user can turn on/off and reorder ("Todas" is always first) */
export const CUSTOMIZABLE_MODULES = MODULES_POOL.filter((m) => !m.isOverview);

export const getModule = (id: string) => MODULES_POOL.find((m) => m.id === id);
