import type {
    Calendar as ApiCalendar,
    CalendarConference,
    CalendarEvent as ApiCalendarEvent,
    CalendarEventAttendee,
    CalendarEventKind,
    CalendarPreferences,
    CalendarRecurrence,
    CalendarReminder,
    CalendarUserSearchResult,
    CreateCalendarEventPayload,
    UpdateCalendarEventPayload,
    } from '@beeapp/shared-types';

import type {
    CalendarEvent,
    CalendarEventType,
    CalendarRepeat,
    Invitee,
    } from '../stores/calendarStore';


export const DEFAULT_CALENDAR_NAME = 'Mi Agenda';
export const DEFAULT_CALENDAR_COLOR = '#6025D2';
export const DEFAULT_TIMEZONE = 'America/Bogota';


const INVITEE_COLORS = [
    '#DBEAFE',
    '#DCFCE7',
    '#FEF3C7',
    '#FCE7F3',
    '#EDE9FE',
    '#CFFAFE',
    '#FEE2E2',
    '#ECFCCB',
];


export interface CalendarEventFormValues {
    calendarId: string;
    eventType: CalendarEventType;
    title: string;
    date: string;
    timeStart: string;
    timeEnd: string;
    isAllDay: boolean;
    location: string;
    description: string;
    reminder: string;
    selectedAttendeeIds: string[];
    conferenceUrl?: string;
}


export interface CalendarUserOption {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    initials: string;
    color: string;
}


export function getLocalTimezone(): string {
    try {
        return Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone || DEFAULT_TIMEZONE;
    } catch {
        return DEFAULT_TIMEZONE;
    }
}


export function getCalendarTimezone(
    preferences: CalendarPreferences | null,
    ): string {
    return preferences?.timezone
        || getLocalTimezone()
        || DEFAULT_TIMEZONE;
}


export function getDefaultCalendar(
    calendars: ApiCalendar[],
    ): ApiCalendar | null {
    if (calendars.length === 0) {
        return null;
    }


    return (
        calendars.find(
        (calendar) =>
            calendar.is_default
            && calendar.share_permission === 'owner',
        )
        || calendars.find(
        (calendar) =>
            calendar.share_permission === 'owner',
        )
        || calendars[0]
        || null
    );
}


export function toCalendarEventType(
    eventKind: CalendarEventKind,
    ): CalendarEventType {
    return eventKind === 'in_person'
        ? 'event'
        : 'meeting';
}


export function toBackendEventKind(
    eventType: CalendarEventType,
    ): CalendarEventKind {
    return eventType === 'meeting'
        ? 'virtual'
        : 'in_person';
}


export function toDateStringFromDate(
    value: Date,
    ): string {
    const year = value.getFullYear();
    const month = String(
        value.getMonth() + 1,
    ).padStart(2, '0');
    const day = String(
        value.getDate(),
    ).padStart(2, '0');


    return `${year}-${month}-${day}`;
}


export function toTimeStringFromDate(
    value: Date,
    ): string {
    const hours = String(
        value.getHours(),
    ).padStart(2, '0');
    const minutes = String(
        value.getMinutes(),
    ).padStart(2, '0');


    return `${hours}:${minutes}`;
}


export function getInitials(
    value: string,
    ): string {
    const words = value
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    if (words.length === 0) {
        return '?';
    }


    return words
        .slice(0, 2)
        .map((word) =>
        word.charAt(0).toUpperCase(),
        )
        .join('');
}


export function colorFromSeed(
    seed: string,
    ): string {
    let hash = 0;


    for (let index = 0; index < seed.length; index += 1) {
        hash = (
        (hash << 5)
        - hash
        + seed.charCodeAt(index)
        ) | 0;
    }


    return INVITEE_COLORS[
        Math.abs(hash) % INVITEE_COLORS.length
    ];
}


export function formatDuration(
    startTime: string,
    endTime: string,
    ): string {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);


    if (
        startMinutes === null
        || endMinutes === null
        || endMinutes <= startMinutes
    ) {
        return '';
    }


    const totalMinutes = endMinutes - startMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;


    if (hours === 0) {
        return `${minutes} min`;
    }


    if (minutes === 0) {
        return `${hours} hora${hours === 1 ? '' : 's'}`;
    }


    return `${hours} hora${hours === 1 ? '' : 's'} ${minutes} min`;
}


