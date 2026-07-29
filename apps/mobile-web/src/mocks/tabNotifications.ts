export interface TickerNotification {
  id: string;
  type: 'mail' | 'chat' | 'notes' | 'storage' | 'calendar';
  message: string;
  timestamp: string;
  read: boolean;
}

export const LEFT_TAB_NOTIFICATIONS: TickerNotification[] = [
  { id: '1', type: 'mail', message: 'Nuevo correo de Juan Pérez', timestamp: 'Hace 5m', read: false },
  { id: '2', type: 'notes', message: 'Nota compartida: Requisitos de Diseño', timestamp: 'Hace 20m', read: false },
  { id: '3', type: 'storage', message: 'Documento firmado: Contrato.pdf', timestamp: 'Hace 1h', read: true },
  { id: '4', type: 'calendar', message: 'Reunión en 15 minutos con Equipo AI', timestamp: 'Hace 2h', read: false },
];

export const RIGHT_TAB_NOTIFICATIONS: TickerNotification[] = [
  { id: '1', type: 'chat', message: 'Carlos: ¿Revisaste el catálogo?', timestamp: 'Hace 2m', read: false },
  { id: '2', type: 'chat', message: 'Grupo Tech: Nueva actualización disponible', timestamp: 'Hace 15m', read: false },
  { id: '3', type: 'chat', message: 'Asistente IA: 3 respuestas enviadas hoy', timestamp: 'Hace 45m', read: true },
];
