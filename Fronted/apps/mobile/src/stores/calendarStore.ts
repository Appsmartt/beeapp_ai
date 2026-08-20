import type {
  Calendar,
  CalendarPreferences,
} from '@beeapp/shared-types';


export type CalendarEventType =
  | 'meeting'
  | 'event';


export type CalendarEventSource =
  | 'beeapp'
  | 'google'
  | 'microsoft'
  | 'external';


export type CalendarRepeat =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';


export interface Invitee {
  id: string;
  userId: string | null;
  name: string;
  initials: string;
  color: string;
  status: 'accepted' | 'pending' | 'declined';
  isOrganizer?: boolean;
}


export interface CalendarEvent {
  id: string;
  calendarId: string;
  organizerId: string;
  source: CalendarEventSource;
  title: string;
  type: CalendarEventType;
  backendKind: 'virtual' | 'in_person' | 'hybrid';
  color: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  duration: string;
  isAllDay: boolean;
  isVirtual: boolean;
  videoUrl?: string;
  location?: string;
  locationAddress?: string;
  locationMapsUrl?: string;
  description: string;
  reminder: string;
  reminderMinutes: number | null;
  repeat: CalendarRepeat;
  recurrenceRule?: string;
  organizer?: {
    id: string;
    name: string;
    initials: string;
    color: string;
  };
  userResponse?: 'accepted' | 'declined' | 'pending';
  canManage: boolean;
  isPrivate: boolean;
  notificationsEnabled: boolean;
  timezone: string;
  invitees: Invitee[];
  createdAt: string;
  updatedAt: string;
}


export interface CalendarCache {
  events: CalendarEvent[];
  calendars: Calendar[];
  preferences: CalendarPreferences | null;
  rangeStart: string | null;
  rangeEnd: string | null;
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


const today = new Date();


function formatDate(
  date: Date,
): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');
  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}


export const TODAY_STR = formatDate(today);


let cache: CalendarCache = {
  events: [],
  calendars: [],
  preferences: null,
  rangeStart: null,
  rangeEnd: null,
};


export function getCalendarEvents(): CalendarEvent[] {
  return cache.events;
}


export function setCalendarEvents(
  events: CalendarEvent[],
): void {
  cache = {
    ...cache,
    events,
  };
}


export function getCalendarCache(): CalendarCache {
  return cache;
}


export function setCalendarCache(
  nextCache: CalendarCache,
): void {
  cache = nextCache;
}


export function getCalendarEventById(
  eventId: string,
): CalendarEvent | undefined {
  return cache.events.find(
    (event) => event.id === eventId,
  );
}


export function upsertCalendarEvent(
  nextEvent: CalendarEvent,
): void {
  const currentIndex = cache.events.findIndex(
    (event) => event.id === nextEvent.id,
  );

  if (currentIndex === -1) {
    cache = {
      ...cache,
      events: [
        nextEvent,
        ...cache.events,
      ],
    };

    return;
  }

  cache = {
    ...cache,
    events: cache.events.map((event) =>
      event.id === nextEvent.id
        ? nextEvent
        : event,
    ),
  };
}


export function removeCalendarEvent(
  eventId: string,
): void {
  cache = {
    ...cache,
    events: cache.events.filter(
      (event) => event.id !== eventId,
    ),
  };
}


export function getPreferredCalendar(): Calendar | null {
  if (cache.calendars.length === 0) {
    return null;
  }

  return (
    cache.calendars.find(
      (calendar) =>
        calendar.is_default
        && calendar.share_permission === 'owner',
    )
    || cache.calendars.find(
      (calendar) =>
        calendar.share_permission === 'owner',
    )
    || cache.calendars[0]
    || null
  );
}