import { Mail, FileText, Users, Folder, Calendar, MessageCircle, LayoutGrid } from 'lucide-react-native';
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
  { id: OVERVIEW_MODULE_ID, name: 'Todas', icon: LayoutGrid, bgColor: '#F3E8FF', iconColor: colors.brand.primary, desc: 'Resumen de todos los módulos activos', isOverview: true },
  { id: 'mail', name: 'Correos', icon: Mail, bgColor: '#EBF5FF', iconColor: '#1E88E5', desc: 'Bandeja de entrada y correos' },
  { id: 'notes', name: 'Notas', icon: FileText, bgColor: '#FEF3C7', iconColor: '#D97706', desc: 'Notas y apuntes personales' },
  { id: 'contacts', name: 'Contactos', icon: Users, bgColor: '#FEE2E2', iconColor: '#DC2626', desc: 'Buscador de red empresarial y contactos' },
  { id: 'files', name: 'Almacenamiento', icon: Folder, bgColor: '#ECFDF5', iconColor: '#059669', desc: 'Archivos y firma digital de documentos' },
  { id: 'calendar', name: 'Agenda', icon: Calendar, bgColor: '#F3E8FF', iconColor: '#7C3AED', desc: 'Agenda de reuniones y eventos' },
  { id: 'chat', name: 'Chat', icon: MessageCircle, bgColor: '#E8F5E9', iconColor: '#2E7D32', desc: 'Mensajes, historias y llamadas' },
];

/** Modules the user can turn on/off and reorder ("Todas" is always first) */
export const CUSTOMIZABLE_MODULES = MODULES_POOL.filter((m) => !m.isOverview);

export const getModule = (id: string) => MODULES_POOL.find((m) => m.id === id);
