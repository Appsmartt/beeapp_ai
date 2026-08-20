import type {
    AuthCredentials,
    CalendarConflictQuery,
    CalendarEventsQuery,
    CreateCalendarEventPayload,
    CreateCalendarEventResponse,
    CreateCalendarPayload,
    CreateCalendarResponse,
    DiscoverExternalCalendarsResponse,
    DuplicateCalendarEventPayload,
    GetCalendarBootstrapResponse,
    GetCalendarConflictsResponse,
    GetCalendarEventResponse,
    GetCalendarEventsResponse,
    GetCalendarIntegrationResponse,
    GetCalendarIntegrationsResponse,
    GetExternalCalendarsResponse,
    RespondToCalendarEventResponse,
    SearchCalendarUsersResponse,
    SyncCalendarIntegrationPayload,
    SyncCalendarIntegrationResponse,
    UpdateCalendarEventPayload,
    UpdateCalendarEventResponse,
    UpdateExternalCalendarPreferencesPayload,
    UpdateExternalCalendarPreferencesResponse,
} from '@beeapp/shared-types';

import { api } from './client';

const WEB_OPTIONS = {
    credentials: 'include' as RequestCredentials,
};

function buildQuery(
    params: object,
): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (
            value === undefined
            || value === null
            || value === ''
        ) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((item) => {
                if (
                    item !== undefined
                    && item !== null
                    && item !== ''
                ) {
                    searchParams.append(
                        key,
                        String(item),
                    );
                }
            });

            return;
        }

        searchParams.set(
            key,
            String(value),
        );
    });

    const query = searchParams.toString();

    return query ? `?${query}` : '';
}

function eventPath(
    eventId: string,
): string {
    return `/calendar/events/${encodeURIComponent(eventId)}/`;
}

function calendarIntegrationPath(
    integrationId: string,
): string {
    return (
        '/calendar/integrations/'
        + `${encodeURIComponent(integrationId)}/`
    );
}

function externalCalendarsPath(
    integrationId: string,
): string {
    return (
        `${calendarIntegrationPath(integrationId)}`
        + 'external-calendars/'
    );
}

function discoverCalendarsPath(
    integrationId: string,
): string {
    return (
        `${calendarIntegrationPath(integrationId)}`
        + 'discover-calendars/'
    );
}

function syncCalendarIntegrationPath(
    integrationId: string,
): string {
    return (
        `${calendarIntegrationPath(integrationId)}`
        + 'sync/'
    );
}

function externalCalendarPath(
    externalCalendarId: string,
): string {
    return (
        '/calendar/external-calendars/'
        + `${encodeURIComponent(externalCalendarId)}/`
    );
}

/* Mobile API: explicit token/session authentication. */

export function getCalendarBootstrap(
    auth: AuthCredentials,
    query: Pick<
        CalendarEventsQuery,
        'range_start' | 'range_end'
    >,
): Promise<GetCalendarBootstrapResponse> {
    return api.get<GetCalendarBootstrapResponse>(
        `/calendar/bootstrap/${buildQuery(query)}`,
        { auth },
    );
}

export function getCalendarEvents(
    auth: AuthCredentials,
    query: CalendarEventsQuery,
): Promise<GetCalendarEventsResponse> {
    return api.get<GetCalendarEventsResponse>(
        `/calendar/events/${buildQuery(query)}`,
        { auth },
    );
}

export function getCalendarEvent(
    auth: AuthCredentials,
    eventId: string,
): Promise<GetCalendarEventResponse> {
    return api.get<GetCalendarEventResponse>(
        eventPath(eventId),
        { auth },
    );
}

export function createCalendar(
    auth: AuthCredentials,
    payload: CreateCalendarPayload,
): Promise<CreateCalendarResponse> {
    return api.post<CreateCalendarResponse>(
        '/calendar/calendars/',
        payload,
        { auth },
    );
}

export function createCalendarEvent(
    auth: AuthCredentials,
    payload: CreateCalendarEventPayload,
): Promise<CreateCalendarEventResponse> {
    return api.post<CreateCalendarEventResponse>(
        '/calendar/events/',
        payload,
        { auth },
    );
}

export function updateCalendarEvent(
    auth: AuthCredentials,
    eventId: string,
    payload: UpdateCalendarEventPayload,
): Promise<UpdateCalendarEventResponse> {
    return api.patch<UpdateCalendarEventResponse>(
        eventPath(eventId),
        payload,
        { auth },
    );
}

