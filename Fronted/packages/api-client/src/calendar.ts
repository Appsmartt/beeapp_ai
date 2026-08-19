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
    UpdateCalendarEventPayload,
    UpdateCalendarEventResponse,
    UpdateExternalCalendarPreferencesPayload,
    UpdateExternalCalendarPreferencesResponse,
    } from '@beeapp/shared-types';

import { api } from './client';


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


function externalCalendarPath(
    externalCalendarId: string,
    ): string {
    return (
        '/calendar/external-calendars/'
        + `${encodeURIComponent(externalCalendarId)}/`
    );
}


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


/**
 * Obtiene las integraciones externas disponibles dentro del módulo Agenda.
 *
 * Esta respuesta incluye únicamente datos públicos: proveedor, cuenta,
 * estado de sincronización, scopes otorgados y estado de reautorización.
 * Nunca incluye tokens de OAuth.
 */
export function getCalendarIntegrations(
    auth: AuthCredentials,
    ): Promise<GetCalendarIntegrationsResponse> {
    return api.get<GetCalendarIntegrationsResponse>(
        '/calendar/integrations/',
        { auth },
    );
}


/**
 * Obtiene una integración específica de Agenda que pertenece al usuario
 * autenticado.
 */
export function getCalendarIntegration(
    auth: AuthCredentials,
    integrationId: string,
    ): Promise<GetCalendarIntegrationResponse> {
    return api.get<GetCalendarIntegrationResponse>(
        calendarIntegrationPath(integrationId),
        { auth },
    );
}


/**
 * Lista los calendarios externos que ya fueron descubiertos y persistidos
 * para una integración concreta, por ejemplo Google Calendar u Outlook.
 */
export function getExternalCalendars(
    auth: AuthCredentials,
    integrationId: string,
    ): Promise<GetExternalCalendarsResponse> {
    return api.get<GetExternalCalendarsResponse>(
        externalCalendarsPath(integrationId),
        { auth },
    );
}


/**
 * Solicita al backend buscar calendarios del proveedor externo.
 *
 * El backend maneja los tokens OAuth, llama a Google/Microsoft Graph y
 * persiste los calendarios encontrados. Mobile nunca recibe credenciales.
 */
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


/**
 * Actualiza preferencias locales de un calendario externo persistido.
 *
 * Campos permitidos:
 * - is_selected: incluye/excluye el calendario de selección futura.
 * - is_visible: 'visible' o 'hidden'.
 */
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