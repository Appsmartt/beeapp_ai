export interface Invitee {
  name: string;
  initials: string;
  color: string;
  status?: 'accepted' | 'pending' | 'declined';
}

export interface CalendarEventItem {
  id: string;
  title: string;
  time: string;
  type: 'meeting' | 'task' | 'reminder';
  duration?: string;
  location?: string;
  description?: string;
  meetUrl?: string;
  attendeesCount?: number;
  dateStr: string;
  reminder?: string;
  organizer?: { name: string; initials: string; color: string };
  userResponse?: 'accepted' | 'maybe' | 'declined' | 'pending';
  invitees?: Invitee[];
}

export const REMINDER_OPTIONS = [
  'Sin recordatorio',
  '5 minutos antes',
  '15 minutos antes',
  '30 minutos antes',
  '1 hora antes',
  '2 horas antes',
  '6 horas antes',
  '1 día antes',
  '2 días antes',
] as const;

export const MOCK_CALENDAR_EVENTS: CalendarEventItem[] = [
  {
    id: 'ev-1',
    title: 'Reunión de Alineación de Producto',
    time: '09:00 AM - 10:00 AM',
    duration: '1 hora',
    location: 'Virtual (Meet)',
    description: 'Revisión semanal de avances del producto y definición de metas comerciales.',
    type: 'meeting',
    meetUrl: 'https://meet.google.com/abc-defg-hij',
    attendeesCount: 4,
    dateStr: '2026-07-28',
    reminder: '30 minutos antes',
    organizer: { name: 'Santiago V.', initials: 'SV', color: '#DBEAFE' },
    userResponse: 'pending',
    invitees: [
      { name: 'Carlos Mendoza', initials: 'CM', color: '#EBF5FF', status: 'accepted' },
      { name: 'Eduardo Torres', initials: 'ET', color: '#FEF3C7', status: 'pending' },
      { name: 'María Gómez', initials: 'MG', color: '#ECFDF5', status: 'accepted' },
    ],
  },
  {
    id: 'ev-2',
    title: 'Revisión de Catálogo BeeServices',
    time: '11:30 AM - 12:00 PM',
    duration: '30 min',
    location: 'Oficina Principal',
    description: 'Actualización de ítems y precios en el catálogo de servicios.',
    type: 'task',
    dateStr: '2026-07-28',
    reminder: '15 minutos antes',
    organizer: { name: 'Sofía Castro', initials: 'SC', color: '#F3E8FF' },
    userResponse: 'accepted',
    invitees: [
      { name: 'Sofía Castro', initials: 'SC', color: '#F3E8FF', status: 'accepted' },
    ],
  },
  {
    id: 'ev-3',
    title: 'Demostración del Asistente de IA por Voz',
    time: '02:30 PM - 03:15 PM',
    duration: '45 min',
    location: 'Virtual (Meet)',
    description: 'Prueba interactiva del asistente por voz con el equipo directivo.',
    type: 'meeting',
    meetUrl: 'https://meet.google.com/xyz-uvwx-rst',
    attendeesCount: 6,
    dateStr: '2026-07-28',
    reminder: '1 hora antes',
    organizer: { name: 'Santiago V.', initials: 'SV', color: '#DBEAFE' },
    userResponse: 'maybe',
    invitees: [
      { name: 'Carlos Mendoza', initials: 'CM', color: '#EBF5FF', status: 'accepted' },
      { name: 'María Gómez', initials: 'MG', color: '#ECFDF5', status: 'declined' },
    ],
  },
  {
    id: 'ev-4',
    title: 'Envío de reporte mensual de usuarios',
    time: '04:30 PM - 05:00 PM',
    duration: '30 min',
    description: 'Consolidación de métricas de retención y nuevos registros.',
    type: 'reminder',
    dateStr: '2026-07-28',
    reminder: 'Sin recordatorio',
  },
  {
    id: 'ev-5',
    title: 'Planificación de sprint Q3',
    time: '10:00 AM - 11:30 AM',
    duration: '1h 30m',
    location: 'Virtual (Meet)',
    description: 'Definición de épicas y tareas para el próximo ciclo de desarrollo.',
    type: 'meeting',
    meetUrl: 'https://meet.google.com/prs-tuvw-xyz',
    attendeesCount: 8,
    dateStr: '2026-07-29',
    reminder: '1 día antes',
  },
];
