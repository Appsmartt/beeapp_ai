import type {
    AuthCredentials,
    CalendarConflictQuery,
    CalendarEventsQuery,
    CreateCalendarEventPayload,
    CreateCalendarEventResponse,
    CreateCalendarPayload,
    CreateCalendarResponse,
    DuplicateCalendarEventPayload,
    GetCalendarBootstrapResponse,
    GetCalendarConflictsResponse,
    GetCalendarEventResponse,
    GetCalendarEventsResponse,
    RespondToCalendarEventResponse,
    SearchCalendarUsersResponse,
    UpdateCalendarEventPayload,
    UpdateCalendarEventResponse,
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