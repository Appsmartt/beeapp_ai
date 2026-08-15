import type {
    AuthCredentials,
    GetNotificationsResponse,
    MarkAllNotificationsReadResponse,
    MarkNotificationReadResponse,
    NotificationsQuery,
    RegisterPushDevicePayload,
    RegisterPushDeviceResponse,
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
        value !== undefined
        && value !== null
        && value !== ''
        ) {
        searchParams.set(key, String(value));
        }
    });

    const query = searchParams.toString();

    return query ? `?${query}` : '';
}

/* Mobile API: explicit token/session authentication. */

export function getNotifications(
    auth: AuthCredentials,
    query: NotificationsQuery = {},
    ): Promise<GetNotificationsResponse> {
    return api.get<GetNotificationsResponse>(
        `/notifications/${buildQuery(query)}`,
        { auth },
    );
}

export function markNotificationAsRead(
    auth: AuthCredentials,
    notificationId: string,
    ): Promise<MarkNotificationReadResponse> {
    return api.post<MarkNotificationReadResponse>(
        `/notifications/${encodeURIComponent(
        notificationId,
        )}/read/`,
        undefined,
        { auth },
    );
}

export function markAllNotificationsAsRead(
    auth: AuthCredentials,
    module?: string,
    ): Promise<MarkAllNotificationsReadResponse> {
    return api.post<MarkAllNotificationsReadResponse>(
        `/notifications/read-all/${buildQuery({
        module,
        })}`,
        undefined,
        { auth },
    );
}

export function registerPushDevice(
    auth: AuthCredentials,
    payload: RegisterPushDevicePayload,
    ): Promise<RegisterPushDeviceResponse> {
    return api.post<RegisterPushDeviceResponse>(
        '/notifications/push-devices/',
        payload,
        { auth },
    );
}

/* Web API: HttpOnly web-session cookie authentication. */

export function getCurrentWebNotifications(
    query: NotificationsQuery = {},
    ): Promise<GetNotificationsResponse> {
    return api.get<GetNotificationsResponse>(
        `/notifications/${buildQuery(query)}`,
        WEB_OPTIONS,
    );
}

export function markCurrentWebNotificationAsRead(
    notificationId: string,
    ): Promise<MarkNotificationReadResponse> {
    return api.post<MarkNotificationReadResponse>(
        `/notifications/${encodeURIComponent(
        notificationId,
        )}/read/`,
        undefined,
        WEB_OPTIONS,
    );
}

export function markAllCurrentWebNotificationsAsRead(
    module?: string,
    ): Promise<MarkAllNotificationsReadResponse> {
    return api.post<MarkAllNotificationsReadResponse>(
        `/notifications/read-all/${buildQuery({
        module,
        })}`,
        undefined,
        WEB_OPTIONS,
    );
}