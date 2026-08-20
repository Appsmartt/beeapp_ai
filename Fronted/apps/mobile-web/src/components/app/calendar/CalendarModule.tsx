'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import {
  createCurrentWebCalendarEvent,
  deleteCurrentWebCalendarEvent,
  getCurrentWebCalendarBootstrap,
  getCurrentWebCalendarConflicts,
  respondCurrentWebCalendarEvent,
  updateCurrentWebCalendarEvent,
} from '@beeapp/api-client';
import type {
  Calendar,
  CalendarConflict,
  CalendarEvent,
  CalendarEventKind,
  CalendarPreferences,
  CreateCalendarEventPayload,
} from '@beeapp/shared-types';

import ModuleNotificationBell from '../ModuleNotificationBell';

type CalendarFilter =
  | 'all'
  | 'upcoming'
  | 'past'
  | 'meetings'
  | 'events';

type EventFormValues = {
  calendarId: string;
  title: string;
  description: string;
  eventKind: CalendarEventKind;
  color: string;
  isAllDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  locationName: string;
  locationAddress: string;
  meetingUrl: string;
  notificationsEnabled: boolean;
};

const CALENDAR_COLORS = [
  '#6025D2',
  '#2563EB',
  '#0891B2',
  '#059669',
  '#65A30D',
  '#CA8A04',
  '#EA580C',
  '#DC2626',
  '#DB2777',
  '#9333EA',
  '#475569',
];

const FILTERS: {
  id: CalendarFilter;
  label: string;
}[] = [
  {
    id: 'all',
    label: 'Todos',
  },
  {
    id: 'upcoming',
    label: 'Próximos',
  },
  {
    id: 'past',
    label: 'Pasados',
  },
  {
    id: 'meetings',
    label: 'Reuniones',
  },
  {
    id: 'events',
    label: 'Eventos',
  },
];

function padNumber(
  value: number,
): string {
  return String(value).padStart(2, '0');
}

function formatDateKey(
  date: Date,
): string {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join('-');
}

function parseDateKey(
  value: string,
): Date {
  const [year, month, day] = value
    .split('-')
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0,
  );
}

function formatMonthLabel(
  date: Date,
): string {
  return date.toLocaleDateString(
    'es-CO',
    {
      month: 'long',
      year: 'numeric',
    },
  );
}

function formatSelectedDate(
  date: Date,
): string {
  return date.toLocaleDateString(
    'es-CO',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  );
}

function getMonthRange(
  monthDate: Date,
): {
  range_start: string;
  range_end: string;
} {
  const rangeStart = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );

  const rangeEnd = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    1,
    0,
    0,
    0,
    0,
  );

  return {
    range_start: rangeStart.toISOString(),
    range_end: rangeEnd.toISOString(),
  };
}

function getCalendarDays(
  visibleMonth: Date,
): Date[] {
  const firstDayOfMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  );

  const mondayOffset =
    (firstDayOfMonth.getDay() + 6) % 7;

  const gridStart = new Date(firstDayOfMonth);

  gridStart.setDate(
    firstDayOfMonth.getDate() - mondayOffset,
  );

  return Array.from(
    {
      length: 42,
    },
    (_, index) => {
      const nextDay = new Date(gridStart);

      nextDay.setDate(gridStart.getDate() + index);

      return nextDay;
    },
  );
}

function isSameDate(
  firstDate: Date,
  secondDate: Date,
): boolean {
  return (
    firstDate.getFullYear() === secondDate.getFullYear()
    && firstDate.getMonth() === secondDate.getMonth()
    && firstDate.getDate() === secondDate.getDate()
  );
}

function getEventStartDate(
  event: CalendarEvent,
): Date | null {
  const sourceValue = event.is_all_day
    ? event.starts_on
    : event.starts_at;

  if (!sourceValue) {
    return null;
  }

  const eventDate = event.is_all_day
    ? parseDateKey(sourceValue)
    : new Date(sourceValue);

  return Number.isNaN(eventDate.getTime())
    ? null
    : eventDate;
}

function getEventEndDate(
  event: CalendarEvent,
): Date | null {
  const sourceValue = event.is_all_day
    ? event.ends_on
    : event.ends_at;

  if (!sourceValue) {
    return null;
  }

  const eventDate = event.is_all_day
    ? parseDateKey(sourceValue)
    : new Date(sourceValue);

  return Number.isNaN(eventDate.getTime())
    ? null
    : eventDate;
}

