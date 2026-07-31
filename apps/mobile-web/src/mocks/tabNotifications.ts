export interface TickerNotification {
  id: string;
  type: 'mail' | 'chat' | 'notes' | 'storage' | 'calendar' | 'call';
  title?: string;
  message: string;
  timestamp: string;
  read: boolean;
  sender?: string;
  initials?: string;
  chatId?: string;
}

export const LEFT_TAB_NOTIFICATIONS: TickerNotification[] = [
  {
    id: 'g1',
    type: 'mail',
    title: 'Nuevo correo corporativo',
    message: 'Eduardo Torres: Propuesta comercial para Q4',
    timestamp: 'Hace 5m',
    read: false,
  },
  {
    id: 'g2',
    type: 'calendar',
    title: 'Recordatorio de evento',
    message: 'Sincronización semanal en 15 minutos',
    timestamp: 'Hace 15m',
    read: false,
  },
  {
    id: 'g3',
    type: 'storage',
    title: 'Documento firmado',
    message: 'NDA_Consultor_Asociado.pdf firmado por Santiago V.',
    timestamp: 'Hace 1h',
    read: true,
  },
  {
    id: 'g4',
    type: 'notes',
    title: 'Nota actualizada',
    message: 'Ideas campaña de Marketing editada',
    timestamp: 'Hace 2h',
    read: false,
  },
];

export const RIGHT_TAB_NOTIFICATIONS: TickerNotification[] = [
  {
    id: 'c1',
    type: 'chat',
    sender: 'Mariana Gómez',
    initials: 'MG',
    message: '¿Revisaste el catálogo de BeeServices?',
    timestamp: '13:40',
    read: false,
    chatId: '3',
  },
  {
    id: 'c2',
    type: 'call',
    sender: 'Carlos Mendoza',
    initials: 'CM',
    message: 'Llamada perdida',
    timestamp: '14:32',
    read: false,
    chatId: '1',
  },
  {
    id: 'c3',
    type: 'chat',
    sender: 'Equipo de Desarrollo',
    initials: 'ED',
    message: 'Sprint review agendado para mañana',
    timestamp: '12:15',
    read: true,
    chatId: '2',
  },
];