export async function deleteCalendarEvent(
    auth: AuthCredentials,
    eventId: string,
): Promise<void> {
    await api.delete<void>(
        eventPath(eventId),
        { auth },
    );
}

export function duplicateCalendarEvent(
    auth: AuthCredentials,
    eventId: string,
    payload: DuplicateCalendarEventPayload,
): Promise<CreateCalendarEventResponse> {
    return api.post<CreateCalendarEventResponse>(
        `${eventPath(eventId)}duplicate/`,
        payload,
        { auth },
    );
}

export function searchCalendarUsers(
    auth: AuthCredentials,
    query: string,
    limit = 20,
): Promise<SearchCalendarUsersResponse> {
    return api.get<SearchCalendarUsersResponse>(
        `/calendar/users/search/${buildQuery({
            q: query,
            limit,
        })}`,
        { auth },
    );
}

export function respondToCalendarEvent(
    auth: AuthCredentials,
    eventId: string,
    responseStatus: 'accepted' | 'declined',
): Promise<RespondToCalendarEventResponse> {
    return api.post<RespondToCalendarEventResponse>(
        `${eventPath(eventId)}rsvp/`,
        {
            response_status: responseStatus,
        },
        { auth },
    );
}

export function getCalendarConflicts(
    auth: AuthCredentials,
    query: CalendarConflictQuery,
): Promise<GetCalendarConflictsResponse> {
    return api.get<GetCalendarConflictsResponse>(
        `/calendar/conflicts/${buildQuery(query)}`,
        { auth },
    );
}

export function getCalendarIntegrations(
    auth: AuthCredentials,
): Promise<GetCalendarIntegrationsResponse> {
    return api.get<GetCalendarIntegrationsResponse>(
        '/calendar/integrations/',
        { auth },
    );
}

export function getCalendarIntegration(
    auth: AuthCredentials,
    integrationId: string,
): Promise<GetCalendarIntegrationResponse> {
    return api.get<GetCalendarIntegrationResponse>(
        calendarIntegrationPath(integrationId),
        { auth },
    );
}

export function getExternalCalendars(
    auth: AuthCredentials,
    integrationId: string,
): Promise<GetExternalCalendarsResponse> {
    return api.get<GetExternalCalendarsResponse>(
        externalCalendarsPath(integrationId),
        { auth },
    );
}

export function discoverExternalCalendars(
    auth: AuthCredentials,
    integrationId: string,
): Promise<DiscoverExternalCalendarsResponse> {
    return api.post<DiscoverExternalCalendarsResponse>(
        discoverCalendarsPath(integrationId),
        {},
        { auth },
    );
}

export function syncCalendarIntegration(
    auth: AuthCredentials,
    integrationId: string,
    payload: SyncCalendarIntegrationPayload = {},
): Promise<SyncCalendarIntegrationResponse> {
    return api.post<SyncCalendarIntegrationResponse>(
        syncCalendarIntegrationPath(integrationId),
        payload,
        { auth },
    );
}

export function updateExternalCalendarPreferences(
    auth: AuthCredentials,
    externalCalendarId: string,
    payload: UpdateExternalCalendarPreferencesPayload,
): Promise<UpdateExternalCalendarPreferencesResponse> {
    return api.patch<UpdateExternalCalendarPreferencesResponse>(
        externalCalendarPath(externalCalendarId),
        payload,
        { auth },
    );
}

/* Web API: HttpOnly web-session cookie authentication. */

export function getCurrentWebCalendarBootstrap(
    query: Pick<
        CalendarEventsQuery,
        'range_start' | 'range_end'
    >,
): Promise<GetCalendarBootstrapResponse> {
    return api.get<GetCalendarBootstrapResponse>(
        `/calendar/bootstrap/${buildQuery(query)}`,
        WEB_OPTIONS,
    );
}

export function getCurrentWebCalendarEvents(
    query: CalendarEventsQuery,
): Promise<GetCalendarEventsResponse> {
    return api.get<GetCalendarEventsResponse>(
        `/calendar/events/${buildQuery(query)}`,
        WEB_OPTIONS,
    );
}

export function getCurrentWebCalendarEvent(
    eventId: string,
): Promise<GetCalendarEventResponse> {
    return api.get<GetCalendarEventResponse>(
        eventPath(eventId),
        WEB_OPTIONS,
    );
}

