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
    Calendar as ApiCalendar,
    CalendarEvent as ApiCalendarEvent,
    CalendarPreferences,
    CreateCalendarEventPayload,
    DuplicateCalendarEventPayload,
    UpdateCalendarEventPayload,
    } from '@beeapp/shared-types';

import {
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


function mapEvents(
    events: ApiCalendarEvent[],
    ): CalendarEvent[] {
    return events.map((event) =>
        mapApiEventToCalendarEvent(event),
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


    /*
    * Prevents duplicate "Mi Agenda" calendar creation when a user opens
    * Agenda twice before the first bootstrap/create/bootstrap flow finishes.
    */
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
        const auth = await getValidSessionCredentials();


        if (!auth) {
        throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
        );
        }


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


        /*
        * The backend insert can take a moment to become visible in a second
        * read. A small retry avoids an empty Agenda immediately after creation.
        */
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
            response,
        } = await bootstrapWithProvisioning(range);


        if (requestId !== latestRequestId.current) {
            return;
        }


        const nextEvents = mapEvents(response.events);


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


        const auth = await getValidSessionCredentials();


        if (!auth) {
        throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
        );
        }


        const response = await getCalendarEvent(
        auth,
        eventId,
        );


        const event = mapApiEventToCalendarEvent(
        response.event,
        );


        upsertCalendarEvent(event);
        setEvents(getCalendarCache().events);


        return event;
    }, []);


    const createEvent = useCallback(async (
        payload: CreateCalendarEventPayload,
    ) => {
        const auth = await getValidSessionCredentials();


        if (!auth) {
        throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
        );
        }


        const response = await createCalendarEvent(
        auth,
        payload,
        );


        const event = mapApiEventToCalendarEvent(
        response.event,
        );


        upsertCalendarEvent(event);
        setEvents(getCalendarCache().events);


        return event;
    }, []);


    const updateEvent = useCallback(async (
        eventId: string,
        payload: UpdateCalendarEventPayload,
    ) => {
        const auth = await getValidSessionCredentials();


        if (!auth) {
        throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
        );
        }


        const response = await updateCalendarEvent(
        auth,
        eventId,
        payload,
        );


        const event = mapApiEventToCalendarEvent(
        response.event,
        );


        upsertCalendarEvent(event);
        setEvents(getCalendarCache().events);


        return event;
    }, []);


    const deleteEvent = useCallback(async (
        eventId: string,
    ) => {
        const auth = await getValidSessionCredentials();


        if (!auth) {
        throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
        );
        }


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
        const auth = await getValidSessionCredentials();


        if (!auth) {
        throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
        );
        }


        const response = await duplicateCalendarEvent(
        auth,
        eventId,
        payload,
        );


        const event = mapApiEventToCalendarEvent(
        response.event,
        );


        upsertCalendarEvent(event);
        setEvents(getCalendarCache().events);


        return event;
    }, []);


    const respondToInvitation = useCallback(async (
        eventId: string,
        responseStatus: 'accepted' | 'declined',
    ) => {
        const auth = await getValidSessionCredentials();


        if (!auth) {
        throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
        );
        }


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


        const auth = await getValidSessionCredentials();


        if (!auth) {
        throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
        );
        }


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