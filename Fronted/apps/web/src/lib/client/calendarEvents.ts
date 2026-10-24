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

export { loadCalendarReminderOptions } from '@/lib/client/publicAppSettings';