export function timeToMinutes(
    value: string,
    ): number | null {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(
        value.trim(),
    );


    if (!match) {
        return null;
    }


    return (
        Number(match[1]) * 60
        + Number(match[2])
    );
}


export function isValidDateString(
    value: string,
    ): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }


    const [year, month, day] = value
        .split('-')
        .map(Number);


    const date = new Date(
        year,
        month - 1,
        day,
    );


    return (
        date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day
    );
}


export function isValidTimeString(
    value: string,
    ): boolean {
    return timeToMinutes(value) !== null;
}


export function getReminderMinutes(
    reminder: string,
    ): number | null {
    const normalized = reminder.trim().toLowerCase();


    const mapping: Record<string, number | null> = {
        'sin recordatorio': null,
        '5 minutos antes': 5,
        '15 minutos antes': 15,
        '30 minutos antes': 30,
        '1 hora antes': 60,
        '2 horas antes': 120,
        '6 horas antes': 360,
        '1 día antes': 1440,
        '2 días antes': 2880,
    };


    return mapping[normalized] ?? 30;
}


export function getReminderLabel(
    offsetMinutes: number | null | undefined,
    ): string {
    if (
        offsetMinutes === null
        || offsetMinutes === undefined
    ) {
        return 'Sin recordatorio';
    }


    const mapping: Record<number, string> = {
        5: '5 minutos antes',
        15: '15 minutos antes',
        30: '30 minutos antes',
        60: '1 hora antes',
        120: '2 horas antes',
        360: '6 horas antes',
        1440: '1 día antes',
        2880: '2 días antes',
    };


    if (mapping[offsetMinutes]) {
        return mapping[offsetMinutes];
    }


    if (offsetMinutes < 60) {
        return `${offsetMinutes} minutos antes`;
    }


    if (offsetMinutes % 60 === 0) {
        const hours = offsetMinutes / 60;


        return `${hours} hora${hours === 1 ? '' : 's'} antes`;
    }


    return `${offsetMinutes} minutos antes`;
}


export function getRepeatLabel(
    recurrence: CalendarRecurrence | null | undefined,
    ): CalendarRepeat {
    if (!recurrence) {
        return 'none';
    }


    return recurrence.frequency;
}


export function createDateTimeWithOffset(
    date: string,
    time: string,
    ): string {
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0
        ? '+'
        : '-';
    const absoluteOffset = Math.abs(offsetMinutes);
    const offsetHours = String(
        Math.floor(absoluteOffset / 60),
    ).padStart(2, '0');
    const offsetRemainder = String(
        absoluteOffset % 60,
    ).padStart(2, '0');


    return `${date}T${time}:00${sign}${offsetHours}:${offsetRemainder}`;
}


export function addDaysToDateString(
    value: string,
    days: number,
    ): string {
    const [year, month, day] = value
        .split('-')
        .map(Number);


    const date = new Date(
        year,
        month - 1,
        day,
    );


    date.setDate(date.getDate() + days);


    return toDateStringFromDate(date);
}


export function mapCalendarUserToOption(
    user: CalendarUserSearchResult,
    ): CalendarUserOption {
    const name = [
        user.first_name,
        user.last_name,
    ]
        .filter(Boolean)
        .join(' ')
        .trim()
        || user.email
        || 'Usuario BeeApp';


    const phone = [
        user.phone_dial_code,
        user.phone_number,
    ]
        .filter(Boolean)
        .join(' ')
        .trim()
        || null;


    return {
        id: user.user_id,
        name,
        email: user.email,
        phone,
        initials: getInitials(name),
        color: colorFromSeed(user.user_id),
    };
}


function getConference(
    conferences: CalendarConference[] | undefined,
    ): CalendarConference | undefined {
    if (!conferences?.length) {
        return undefined;
    }


    return (
        conferences.find(
        (conference) => conference.is_primary,
        )
        || conferences[0]
    );
}