function eventOverlapsDay(
  event: CalendarEvent,
  date: Date,
): boolean {
  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );

  const nextDay = new Date(dayStart);

  nextDay.setDate(dayStart.getDate() + 1);

  if (event.is_all_day) {
    if (!event.starts_on || !event.ends_on) {
      return false;
    }

    const eventStart = parseDateKey(event.starts_on);
    const eventEnd = parseDateKey(event.ends_on);

    return (
      eventStart < nextDay
      && eventEnd > dayStart
    );
  }

  const eventStart = getEventStartDate(event);
  const eventEnd = getEventEndDate(event);

  if (!eventStart || !eventEnd) {
    return false;
  }

  return (
    eventStart < nextDay
    && eventEnd > dayStart
  );
}

function formatEventTime(
  event: CalendarEvent,
): string {
  if (event.is_all_day) {
    return 'Todo el día';
  }

  const start = getEventStartDate(event);
  const end = getEventEndDate(event);

  if (!start || !end) {
    return 'Horario no disponible';
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  return `${start.toLocaleTimeString(
    'es-CO',
    timeOptions,
  )} – ${end.toLocaleTimeString(
    'es-CO',
    timeOptions,
  )}`;
}

function formatEventDayTime(
  event: CalendarEvent,
): string {
  if (event.is_all_day) {
    return 'Todo el día';
  }

  const eventStart = getEventStartDate(event);

  if (!eventStart) {
    return 'Horario no disponible';
  }

  return eventStart.toLocaleTimeString(
    'es-CO',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

function getMeetingUrl(
  event: CalendarEvent,
): string | null {
  const primaryConference = event.conferences?.find(
    (conference) => conference.is_primary,
  );

  if (primaryConference?.join_url) {
    return primaryConference.join_url;
  }

  const conference = event.conferences?.find(
    (item) => Boolean(item.join_url),
  );

  if (conference?.join_url) {
    return conference.join_url;
  }

  if (event.location_maps_url) {
    return event.location_maps_url;
  }

  return null;
}

function getDurationLabel(
  event: CalendarEvent,
): string | null {
  if (event.is_all_day) {
    return null;
  }

  const start = getEventStartDate(event);
  const end = getEventEndDate(event);

  if (!start || !end) {
    return null;
  }

  const durationMinutes = Math.max(
    0,
    Math.round(
      (end.getTime() - start.getTime()) / 60_000,
    ),
  );

  if (durationMinutes < 60) {
    return `${durationMinutes} min`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return minutes
    ? `${hours} h ${minutes} min`
    : `${hours} h`;
}

function isMeeting(
  event: CalendarEvent,
): boolean {
  return (
    event.event_kind === 'virtual'
    || event.event_kind === 'hybrid'
    || Boolean(getMeetingUrl(event))
  );
}

function getInitials(
  value: string,
): string {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  return initials || '?';
}

function isoToFormDateTime(
  value: string | null,
): {
  date: string;
  time: string;
} {
  if (!value) {
    return {
      date: '',
      time: '',
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: '',
      time: '',
    };
  }

  return {
    date: formatDateKey(date),
    time: [
      padNumber(date.getHours()),
      padNumber(date.getMinutes()),
    ].join(':'),
  };
}

function buildTimedIso(
  dateValue: string,
  timeValue: string,
): string {
  return new Date(
    `${dateValue}T${timeValue || '00:00'}:00`,
  ).toISOString();
}

function getInitialEventForm(
  selectedDate: Date,
  defaultCalendarId: string,
  preferences: CalendarPreferences | null,
): EventFormValues {
  const selectedDateKey = formatDateKey(selectedDate);

  return {
    calendarId: defaultCalendarId,
    title: '',
    description: '',
    eventKind: preferences?.default_event_kind || 'in_person',
    color: preferences?.default_event_color || '#6025D2',
    isAllDay: false,
    startDate: selectedDateKey,
    startTime: '09:00',
    endDate: selectedDateKey,
    endTime: '10:00',
    locationName: '',
    locationAddress: '',
    meetingUrl: '',
    notificationsEnabled: true,
  };
}

function getEventFormValues(
  event: CalendarEvent,
): EventFormValues {
  const startsAt = isoToFormDateTime(event.starts_at);
  const endsAt = isoToFormDateTime(event.ends_at);

  return {
    calendarId: event.calendar_id,
    title: event.title,
    description: event.description || '',
    eventKind: event.event_kind,
    color: event.color,
    isAllDay: event.is_all_day,
    startDate: event.is_all_day
      ? event.starts_on || ''
      : startsAt.date,
    startTime: startsAt.time || '09:00',
    endDate: event.is_all_day
      ? event.ends_on || ''
      : endsAt.date,
    endTime: endsAt.time || '10:00',
    locationName: event.location_name || '',
    locationAddress: event.location_address || '',
    meetingUrl: getMeetingUrl(event) || '',
    notificationsEnabled: event.notifications_enabled,
  };
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

export default function CalendarModule() {
  const today = useMemo(
    () => new Date(),
    [],
  );

  const [visibleMonth, setVisibleMonth] =
    useState(
      () => new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ),
    );

  const [selectedDate, setSelectedDate] =
    useState(today);

  const [events, setEvents] = useState<
    CalendarEvent[]
  >([]);

  const [calendars, setCalendars] = useState<
    Calendar[]
  >([]);

  const [preferences, setPreferences] =
    useState<CalendarPreferences | null>(null);

  const [filter, setFilter] =
    useState<CalendarFilter>('all');

  const [selectedEventId, setSelectedEventId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [eventModalOpen, setEventModalOpen] =
    useState(false);

  const [editingEvent, setEditingEvent] =
    useState<CalendarEvent | null>(null);

  const [conflicts, setConflicts] = useState<
    CalendarConflict[]
  >([]);

  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth],
  );

  const loadCalendar = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        setErrorMessage(null);

        const range = getMonthRange(visibleMonth);

        const response =
          await getCurrentWebCalendarBootstrap(range);

        setEvents(response.events);
        setCalendars(response.calendars);
        setPreferences(response.preferences);

        setSelectedEventId((currentId) => (
          response.events.some(
            (event) => event.id === currentId,
          )
            ? currentId
            : null
        ));
      } catch (error) {
        setErrorMessage(
          getErrorMessage(
            error,
            'No fue posible cargar la Agenda.',
          ),
        );
        setEvents([]);
        setCalendars([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [visibleMonth],
  );

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const showSuccess = (
    message: string,
  ) => {
    setErrorMessage(null);
    setSuccessMessage(message);

    window.setTimeout(() => {
      setSuccessMessage((current) => (
        current === message
          ? null
          : current
      ));
    }, 4_000);
  };

  const selectedEvent = useMemo(
    () => events.find(
      (event) => event.id === selectedEventId,
    ) || null,
    [
      events,
      selectedEventId,
    ],
  );

  const eventsForSelectedDate = useMemo(() => {
    const dateEvents = events.filter((event) =>
      eventOverlapsDay(event, selectedDate),
    );

    const now = new Date();

    const filtered = dateEvents.filter((event) => {
      if (filter === 'all') {
        return true;
      }

      if (filter === 'meetings') {
        return isMeeting(event);
      }

      if (filter === 'events') {
        return !isMeeting(event);
      }

      const eventEnd = getEventEndDate(event);
      const eventStart = getEventStartDate(event);

      if (!eventStart) {
        return false;
      }

      if (filter === 'past') {
        return Boolean(
          eventEnd
            ? eventEnd < now
            : eventStart < now,
        );
      }

      return Boolean(
        eventEnd
          ? eventEnd >= now
          : eventStart >= now,
      );
    });

    return [...filtered].sort((left, right) => {
      if (left.is_all_day !== right.is_all_day) {
        return left.is_all_day ? -1 : 1;
      }

      return (
        (getEventStartDate(left)?.getTime() || 0)
        - (getEventStartDate(right)?.getTime() || 0)
      );
    });
  }, [
    events,
    filter,
    selectedDate,
  ]);

  const eventsByDate = useMemo(() => {
    const result = new Map<string, CalendarEvent[]>();

    calendarDays.forEach((date) => {
      result.set(
        formatDateKey(date),
        events.filter((event) =>
          eventOverlapsDay(event, date),
        ),
      );
    });

    return result;
  }, [
    calendarDays,
    events,
  ]);

  const defaultCalendar = useMemo(
    () => calendars.find(
      (calendar) => (
        calendar.is_default
        && !calendar.is_archived
        && calendar.can_create_events !== false
      ),
    ) || calendars.find(
      (calendar) => (
        !calendar.is_archived
        && calendar.can_create_events !== false
      ),
    ) || null,
    [calendars],
  );

  const handlePreviousMonth = () => {
    setVisibleMonth((current) => new Date(
      current.getFullYear(),
      current.getMonth() - 1,
      1,
    ));
  };

  const handleNextMonth = () => {
    setVisibleMonth((current) => new Date(
      current.getFullYear(),
      current.getMonth() + 1,
      1,
    ));
  };

  const handleToday = () => {
    setVisibleMonth(new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    ));
    setSelectedDate(today);
  };

  const openCreateModal = () => {
    if (!defaultCalendar) {
      setErrorMessage(
        'No tienes un calendario disponible para crear eventos.',
      );
      return;
    }

    setEditingEvent(null);
    setConflicts([]);
    setEventModalOpen(true);
  };

  const openEditModal = (
    event: CalendarEvent,
  ) => {
    if (
      event.source !== 'beeapp'
      || event.can_edit === false
    ) {
      setErrorMessage(
        'Los eventos sincronizados o de solo lectura no se pueden editar desde BeeApp.',
      );
      return;
    }

    setEditingEvent(event);
    setConflicts([]);
    setEventModalOpen(true);
  };

  const handleSaveEvent = async (
    values: EventFormValues,
  ) => {
    if (!values.title.trim()) {
      throw new Error(
        'Ingresa un título para el evento.',
      );
    }

    if (!values.calendarId) {
      throw new Error(
        'Selecciona un calendario.',
      );
    }

    const payload: CreateCalendarEventPayload = {
      calendar_id: values.calendarId,
      title: values.title.trim(),
      description: values.description.trim() || null,
      event_kind: values.eventKind,
      color: values.color,
      is_all_day: values.isAllDay,
      timezone: preferences?.timezone || 'America/Bogota',
      location_name: values.locationName.trim() || null,
      location_address: values.locationAddress.trim() || null,
      is_private: false,
      notifications_enabled: values.notificationsEnabled,
      tag_ids: [],
      attendee_ids: [],
      reminders: [],
      recurrence: null,
      conferences: values.meetingUrl.trim()
        ? [
          {
            provider: 'external',
            label: 'Videollamada',
            join_url: values.meetingUrl.trim(),
            is_primary: true,
          },
        ]
        : [],
      starts_at: null,
      ends_at: null,
      starts_on: null,
      ends_on: null,
    };

    if (values.isAllDay) {
      if (!values.startDate || !values.endDate) {
        throw new Error(
          'Selecciona la fecha de inicio y finalización.',
        );
      }

      const startDate = parseDateKey(values.startDate);
      const endDate = parseDateKey(values.endDate);

      if (endDate <= startDate) {
        throw new Error(
          'La fecha final debe ser posterior a la fecha inicial.',
        );
      }

      payload.starts_on = values.startDate;
      payload.ends_on = values.endDate;
    } else {
      if (
        !values.startDate
        || !values.startTime
        || !values.endDate
        || !values.endTime
      ) {
        throw new Error(
          'Completa la fecha y hora de inicio y finalización.',
        );
      }

      const startsAt = buildTimedIso(
        values.startDate,
        values.startTime,
      );

      const endsAt = buildTimedIso(
        values.endDate,
        values.endTime,
      );

      if (
        new Date(endsAt).getTime()
        <= new Date(startsAt).getTime()
      ) {
        throw new Error(
          'La hora de finalización debe ser posterior al inicio.',
        );
      }

      payload.starts_at = startsAt;
      payload.ends_at = endsAt;
    }

    try {
      setSaving(true);
      setConflicts([]);

      const conflictResponse =
        await getCurrentWebCalendarConflicts({
          is_all_day: values.isAllDay,
          starts_at: payload.starts_at,
          ends_at: payload.ends_at,
          starts_on: payload.starts_on,
          ends_on: payload.ends_on,
          exclude_event_id: editingEvent?.id,
        });

      setConflicts(conflictResponse.conflicts);

      if (editingEvent) {
        await updateCurrentWebCalendarEvent(
          editingEvent.id,
          {
            ...payload,
          },
        );

        showSuccess(
          'Evento actualizado correctamente.',
        );
      } else {
        await createCurrentWebCalendarEvent(payload);

        showSuccess(
          'Evento creado correctamente.',
        );
      }

      setEventModalOpen(false);
      setEditingEvent(null);

      await loadCalendar(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    event: CalendarEvent,
  ) => {
    if (
      event.source !== 'beeapp'
      || event.can_delete === false
    ) {
      setErrorMessage(
        'Este evento no se puede eliminar desde BeeApp.',
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Deseas eliminar “${event.title}”?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);

      await deleteCurrentWebCalendarEvent(event.id);

      setSelectedEventId(null);
      showSuccess('Evento eliminado correctamente.');

      await loadCalendar(true);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          'No fue posible eliminar el evento.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRsvp = async (
    responseStatus: 'accepted' | 'declined',
  ) => {
    if (!selectedEvent) {
      return;
    }

    try {
      setSaving(true);

      await respondCurrentWebCalendarEvent(
        selectedEvent.id,
        responseStatus,
      );

      showSuccess(
        responseStatus === 'accepted'
          ? 'Confirmaste tu asistencia.'
          : 'Rechazaste la invitación.',
      );

      await loadCalendar(true);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          'No fue posible actualizar tu respuesta.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-full select-none bg-white">
      <aside className="flex w-14 shrink-0 flex-col items-center justify-between border-r border-neutral-200 bg-white py-4">
        <div className="flex w-full flex-col items-center gap-2">
          {FILTERS.map((item) => {
            const isActive = filter === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                title={item.label}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 transition-colors ${
                  isActive
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                {item.id === 'all' ? (
                  <CalendarDays className="h-5 w-5" />
                ) : item.id === 'upcoming' ? (
                  <Clock3 className="h-5 w-5" />
                ) : item.id === 'past' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : item.id === 'meetings' ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <CalendarDays className="h-5 w-5" />
                )}

                {isActive ? (
                  <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-brand-primary" />
                ) : null}
              </button>
            );
          })}
        </div>

        <ModuleNotificationBell moduleId="calendar" />
      </aside>

      <section className="flex w-[410px] shrink-0 flex-col border-r border-neutral-200 bg-white xl:w-[460px]">
        <header className="space-y-3 border-b border-neutral-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-semibold text-neutral-900">
                Agenda
              </h1>

              <p className="mt-0.5 text-xs text-neutral-500">
                Organiza reuniones, compromisos y recordatorios.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void loadCalendar(true)}
                disabled={loading || refreshing || saving}
                title="Actualizar agenda"
                className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-primary disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? 'animate-spin'
                      : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="h-8 rounded-full border border-neutral-200 px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Hoy
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                disabled={saving}
                className="flex h-8 items-center gap-1 rounded-full bg-brand-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:bg-neutral-300"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nuevo</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePreviousMonth}
              title="Mes anterior"
              className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <h2 className="text-sm font-semibold capitalize text-neutral-900">
              {formatMonthLabel(visibleMonth)}
            </h2>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Mes siguiente"
              className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
            {[
              'Lun',
              'Mar',
              'Mié',
              'Jue',
              'Vie',
              'Sáb',
              'Dom',
            ].map((label) => (
              <div
                key={label}
                className="border-b border-neutral-200 py-1.5 text-center text-[9px] font-semibold uppercase text-neutral-400"
              >
                {label}
              </div>
            ))}

            {calendarDays.map((date) => {
              const dateKey = formatDateKey(date);
              const dayEvents = eventsByDate.get(dateKey) || [];
              const isCurrentMonth =
                date.getMonth() === visibleMonth.getMonth();

              const isSelected = isSameDate(
                date,
                selectedDate,
              );

              const isToday = isSameDate(
                date,
                today,
              );

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`relative min-h-12 border-b border-r border-neutral-200 p-1 text-center text-[10px] transition-colors ${
                    isSelected
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : isCurrentMonth
                        ? 'bg-white text-neutral-700 hover:bg-neutral-100'
                        : 'bg-neutral-50 text-neutral-400'
                  }`}
                >
                  <span
                    className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-brand-primary text-white'
                        : ''
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {dayEvents.length > 0 ? (
                    <div className="mt-1 flex justify-center gap-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: event.color,
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

              <p className="flex-1 text-[11px] text-red-700">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-sm font-semibold text-red-600"
                title="Cerrar error"
              >
                ×
              </button>
            </div>
          ) : null}

          {successMessage ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

              <p className="flex-1 text-[11px] text-emerald-700">
                {successMessage}
              </p>

              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-sm font-semibold text-emerald-600"
                title="Cerrar mensaje"
              >
                ×
              </button>
            </div>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-800">
                {formatSelectedDate(selectedDate)}
              </p>

              <p className="mt-0.5 text-[11px] text-neutral-500">
                {loading
                  ? 'Cargando eventos...'
                  : `${eventsForSelectedDate.length} evento(s)`}
              </p>
            </div>

            <span className="rounded-full bg-brand-primary/10 px-2 py-1 text-[10px] font-medium text-brand-primary">
              {FILTERS.find(
                (item) => item.id === filter,
              )?.label}
            </span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-xl bg-neutral-100"
                />
              ))}
            </div>
          ) : eventsForSelectedDate.length === 0 ? (
            <div className="space-y-3 py-16 text-center text-neutral-400">
              <CalendarDays className="mx-auto h-10 w-10 text-neutral-300" />

              <p className="text-xs">
                No hay eventos para este día.
              </p>

              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                Crear evento
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {eventsForSelectedDate.map((event) => {
                const isSelected =
                  selectedEventId === event.id;

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() =>
                      setSelectedEventId(event.id)
                    }
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary/10'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <span
                      className="h-10 w-1 shrink-0 rounded-full"
                      style={{
                        backgroundColor: event.color,
                      }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {event.title}
                        </p>

                        {event.source !== 'beeapp' ? (
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium uppercase text-neutral-500">
                            {event.source}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500">
                        <Clock3 className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {formatEventTime(event)}
                        </span>

                        {getDurationLabel(event) ? (
                          <>
                            <span>·</span>
                            <span>
                              {getDurationLabel(event)}
                            </span>
                          </>
                        ) : null}
                      </p>

                      {event.location_name ? (
                        <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-neutral-500">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {event.location_name}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <main className="flex min-w-0 flex-1 flex-col bg-neutral-50/50">
        {selectedEvent ? (
          <CalendarEventPanel
            event={selectedEvent}
            saving={saving}
            onBack={() => setSelectedEventId(null)}
            onEdit={() => openEditModal(selectedEvent)}
            onDelete={() => {
              void handleDelete(selectedEvent);
            }}
            onRsvp={(responseStatus) => {
              void handleRsvp(responseStatus);
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-12 text-center">
            <div className="max-w-sm space-y-3">
              <CalendarDays className="mx-auto h-12 w-12 text-neutral-300" />

              <h3 className="text-sm font-semibold text-neutral-700">
                Ningún evento seleccionado
              </h3>

              <p className="text-xs leading-relaxed text-neutral-500">
                Selecciona un evento de la lista para ver sus
                detalles, responder una invitación o editarlo.
              </p>
            </div>
          </div>
        )}
      </main>

      {eventModalOpen ? (
        <CalendarEventModal
          event={editingEvent}
          calendars={calendars.filter(
            (calendar) => (
              !calendar.is_archived
              && calendar.can_create_events !== false
            ),
          )}
          initialValues={
            editingEvent
              ? getEventFormValues(editingEvent)
              : getInitialEventForm(
                selectedDate,
                defaultCalendar?.id || '',
                preferences,
              )
          }
          conflicts={conflicts}
          saving={saving}
          onClose={() => {
            if (!saving) {
              setEventModalOpen(false);
              setEditingEvent(null);
              setConflicts([]);
            }
          }}
          onSave={handleSaveEvent}
        />
      ) : null}
    </div>
  );
}

function CalendarEventPanel({
  event,
  saving,
  onBack,
  onEdit,
  onDelete,
  onRsvp,
}: {
  event: CalendarEvent;
  saving: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRsvp: (
    responseStatus: 'accepted' | 'declined',
  ) => void;
}) {
  const meetingUrl = getMeetingUrl(event);
  const canEdit = (
    event.source === 'beeapp'
    && event.can_edit !== false
  );

  const canDelete = (
    event.source === 'beeapp'
    && event.can_delete !== false
  );

  const attendeeCount = event.attendees?.filter(
    (attendee) => attendee.response_status !== 'removed',
  ).length || 0;

  const organizerName = event.organizer_id
    ? `Organizador ${event.organizer_id.slice(0, 8)}`
    : 'Organizador BeeApp';

  return (
    <div className="flex min-h-full flex-col bg-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-1.5 text-neutral-600 transition-colors hover:bg-neutral-100"
          title="Volver"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h2 className="truncate px-4 text-sm font-semibold text-neutral-900">
          Detalle del evento
        </h2>

        <div className="flex items-center gap-1">
          {canEdit ? (
            <button
              type="button"
              onClick={onEdit}
              disabled={saving}
              className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
              title="Editar evento"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          ) : null}

          {canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="Eliminar evento"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="flex items-start gap-3 border-b border-neutral-100 pb-5">
          <span
            className="mt-1 h-11 w-1.5 shrink-0 rounded-full"
            style={{
              backgroundColor: event.color,
            }}
          />

          <div className="min-w-0">
            <h1 className="break-words text-lg font-semibold text-neutral-900">
              {event.title}
            </h1>

            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {formatEventTime(event)}
              </span>

              {getDurationLabel(event) ? (
                <span>
                  {getDurationLabel(event)}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        {event.source !== 'beeapp' ? (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
            Este evento se sincronizó desde{' '}
            <span className="font-semibold">
              {event.source === 'google'
                ? 'Google Calendar'
                : 'Microsoft Outlook'}
            </span>
            . Los cambios se administran desde la fuente original.
          </div>
        ) : null}

        {event.current_user_attendee ? (
          <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold text-neutral-800">
              ¿Asistirás a este evento?
            </p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onRsvp('accepted')}
                disabled={saving}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                  event.current_user_response === 'accepted'
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Aceptar
              </button>

              <button
                type="button"
                onClick={() => onRsvp('declined')}
                disabled={saving}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                  event.current_user_response === 'declined'
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-red-200 bg-white text-red-700 hover:bg-red-50'
                }`}
              >
                <X className="h-4 w-4" />
                Rechazar
              </button>
            </div>
          </section>
        ) : null}

        {meetingUrl ? (
          <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-primary">
              <Video className="h-4 w-4" />
              Videollamada
            </div>

            <p className="mt-2 break-all text-xs text-neutral-600">
              {meetingUrl}
            </p>

            <a
              href={meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-primary text-xs font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Unirse a la reunión
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </section>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <section className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Calendario
            </p>

            <p className="text-xs text-neutral-800">
              {event.calendar_id}
            </p>
          </section>

          <section className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Tipo
            </p>

            <p className="text-xs capitalize text-neutral-800">
              {event.event_kind.replace('_', ' ')}
            </p>
          </section>

          {event.location_name ? (
            <section className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Ubicación
              </p>

              <p className="flex items-start gap-1.5 text-xs text-neutral-800">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span>
                  {event.location_name}
                </span>
              </p>
            </section>
          ) : null}

          <section className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Organizador
            </p>

            <p className="text-xs text-neutral-800">
              {organizerName}
            </p>
          </section>
        </div>

        {event.description ? (
          <section className="border-t border-neutral-100 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Descripción
            </p>

            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-neutral-700">
              {event.description}
            </p>
          </section>
        ) : null}

        {attendeeCount > 0 ? (
          <section className="border-t border-neutral-100 pt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
              <Users className="h-4 w-4 text-neutral-500" />
              Participantes ({attendeeCount})
            </div>

            <div className="mt-3 space-y-2">
              {event.attendees?.filter(
                (attendee) =>
                  attendee.response_status !== 'removed',
              ).map((attendee) => {
                const label = attendee.is_organizer
                  ? 'Organizador'
                  : attendee.response_status === 'accepted'
                    ? 'Aceptó'
                    : attendee.response_status === 'declined'
                      ? 'Rechazó'
                      : 'Pendiente';

                const displayName = attendee.external_display_name
                  || attendee.external_email
                  || attendee.attendee_user_id
                  || 'Usuario BeeApp';

                return (
                  <div
                    key={attendee.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-[10px] font-semibold text-brand-primary">
                        {getInitials(displayName)}
                      </span>

                      <span className="truncate text-xs text-neutral-800">
                        {displayName}
                      </span>
                    </div>

                    <span className="shrink-0 text-[10px] text-neutral-500">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function CalendarEventModal({
  event,
  calendars,
  initialValues,
  conflicts,
  saving,
  onClose,
  onSave,
}: {
  event: CalendarEvent | null;
  calendars: Calendar[];
  initialValues: EventFormValues;
  conflicts: CalendarConflict[];
  saving: boolean;
  onClose: () => void;
  onSave: (
    values: EventFormValues,
  ) => Promise<void>;
}) {
  const [values, setValues] = useState<EventFormValues>(
    initialValues,
  );

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const updateValue = <Key extends keyof EventFormValues>(
    key: Key,
    value: EventFormValues[Key],
  ) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async (
    submitEvent: FormEvent,
  ) => {
    submitEvent.preventDefault();

    try {
      setErrorMessage(null);

      await onSave(values);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          'No fue posible guardar el evento.',
        ),
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        disabled={saving}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      <form
        onSubmit={(submitEvent) => {
          void handleSubmit(submitEvent);
        }}
        className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              {event
                ? 'Editar evento'
                : 'Nuevo evento'}
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              Agrega un compromiso a tu agenda.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-xs text-red-700">
                {errorMessage}
              </p>
            </div>
          ) : null}

          {conflicts.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-semibold text-amber-800">
                Hay {conflicts.length} posible(s) conflicto(s).
              </p>

              <p className="mt-1 text-[11px] text-amber-700">
                Puedes guardar el evento, pero revisa que no se
                cruce con otro compromiso.
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              Calendario *
            </label>

            <select
              value={values.calendarId}
              disabled={saving || Boolean(event)}
              onChange={(inputEvent) => {
                updateValue(
                  'calendarId',
                  inputEvent.target.value,
                );
              }}
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-800 outline-none focus:border-brand-primary disabled:bg-neutral-100"
            >
              <option value="">
                Selecciona un calendario
              </option>

              {calendars.map((calendar) => (
                <option
                  key={calendar.id}
                  value={calendar.id}
                >
                  {calendar.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              Título *
            </label>

            <input
              autoFocus
              value={values.title}
              required
              disabled={saving}
              onChange={(inputEvent) => {
                updateValue(
                  'title',
                  inputEvent.target.value,
                );
              }}
              placeholder="Ej. Reunión de equipo"
              className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none transition-colors focus:border-brand-primary focus:bg-white disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Tipo
              </label>

              <select
                value={values.eventKind}
                disabled={saving}
                onChange={(inputEvent) => {
                  updateValue(
                    'eventKind',
                    inputEvent.target.value as CalendarEventKind,
                  );
                }}
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-800 outline-none focus:border-brand-primary disabled:opacity-50"
              >
                <option value="in_person">
                  Presencial
                </option>
                <option value="virtual">
                  Virtual
                </option>
                <option value="hybrid">
                  Híbrido
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Color
              </label>

              <div className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-2">
                {CALENDAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      updateValue('color', color)
                    }
                    disabled={saving}
                    className={`h-5 w-5 rounded-full transition-transform disabled:opacity-50 ${
                      values.color === color
                        ? 'scale-110 ring-2 ring-neutral-800 ring-offset-2'
                        : ''
                    }`}
                    style={{
                      backgroundColor: color,
                    }}
                    title={`Seleccionar color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-neutral-700">
                Todo el día
              </p>

              <p className="mt-0.5 text-[11px] text-neutral-500">
                No mostrará una hora específica.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                updateValue(
                  'isAllDay',
                  !values.isAllDay,
                )
              }
              disabled={saving}
              className={`relative h-6 w-10 rounded-full p-0.5 transition-colors disabled:opacity-50 ${
                values.isAllDay
                  ? 'bg-brand-primary'
                  : 'bg-neutral-300'
              }`}
              aria-label="Cambiar evento de todo el día"
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  values.isAllDay
                    ? 'translate-x-4'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Inicio *
              </label>

              <input
                type="date"
                value={values.startDate}
                required
                disabled={saving}
                onChange={(inputEvent) => {
                  updateValue(
                    'startDate',
                    inputEvent.target.value,
                  );
                }}
                className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-xs outline-none focus:border-brand-primary disabled:opacity-50"
              />

              {!values.isAllDay ? (
                <input
                  type="time"
                  value={values.startTime}
                  required
                  disabled={saving}
                  onChange={(inputEvent) => {
                    updateValue(
                      'startTime',
                      inputEvent.target.value,
                    );
                  }}
                  className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-xs outline-none focus:border-brand-primary disabled:opacity-50"
                />
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Finalización *
              </label>

              <input
                type="date"
                value={values.endDate}
                required
                disabled={saving}
                onChange={(inputEvent) => {
                  updateValue(
                    'endDate',
                    inputEvent.target.value,
                  );
                }}
                className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-xs outline-none focus:border-brand-primary disabled:opacity-50"
              />

              {!values.isAllDay ? (
                <input
                  type="time"
                  value={values.endTime}
                  required
                  disabled={saving}
                  onChange={(inputEvent) => {
                    updateValue(
                      'endTime',
                      inputEvent.target.value,
                    );
                  }}
                  className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-xs outline-none focus:border-brand-primary disabled:opacity-50"
                />
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              Ubicación
            </label>

            <input
              value={values.locationName}
              disabled={saving}
              onChange={(inputEvent) => {
                updateValue(
                  'locationName',
                  inputEvent.target.value,
                );
              }}
              placeholder="Ej. Sala de juntas o dirección"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-800 outline-none focus:border-brand-primary focus:bg-white disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              Dirección
            </label>

            <input
              value={values.locationAddress}
              disabled={saving}
              onChange={(inputEvent) => {
                updateValue(
                  'locationAddress',
                  inputEvent.target.value,
                );
              }}
              placeholder="Ej. Bogotá, Colombia"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-800 outline-none focus:border-brand-primary focus:bg-white disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              Enlace de videollamada
            </label>

            <input
              type="url"
              value={values.meetingUrl}
              disabled={saving}
              onChange={(inputEvent) => {
                updateValue(
                  'meetingUrl',
                  inputEvent.target.value,
                );
              }}
              placeholder="https://meet.google.com/..."
              className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-800 outline-none focus:border-brand-primary focus:bg-white disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              Descripción
            </label>

            <textarea
              value={values.description}
              rows={3}
              disabled={saving}
              onChange={(inputEvent) => {
                updateValue(
                  'description',
                  inputEvent.target.value,
                );
              }}
              placeholder="Información, objetivos o notas del evento."
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-800 outline-none focus:border-brand-primary focus:bg-white disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-neutral-700">
                Notificaciones
              </p>

              <p className="mt-0.5 text-[11px] text-neutral-500">
                Habilita recordatorios para este evento.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                updateValue(
                  'notificationsEnabled',
                  !values.notificationsEnabled,
                )
              }
              disabled={saving}
              className={`relative h-6 w-10 rounded-full p-0.5 transition-colors disabled:opacity-50 ${
                values.notificationsEnabled
                  ? 'bg-brand-primary'
                  : 'bg-neutral-300'
              }`}
              aria-label="Cambiar notificaciones del evento"
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  values.notificationsEnabled
                    ? 'translate-x-4'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <footer className="flex gap-3 border-t border-neutral-100 p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 flex-1 rounded-full border border-neutral-200 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={
              saving
              || !values.title.trim()
              || !values.calendarId
            }
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-primary text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:bg-neutral-300"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              event
                ? 'Guardar cambios'
                : 'Crear evento'
            )}
          </button>
        </footer>
      </form>
    </div>
  );
}