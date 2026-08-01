export interface Invitee {
  id: string;
  name: string;
  initials: string;
  color: string;
  status: 'accepted' | 'pending' | 'declined';
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'meeting' | 'event';
  date: string; // YYYY-MM-DD format
  timeStart: string; // HH:MM format
  timeEnd: string; // HH:MM format
  duration: string; // e.g. "45 min", "1 hora"
  isVirtual: boolean;
  videoUrl?: string;
  location?: string;
  description: string;
  reminder: string;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly';
  organizer?: { name: string; initials: string; color: string };
  userResponse?: 'accepted' | 'maybe' | 'declined' | 'pending';
  invitees: Invitee[];
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

export const MOCK_CONTACTS: Omit<Invitee, 'status'>[] = [
  { id: 'c1', name: 'Carlos Mendoza', initials: 'CM', color: '#EBF5FF' },
  { id: 'c2', name: 'Eduardo Torres', initials: 'ET', color: '#FEF3C7' },
  { id: 'c3', name: 'María Gómez', initials: 'MG', color: '#ECFDF5' },
  { id: 'c4', name: 'Sofía Castro', initials: 'SC', color: '#F3E8FF' },
  { id: 'd1', name: 'Alejandro Ruiz', initials: 'AR', color: '#E0F2FE' },
  { id: 'd2', name: 'Laura Ramos', initials: 'LR', color: '#FEE2E2' },
];

const todayObj = new Date();
const tomorrowObj = new Date(todayObj);
tomorrowObj.setDate(todayObj.getDate() + 1);

const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const TODAY_STR = formatDate(todayObj);
export const TOMORROW_STR = formatDate(tomorrowObj);

export let initialEvents: CalendarEvent[] = [
  {
    id: 'e1',
    title: 'Sincronización semanal de equipo',
    type: 'meeting',
    date: TODAY_STR,
    timeStart: '14:00',
    timeEnd: '14:45',
    duration: '45 min',
    isVirtual: true,
    videoUrl: 'https://video.beeapp.ai/meet/m-sem-team',
    description: 'Revisión semanal de los sprints activos, cuellos de botella y metas comerciales.',
    reminder: '30 minutos antes',
    repeat: 'weekly',
    organizer: { name: 'Santiago V.', initials: 'SV', color: '#DBEAFE' },
    userResponse: 'pending',
    invitees: [
      { id: 'c1', name: 'Carlos Mendoza', initials: 'CM', color: '#EBF5FF', status: 'accepted' },
      { id: 'c2', name: 'Eduardo Torres', initials: 'ET', color: '#FEF3C7', status: 'pending' },
      { id: 'c3', name: 'María Gómez', initials: 'MG', color: '#ECFDF5', status: 'accepted' },
    ],
  },
  {
    id: 'e2',
    title: 'Presentación de resultados Q2',
    type: 'event',
    date: TOMORROW_STR,
    timeStart: '10:00',
    timeEnd: '11:00',
    duration: '1 hora',
    isVirtual: false,
    location: 'Oficina Principal',
    description: 'Presentación de resultados financieros y operativos correspondientes al segundo trimestre.',
    reminder: '1 hora antes',
    repeat: 'none',
    organizer: { name: 'Sofía Castro', initials: 'SC', color: '#F3E8FF' },
    userResponse: 'accepted',
    invitees: [
      { id: 'c1', name: 'Carlos Mendoza', initials: 'CM', color: '#EBF5FF', status: 'accepted' },
      { id: 'c3', name: 'María Gómez', initials: 'MG', color: '#ECFDF5', status: 'accepted' },
      { id: 'c4', name: 'Sofía Castro', initials: 'SC', color: '#F3E8FF', status: 'pending' },
    ],
  },
];

export const getEvents = () => initialEvents;
export const setEvents = (newEvents: CalendarEvent[]) => {
  initialEvents = newEvents;
};