export function createCurrentWebCalendar(
    payload: CreateCalendarPayload,
): Promise<CreateCalendarResponse> {
    return api.post<CreateCalendarResponse>(
        '/calendar/calendars/',
        payload,
        WEB_OPTIONS,
    );
}

export function createCurrentWebCalendarEvent(
    payload: CreateCalendarEventPayload,
): Promise<CreateCalendarEventResponse> {
    return api.post<CreateCalendarEventResponse>(
        '/calendar/events/',
        payload,
        WEB_OPTIONS,
    );
}

export function updateCurrentWebCalendarEvent(
    eventId: string,
    payload: UpdateCalendarEventPayload,
): Promise<UpdateCalendarEventResponse> {
    return api.patch<UpdateCalendarEventResponse>(
        eventPath(eventId),
        payload,
        WEB_OPTIONS,
    );
}

export async function deleteCurrentWebCalendarEvent(
    eventId: string,
): Promise<void> {
    await api.delete<void>(
        eventPath(eventId),
        WEB_OPTIONS,
    );
}

export function duplicateCurrentWebCalendarEvent(
    eventId: string,
    payload: DuplicateCalendarEventPayload,
): Promise<CreateCalendarEventResponse> {
    return api.post<CreateCalendarEventResponse>(
        `${eventPath(eventId)}duplicate/`,
        payload,
        WEB_OPTIONS,
    );
}

export function searchCurrentWebCalendarUsers(
    query: string,
    limit = 20,
): Promise<SearchCalendarUsersResponse> {
    return api.get<SearchCalendarUsersResponse>(
        `/calendar/users/search/${buildQuery({
            q: query,
            limit,
        })}`,
        WEB_OPTIONS,
    );
}

export function respondCurrentWebCalendarEvent(
    eventId: string,
    responseStatus: 'accepted' | 'declined',
): Promise<RespondToCalendarEventResponse> {
    return api.post<RespondToCalendarEventResponse>(
        `${eventPath(eventId)}rsvp/`,
        {
            response_status: responseStatus,
        },
        WEB_OPTIONS,
    );
}

export function getCurrentWebCalendarConflicts(
    query: CalendarConflictQuery,
): Promise<GetCalendarConflictsResponse> {
    return api.get<GetCalendarConflictsResponse>(
        `/calendar/conflicts/${buildQuery(query)}`,
        WEB_OPTIONS,
    );
}

export function getCurrentWebCalendarIntegrations(): Promise<GetCalendarIntegrationsResponse> {
    return api.get<GetCalendarIntegrationsResponse>(
        '/calendar/integrations/',
        WEB_OPTIONS,
    );
}

export function getCurrentWebCalendarIntegration(
    integrationId: string,
): Promise<GetCalendarIntegrationResponse> {
    return api.get<GetCalendarIntegrationResponse>(
        calendarIntegrationPath(integrationId),
        WEB_OPTIONS,
    );
}

export function getCurrentWebExternalCalendars(
    integrationId: string,
): Promise<GetExternalCalendarsResponse> {
    return api.get<GetExternalCalendarsResponse>(
        externalCalendarsPath(integrationId),
        WEB_OPTIONS,
    );
}

export function discoverCurrentWebExternalCalendars(
    integrationId: string,
): Promise<DiscoverExternalCalendarsResponse> {
    return api.post<DiscoverExternalCalendarsResponse>(
        discoverCalendarsPath(integrationId),
        {},
        WEB_OPTIONS,
    );
}

export function syncCurrentWebCalendarIntegration(
    integrationId: string,
    payload: SyncCalendarIntegrationPayload = {},
): Promise<SyncCalendarIntegrationResponse> {
    return api.post<SyncCalendarIntegrationResponse>(
        syncCalendarIntegrationPath(integrationId),
        payload,
        WEB_OPTIONS,
    );
}

export function updateCurrentWebExternalCalendarPreferences(
    externalCalendarId: string,
    payload: UpdateExternalCalendarPreferencesPayload,
): Promise<UpdateExternalCalendarPreferencesResponse> {
    return api.patch<UpdateExternalCalendarPreferencesResponse>(
        externalCalendarPath(externalCalendarId),
        payload,
        WEB_OPTIONS,
    );
}