import type {
    AuthCredentials,
    GetMailIntegrationResponse,
    GetMailIntegrationsResponse,
    GetMailMessageResponse,
    GetMailMessagesResponse,
    MailMessagesQuery,
    MailSyncPayload,
    MailSyncResponse,
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
        || value === false
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

        searchParams.set(key, String(value));
    });

    const query = searchParams.toString();

    return query ? `?${query}` : '';
}

function mailIntegrationPath(
    integrationId: string,
    ): string {
    return (
        '/mail/integrations/'
        + `${encodeURIComponent(integrationId)}/`
    );
}

function mailMessagePath(
    messageId: string,
    ): string {
    return (
        '/mail/messages/'
        + `${encodeURIComponent(messageId)}/`
    );
}

export function getMailIntegrations(
    auth: AuthCredentials,
    options: {
        provider?: 'google' | 'microsoft';
        include_inactive?: boolean;
    } = {},
    ): Promise<GetMailIntegrationsResponse> {
    return api.get<GetMailIntegrationsResponse>(
        `/mail/integrations/${buildQuery({
        provider: options.provider,
        include_inactive: options.include_inactive,
        })}`,
        { auth },
    );
}

export function getMailIntegration(
    auth: AuthCredentials,
    integrationId: string,
    ): Promise<GetMailIntegrationResponse> {
    return api.get<GetMailIntegrationResponse>(
        mailIntegrationPath(integrationId),
        { auth },
    );
}

export function getMailMessages(
    auth: AuthCredentials,
    query: MailMessagesQuery = {},
    ): Promise<GetMailMessagesResponse> {
    return api.get<GetMailMessagesResponse>(
        `/mail/messages/${buildQuery(query)}`,
        { auth },
    );
}

export function getMailMessage(
    auth: AuthCredentials,
    messageId: string,
    ): Promise<GetMailMessageResponse> {
    return api.get<GetMailMessageResponse>(
        mailMessagePath(messageId),
        { auth },
    );
}

export function syncMail(
    auth: AuthCredentials,
    payload: MailSyncPayload = {},
    ): Promise<MailSyncResponse> {
    return api.post<MailSyncResponse>(
        '/mail/sync/',
        payload,
        { auth },
    );
}