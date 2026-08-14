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