function getCurrentUserAttendee(
    attendees: CalendarEventAttendee[] | undefined,
    currentUserId?: string | null,
    ): CalendarEventAttendee | undefined {
    if (!currentUserId || !attendees?.length) {
        return undefined;
    }


    return attendees.find(
        (attendee) =>
        attendee.attendee_user_id === currentUserId,
    );
}


function mapAttendee(
    attendee: CalendarEventAttendee,
    index: number,
    ): Invitee {
    const metadata = attendee.metadata || {};
    const profileName = typeof metadata.display_name === 'string'
        ? metadata.display_name
        : null;
    const name = attendee.external_display_name
        || profileName
        || attendee.external_email
        || (
        attendee.is_organizer
            ? 'Organizador'
            : 'Usuario BeeApp'
        );


    return {
        id: attendee.id,
        userId: attendee.attendee_user_id,
        name,
        initials: getInitials(name),
        color: INVITEE_COLORS[
        index % INVITEE_COLORS.length
        ],
        status: attendee.response_status === 'accepted'
        ? 'accepted'
        : attendee.response_status === 'declined'
            ? 'declined'
            : 'pending',
        isOrganizer: attendee.is_organizer,
    };
    }


    function getTimedDateParts(
    startsAt: string | null,
    endsAt: string | null,
    ): {
    date: string;
    timeStart: string;
    timeEnd: string;
    } {
    if (!startsAt || !endsAt) {
        return {
        date: toDateStringFromDate(new Date()),
        timeStart: '09:00',
        timeEnd: '10:00',
        };
    }


    const start = new Date(startsAt);
    const end = new Date(endsAt);


    if (
        Number.isNaN(start.getTime())
        || Number.isNaN(end.getTime())
    ) {
        return {
        date: startsAt.slice(0, 10),
        timeStart: startsAt.slice(11, 16),
        timeEnd: endsAt.slice(11, 16),
        };
    }


    return {
        date: toDateStringFromDate(start),
        timeStart: toTimeStringFromDate(start),
        timeEnd: toTimeStringFromDate(end),
    };
}


export function mapApiEventToCalendarEvent(
    event: ApiCalendarEvent,
    currentUserId?: string | null,
    ): CalendarEvent {
    const isAllDay = event.is_all_day;
    const timedParts = getTimedDateParts(
        event.starts_at,
        event.ends_at,
    );
    const date = isAllDay
        ? event.starts_on
        || timedParts.date
        : timedParts.date;
    const timeStart = isAllDay
        ? 'Todo el día'
        : timedParts.timeStart;
    const timeEnd = isAllDay
        ? ''
        : timedParts.timeEnd;
    const primaryConference = getConference(
        event.conferences,
    );
    const reminders = event.reminders || [];
    const firstReminder = reminders
        .slice()
        .sort(
        (left, right) =>
            left.offset_minutes
            - right.offset_minutes,
        )[0];
    const attendees = event.attendees || [];
    const currentUserAttendee = getCurrentUserAttendee(
        attendees,
        currentUserId,
    );
    const canManage = event.organizer_id === currentUserId;


    return {
        id: event.id,
        calendarId: event.calendar_id,
        organizerId: event.organizer_id,
        title: event.title,
        type: toCalendarEventType(event.event_kind),
        backendKind: event.event_kind,
        color: event.color || '#6025D2',
        date,
        timeStart,
        timeEnd,
        duration: isAllDay
        ? 'Todo el día'
        : formatDuration(
            timedParts.timeStart,
            timedParts.timeEnd,
        ),
        isAllDay,
        isVirtual: event.event_kind !== 'in_person',
        videoUrl: primaryConference?.join_url,
        location: event.location_name || undefined,
        locationAddress: event.location_address || undefined,
        locationMapsUrl: event.location_maps_url || undefined,
        description: event.description || '',
        reminder: getReminderLabel(
        firstReminder?.offset_minutes,
        ),
        reminderMinutes: firstReminder?.offset_minutes ?? null,
        repeat: getRepeatLabel(event.recurrence),
        recurrenceRule: event.recurrence?.rrule,
        organizer: {
        id: event.organizer_id,
        name: canManage
            ? 'Tú'
            : 'Organizador',
        initials: canManage
            ? 'TÚ'
            : 'OR',
        color: '#DBEAFE',
        },
        userResponse: currentUserAttendee
        ? (
            currentUserAttendee.response_status === 'accepted'
            ? 'accepted'
            : currentUserAttendee.response_status === 'declined'
                ? 'declined'
                : 'pending'
        )
        : undefined,
        canManage,
        isPrivate: event.is_private,
        notificationsEnabled: event.notifications_enabled,
        timezone: event.timezone || DEFAULT_TIMEZONE,
        invitees: attendees
        .filter((attendee) => !attendee.is_organizer)
        .filter(
            (attendee) =>
            attendee.response_status !== 'removed',
        )
        .map(mapAttendee),
        createdAt: event.created_at,
        updatedAt: event.updated_at,
    };
}


