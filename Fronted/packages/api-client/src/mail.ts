import type {
    AuthCredentials,
    CreateMailDraftPayload,
    CreateMailDraftResponse,
    GetMailIntegrationResponse,
    GetMailIntegrationsResponse,
    GetMailMessageResponse,
    GetMailMessagesResponse,
    MailMessagesQuery,
    MailSyncPayload,
    MailSyncResponse,
    MoveMailMessagePayload,
    MoveMailMessageResponse,
    SendMailDraftResponse,
    UpdateMailDraftPayload,
    UpdateMailDraftResponse,
    UpdateMailMessageStatePayload,
    UpdateMailMessageStateResponse,
    } from '@beeapp/shared-types';

import {
    api,
} from './client';

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

        searchParams.set(
        key,
        String(value),
        );
    });

    const query = searchParams.toString();

    return query
        ? `?${query}`
        : '';
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

function mailMessageStatePath(
    messageId: string,
    ): string {
    return (
        `${mailMessagePath(messageId)}`
        + 'state/'
    );
}

function mailMessageMovePath(
    messageId: string,
    ): string {
    return (
        `${mailMessagePath(messageId)}`
        + 'move/'
    );
}

function mailDraftDetailPath(
    messageId: string,
    ): string {
    return (
        `${mailMessagePath(messageId)}`
        + 'draft/'
    );
}

function mailDraftSendPath(
    messageId: string,
    ): string {
    return (
        `${mailMessagePath(messageId)}`
        + 'send/'
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

export function updateMailMessageState(
    auth: AuthCredentials,
    messageId: string,
    payload: UpdateMailMessageStatePayload,
    ): Promise<UpdateMailMessageStateResponse> {
    return api.patch<UpdateMailMessageStateResponse>(
        mailMessageStatePath(messageId),
        payload,
        { auth },
    );
}

export function moveMailMessage(
    auth: AuthCredentials,
    messageId: string,
    payload: MoveMailMessagePayload,
    ): Promise<MoveMailMessageResponse> {
    return api.post<MoveMailMessageResponse>(
        mailMessageMovePath(messageId),
        payload,
        { auth },
    );
}

export function createMailDraft(
    auth: AuthCredentials,
    payload: CreateMailDraftPayload,
    ): Promise<CreateMailDraftResponse> {
    return api.post<CreateMailDraftResponse>(
        '/mail/drafts/',
        payload,
        { auth },
    );
}

export function updateMailDraft(
    auth: AuthCredentials,
    messageId: string,
    payload: UpdateMailDraftPayload,
    ): Promise<UpdateMailDraftResponse> {
    return api.patch<UpdateMailDraftResponse>(
        mailDraftDetailPath(messageId),
        payload,
        { auth },
    );
}

export async function deleteMailDraft(
    auth: AuthCredentials,
    messageId: string,
    ): Promise<void> {
    await api.delete<void>(
        mailDraftDetailPath(messageId),
        { auth },
    );
}

export function sendMailDraft(
    auth: AuthCredentials,
    messageId: string,
    ): Promise<SendMailDraftResponse> {
    return api.post<SendMailDraftResponse>(
        mailDraftSendPath(messageId),
        {},
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