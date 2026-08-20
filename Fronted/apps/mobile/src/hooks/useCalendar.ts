import {
    useCallback,
    useEffect,
    useRef,
    useState,
    } from 'react';
import {
    createCalendar,
    createCalendarEvent,
    deleteCalendarEvent,
    duplicateCalendarEvent,
    getCalendarBootstrap,
    getCalendarEvent,
    respondToCalendarEvent,
    searchCalendarUsers,
    updateCalendarEvent,
    } from '@beeapp/api-client';
import type {
    AuthCredentials,
    Calendar as ApiCalendar,
    CalendarEvent as ApiCalendarEvent,
    CalendarPreferences,
    CreateCalendarEventPayload,
    DuplicateCalendarEventPayload,
    UpdateCalendarEventPayload,
    } from '@beeapp/shared-types';

import {
    getValidAuthSession,
    getValidSessionCredentials,
    } from '../services/authSession';
import {
    DEFAULT_CALENDAR_COLOR,
    DEFAULT_CALENDAR_NAME,
    getCalendarTimezone,
    mapApiEventToCalendarEvent,
    mapCalendarUserToOption,
    type CalendarUserOption,
    } from '../services/calendarService';
import {
    getCalendarCache,
    removeCalendarEvent,
    setCalendarCache,
    upsertCalendarEvent,
    type CalendarEvent,
    } from '../stores/calendarStore';


export interface CalendarRange {
    rangeStart: string;
    rangeEnd: string;
}


export interface UseCalendarResult {
    events: CalendarEvent[];
    calendars: ApiCalendar[];
    preferences: CalendarPreferences | null;
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    loadCalendar: (
        range: CalendarRange,
        showRefresh?: boolean,
    ) => Promise<void>;
    getEventById: (
        eventId: string,
        forceRefresh?: boolean,
    ) => Promise<CalendarEvent>;
    createEvent: (
        payload: CreateCalendarEventPayload,
    ) => Promise<CalendarEvent>;
    updateEvent: (
        eventId: string,
        payload: UpdateCalendarEventPayload,
    ) => Promise<CalendarEvent>;
    deleteEvent: (
        eventId: string,
    ) => Promise<void>;
    duplicateEvent: (
        eventId: string,
        payload: DuplicateCalendarEventPayload,
    ) => Promise<CalendarEvent>;
    respondToInvitation: (
        eventId: string,
        responseStatus: 'accepted' | 'declined',
    ) => Promise<void>;
    searchUsers: (
        query: string,
    ) => Promise<CalendarUserOption[]>;
    getDefaultCalendarId: () => string | null;
    getTimezone: () => string;
}


interface AuthenticatedCalendarContext {
    auth: AuthCredentials;
    currentUserId: string;
}


function mapEvents(
    events: ApiCalendarEvent[],
    currentUserId?: string | null,
    ): CalendarEvent[] {
    return events.map((event) =>
        mapApiEventToCalendarEvent(
        event,
        currentUserId,
        ),
    );
}


function selectDefaultCalendarId(
    calendars: ApiCalendar[],
    ): string | null {
    return (
        calendars.find(
        (calendar) =>
            calendar.is_default
            && calendar.share_permission === 'owner',
        )?.id
        || calendars.find(
        (calendar) =>
            calendar.share_permission === 'owner',
        )?.id
        || calendars[0]?.id
        || null
    );
}


function delay(
    milliseconds: number,
    ): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}


async function getAuthenticatedCalendarContext(): Promise<
    AuthenticatedCalendarContext
    > {
    const authSession = await getValidAuthSession();

    if (!authSession) {
        throw new Error(
        'Tu sesión expiró. Inicia sesión nuevamente.',
        );
    }

    const auth = await getValidSessionCredentials();

    if (!auth) {
        throw new Error(
        'Tu sesión expiró. Inicia sesión nuevamente.',
        );
    }

    return {
        auth,
        currentUserId: authSession.user.id,
    };
}