function buildReminders(
    reminder: string,
    ): CalendarReminder[] {
    const offsetMinutes = getReminderMinutes(reminder);


    if (offsetMinutes === null) {
        return [];
    }


    return [
        {
        channel: 'push',
        offset_minutes: offsetMinutes,
        },
    ];
}


function buildConferences(
    conferenceUrl?: string,
    ): CalendarConference[] {
    const normalizedUrl = conferenceUrl?.trim();


    if (!normalizedUrl) {
        return [];
    }


    return [
        {
        provider: 'external',
        label: 'Videollamada',
        join_url: normalizedUrl,
        is_primary: true,
        },
    ];
}


export function buildCreateCalendarEventPayload(
    values: CalendarEventFormValues,
    timezone: string,
    ): CreateCalendarEventPayload {
    const basePayload: CreateCalendarEventPayload = {
        calendar_id: values.calendarId,
        title: values.title.trim(),
        description: values.description.trim() || null,
        event_kind: toBackendEventKind(values.eventType),
        color: values.eventType === 'meeting'
        ? '#6025D2'
        : '#059669',
        is_all_day: values.isAllDay,
        timezone,
        location_name: values.location.trim() || null,
        location_address: null,
        location_maps_url: null,
        is_private: false,
        notifications_enabled: true,
        attendee_ids: values.selectedAttendeeIds,
        reminders: buildReminders(values.reminder),
        conferences: buildConferences(
        values.conferenceUrl,
        ),
    };


    if (values.isAllDay) {
        return {
        ...basePayload,
        starts_at: null,
        ends_at: null,
        starts_on: values.date,
        ends_on: addDaysToDateString(
            values.date,
            1,
        ),
        };
    }


    return {
        ...basePayload,
        starts_at: createDateTimeWithOffset(
        values.date,
        values.timeStart,
        ),
        ends_at: createDateTimeWithOffset(
        values.date,
        values.timeEnd,
        ),
        starts_on: null,
        ends_on: null,
    };
}


export function buildUpdateCalendarEventPayload(
    values: CalendarEventFormValues,
    timezone: string,
    ): UpdateCalendarEventPayload {
    return buildCreateCalendarEventPayload(
        values,
        timezone,
    );
}


export function getInitialFormValues(
    event: CalendarEvent | null,
    fallbackDate: string,
    calendarId: string,
    ): CalendarEventFormValues {
    if (!event) {
        return {
        calendarId,
        eventType: 'meeting',
        title: '',
        date: fallbackDate,
        timeStart: '09:00',
        timeEnd: '10:00',
        isAllDay: false,
        location: '',
        description: '',
        reminder: '30 minutos antes',
        selectedAttendeeIds: [],
        conferenceUrl: '',
        };
    }


    return {
        calendarId: event.calendarId,
        eventType: event.type,
        title: event.title,
        date: event.date,
        timeStart: event.isAllDay
        ? '09:00'
        : event.timeStart,
        timeEnd: event.isAllDay
        ? '10:00'
        : event.timeEnd,
        isAllDay: event.isAllDay,
        location: event.location || '',
        description: event.description,
        reminder: event.reminder,
        selectedAttendeeIds: event.invitees
        .map((invitee) => invitee.userId)
        .filter(
            (userId): userId is string =>
            Boolean(userId),
        ),
        conferenceUrl: event.videoUrl || '',
    };
}