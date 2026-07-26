import { Mail, FileText, Users, Folder, Calendar, MessageCircle, Store } from 'lucide-react-native';

// Módulos disponibles para los accesos rápidos personalizables del home.
// Cada uno se abre EMBEBIDO dentro del Home (nunca navega a otra ruta).
export const MODULES_POOL = [
  { id: 'mail', name: 'Correos', icon: Mail, bgColor: '#EBF5FF', iconColor: '#1E88E5', desc: 'Bandeja de entrada y correos' },
  { id: 'notes', name: 'Notas', icon: FileText, bgColor: '#FEF3C7', iconColor: '#D97706', desc: 'Notas y apuntes personales' },
  { id: 'contacts', name: 'Contactos', icon: Users, bgColor: '#FEE2E2', iconColor: '#DC2626', desc: 'Buscador de red empresarial y contactos' },
  { id: 'files', name: 'Almacenamiento', icon: Folder, bgColor: '#ECFDF5', iconColor: '#059669', desc: 'Archivos y firma digital de documentos' },
  { id: 'calendar', name: 'Agenda', icon: Calendar, bgColor: '#F3E8FF', iconColor: '#7C3AED', desc: 'Agenda de reuniones y eventos' },
  { id: 'chat', name: 'Chat', icon: MessageCircle, bgColor: '#E8F5E9', iconColor: '#2E7D32', desc: 'Mensajes, historias y llamadas' },
  { id: 'beeservices', name: 'BeeServices', icon: Store, bgColor: '#F3E8FF', iconColor: '#7C3AED', desc: 'Marketplace de productos y servicios' },
];