export function useCalendar(): UseCalendarResult {
    const initialCache = getCalendarCache();

    const [events, setEvents] = useState<CalendarEvent[]>(
        initialCache.events,
    );

    const [calendars, setCalendars] = useState<ApiCalendar[]>(
        initialCache.calendars,
    );

    const [preferences, setPreferences] = useState<
        CalendarPreferences | null
    >(
        initialCache.preferences,
    );

    const [loading, setLoading] = useState(
        initialCache.events.length === 0,
    );

    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const latestRequestId = useRef(0);

    const provisioningPromiseRef = useRef<Promise<void> | null>(
        null,
    );

    const syncCache = useCallback((
        nextEvents: CalendarEvent[],
        nextCalendars: ApiCalendar[],
        nextPreferences: CalendarPreferences | null,
        range: CalendarRange,
    ) => {
        setCalendarCache({
        events: nextEvents,
        calendars: nextCalendars,
        preferences: nextPreferences,
        rangeStart: range.rangeStart,
        rangeEnd: range.rangeEnd,
        });

        setEvents(nextEvents);
        setCalendars(nextCalendars);
        setPreferences(nextPreferences);
    }, []);

    const bootstrapWithProvisioning = useCallback(async (
        range: CalendarRange,
    ) => {
        const {
        auth,
        currentUserId,
        } = await getAuthenticatedCalendarContext();

        let response = await getCalendarBootstrap(
        auth,
        {
            range_start: range.rangeStart,
            range_end: range.rangeEnd,
        },
        );

        if (response.calendars.length > 0) {
        return {
            auth,
            currentUserId,
            response,
        };
        }

        if (!provisioningPromiseRef.current) {
        provisioningPromiseRef.current = createCalendar(
            auth,
            {
            name: DEFAULT_CALENDAR_NAME,
            description: (
                'Calendario personal creado automáticamente '
                + 'para usar Agenda.'
            ),
            color: DEFAULT_CALENDAR_COLOR,
            timezone: response.preferences?.timezone
                || getCalendarTimezone(null),
            },
        )
            .then(() => undefined)
            .finally(() => {
            provisioningPromiseRef.current = null;
            });
        }

        await provisioningPromiseRef.current;

        for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await getCalendarBootstrap(
            auth,
            {
            range_start: range.rangeStart,
            range_end: range.rangeEnd,
            },
        );

        if (response.calendars.length > 0) {
            break;
        }

        await delay(250);
        }

        if (response.calendars.length === 0) {
        throw new Error(
            'No fue posible preparar tu calendario base. '
            + 'Intenta nuevamente.',
        );
        }

        return {
        auth,
        currentUserId,
        response,
        };
    }, []);

    const loadCalendar = useCallback(async (
        range: CalendarRange,
        showRefresh = false,
    ) => {
        const requestId = latestRequestId.current + 1;

        latestRequestId.current = requestId;

        if (showRefresh) {
        setRefreshing(true);
        } else {
        setLoading(true);
        }

        setError(null);

        try {
        const {
            currentUserId,
            response,
        } = await bootstrapWithProvisioning(range);

        if (requestId !== latestRequestId.current) {
            return;
        }

        const nextEvents = mapEvents(
            response.events,
            currentUserId,
        );

        syncCache(
            nextEvents,
            response.calendars,
            response.preferences,
            range,
        );
        } catch (loadError) {
        if (requestId !== latestRequestId.current) {
            return;
        }

        setError(
            loadError instanceof Error
            ? loadError.message
            : 'No fue posible cargar tu agenda.',
        );
        } finally {
        if (requestId === latestRequestId.current) {
            setLoading(false);
            setRefreshing(false);
        }
        }
    }, [
        bootstrapWithProvisioning,
        syncCache,
    ]);

    useEffect(() => {
        const cachedRange = getCalendarCache();

        if (
        cachedRange.rangeStart
        && cachedRange.rangeEnd
        ) {
        void loadCalendar({
            rangeStart: cachedRange.rangeStart,
            rangeEnd: cachedRange.rangeEnd,
        });
        }
    }, [loadCalendar]);

    const getEventById = useCallback(async (
        eventId: string,
        forceRefresh = true,
    ) => {
        const cachedEvent = getCalendarCache().events.find(
        (event) => event.id === eventId,
        );

        if (cachedEvent && !forceRefresh) {
        return cachedEvent;
        }

        const {
        auth,
        currentUserId,
        } = await getAuthenticatedCalendarContext();

        const response = await getCalendarEvent(
        auth,
        eventId,
        );

        const event = mapApiEventToCalendarEvent(
        response.event,
        currentUserId,
        );

        upsertCalendarEvent(event);
        setEvents(getCalendarCache().events);

        return event;
    }, []);

    const createEvent = useCallback(async (
        payload: CreateCalendarEventPayload,
    ) => {
        const {
        auth,
        currentUserId,
        } = await getAuthenticatedCalendarContext();

        const response = await createCalendarEvent(
        auth,
        payload,
        );

        const event = mapApiEventToCalendarEvent(
        response.event,
        currentUserId,
        );

        upsertCalendarEvent(event);
        setEvents(getCalendarCache().events);

        return event;
    }, []);

    const updateEvent = useCallback(async (
        eventId: string,
        payload: UpdateCalendarEventPayload,
    ) => {
        const {
        auth,
        currentUserId,
        } = await getAuthenticatedCalendarContext();

        const response = await updateCalendarEvent(
        auth,
        eventId,
        payload,
        );

        const event = mapApiEventToCalendarEvent(
        response.event,
        currentUserId,
        );

        upsertCalendarEvent(event);
        setEvents(getCalendarCache().events);

        return event;
    }, []);

    const deleteEvent = useCallback(async (
        eventId: string,
    ) => {
        const {
        auth,
        } = await getAuthenticatedCalendarContext();

        await deleteCalendarEvent(
        auth,
        eventId,
        );

        removeCalendarEvent(eventId);
        setEvents(getCalendarCache().events);
    }, []);

    const duplicateEvent = useCallback(async (
        eventId: string,
        payload: DuplicateCalendarEventPayload,
    ) => {
        const {
        auth,
        currentUserId,
        } = await getAuthenticatedCalendarContext();

        const response = await duplicateCalendarEvent(
        auth,
        eventId,
        payload,
        );

        const event = mapApiEventToCalendarEvent(
        response.event,
        currentUserId,
        );

        upsertCalendarEvent(event);
        setEvents(getCalendarCache().events);

        return event;
    }, []);

    const respondToInvitation = useCallback(async (
        eventId: string,
        responseStatus: 'accepted' | 'declined',
    ) => {
        const {
        auth,
        } = await getAuthenticatedCalendarContext();

        await respondToCalendarEvent(
        auth,
        eventId,
        responseStatus,
        );

        await getEventById(eventId, true);
    }, [getEventById]);

    const searchUsers = useCallback(async (
        query: string,
    ) => {
        const normalizedQuery = query.trim();

        if (normalizedQuery.length < 3) {
        return [];
        }

        const {
        auth,
        } = await getAuthenticatedCalendarContext();

        const response = await searchCalendarUsers(
        auth,
        normalizedQuery,
        );

        return response.users.map(
        mapCalendarUserToOption,
        );
    }, []);

    const getDefaultCalendarId = useCallback(
        () => selectDefaultCalendarId(calendars),
        [calendars],
    );

    const getTimezone = useCallback(
        () => getCalendarTimezone(preferences),
        [preferences],
    );

    return {
        events,
        calendars,
        preferences,
        loading,
        refreshing,
        error,
        loadCalendar,
        getEventById,
        createEvent,
        updateEvent,
        deleteEvent,
        duplicateEvent,
        respondToInvitation,
        searchUsers,
        getDefaultCalendarId,
        getTimezone,
    };
}