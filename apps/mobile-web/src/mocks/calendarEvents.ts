export interface CalendarEventItem {
  id: string;
  title: string;
  time: string;
  type: 'meeting' | 'task' | 'reminder';
  meetUrl?: string;
  attendeesCount?: number;
  dateStr: string;
}

export const MOCK_CALENDAR_EVENTS: CalendarEventItem[] = [
  {
    id: 'ev-1',
    title: 'Reunión de Alineación de Producto',
    time: '09:00 AM - 10:00 AM',
    type: 'meeting',
    meetUrl: 'https://meet.google.com/abc-defg-hij',
    attendeesCount: 4,
    dateStr: '2026-07-28',
  },
  {
    id: 'ev-2',
    title: 'Revisión de Catálogo BeeServices',
    time: '11:30 AM - 12:00 PM',
    type: 'task',
    dateStr: '2026-07-28',
  },
  {
    id: 'ev-3',
    title: 'Demostración del Asistente de IA por Voz',
    time: '02:30 PM - 03:15 PM',
    type: 'meeting',
    meetUrl: 'https://meet.google.com/xyz-uvwx-rst',
    attendeesCount: 6,
    dateStr: '2026-07-28',
  },
  {
    id: 'ev-4',
    title: 'Envío de reporte mensual de usuarios',
    time: '04:30 PM - 05:00 PM',
    type: 'reminder',
    dateStr: '2026-07-28',
  },
  {
    id: 'ev-5',
    title: 'Planificación de sprint Q3',
    time: '10:00 AM - 11:30 AM',
    type: 'meeting',
    meetUrl: 'https://meet.google.com/prs-tuvw-xyz',
    attendeesCount: 8,
    dateStr: '2026-07-29',
  },
];
