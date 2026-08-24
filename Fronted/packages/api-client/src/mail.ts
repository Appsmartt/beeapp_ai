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
    downloadApiFile,
    } from './client';

type MailApiAuth = AuthCredentials | null | undefined;

function isAuthCredentials(
    value: unknown,
    ): value is AuthCredentials {
    return Boolean(
        value
        && typeof value === 'object'
        && 'token' in value
        && 'scheme' in value,
    );
}

function buildAuthOptions(
    auth?: MailApiAuth,
    ): {
    auth?: AuthCredentials;
    } {
    return auth
        ? { auth }
        : {};
}

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
            searchParams.append(key, String(item));
            }
        });

        return;
        }

        searchParams.set(key, String(value));
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
    return `${mailMessagePath(messageId)}state/`;
}

function mailMessageMovePath(
    messageId: string,
    ): string {
    return `${mailMessagePath(messageId)}move/`;
}

function mailDraftDetailPath(
    messageId: string,
    ): string {
    return `${mailMessagePath(messageId)}draft/`;
}

function mailDraftSendPath(
    messageId: string,
    ): string {
    return `${mailMessagePath(messageId)}send/`;
}

/**
 * Compatible con:
 * - Mobile: getMailIntegrations(auth, options)
 * - Web: getMailIntegrations(options)
 */
export function getMailIntegrations(
    authOrOptions?: AuthCredentials | {
        provider?: 'google' | 'microsoft';
        include_inactive?: boolean;
    },
    maybeOptions: {
        provider?: 'google' | 'microsoft';
        include_inactive?: boolean;
    } = {},
    ): Promise<GetMailIntegrationsResponse> {
    const auth = isAuthCredentials(authOrOptions)
        ? authOrOptions
        : undefined;

    const options = isAuthCredentials(authOrOptions)
        ? maybeOptions
        : (authOrOptions || {});

    return api.get<GetMailIntegrationsResponse>(
        `/mail/integrations/${buildQuery({
        provider: options.provider,
        include_inactive: options.include_inactive,
        })}`,
        buildAuthOptions(auth),
    );
}

/**
 * Compatible con:
 * - Mobile: getMailIntegration(auth, integrationId)
 * - Web: getMailIntegration(integrationId)
 */
export function getMailIntegration(
    authOrIntegrationId: AuthCredentials | string,
    maybeIntegrationId?: string,
    ): Promise<GetMailIntegrationResponse> {
    const auth = isAuthCredentials(authOrIntegrationId)
        ? authOrIntegrationId
        : undefined;

    const integrationId = isAuthCredentials(authOrIntegrationId)
        ? maybeIntegrationId
        : authOrIntegrationId;

    if (!integrationId?.trim()) {
        throw new Error(
        'No fue posible identificar la integración de correo.',
        );
    }

    return api.get<GetMailIntegrationResponse>(
        mailIntegrationPath(integrationId),
        buildAuthOptions(auth),
    );
}

/**
 * Compatible con:
 * - Mobile: getMailMessages(auth, query)
 * - Web: getMailMessages(query)
 */
export function getMailMessages(
    authOrQuery: AuthCredentials | MailMessagesQuery = {},
    maybeQuery: MailMessagesQuery = {},
    ): Promise<GetMailMessagesResponse> {
    const auth = isAuthCredentials(authOrQuery)
        ? authOrQuery
        : undefined;

    const query = isAuthCredentials(authOrQuery)
        ? maybeQuery
        : authOrQuery;

    return api.get<GetMailMessagesResponse>(
        `/mail/messages/${buildQuery(query)}`,
        buildAuthOptions(auth),
    );
}

/**
 * Compatible con:
 * - Mobile: getMailMessage(auth, messageId)
 * - Web: getMailMessage(messageId)
 */
export function getMailMessage(
    authOrMessageId: AuthCredentials | string,
    maybeMessageId?: string,
    ): Promise<GetMailMessageResponse> {
    const auth = isAuthCredentials(authOrMessageId)
        ? authOrMessageId
        : undefined;

    const messageId = isAuthCredentials(authOrMessageId)
        ? maybeMessageId
        : authOrMessageId;

    if (!messageId?.trim()) {
        throw new Error(
        'No fue posible identificar el correo.',
        );
    }

    return api.get<GetMailMessageResponse>(
        mailMessagePath(messageId),
        buildAuthOptions(auth),
    );
}

/**
 * Compatible con:
 * - Mobile: updateMailMessageState(auth, messageId, payload)
 * - Web: updateMailMessageState(messageId, payload)
 */
export function updateMailMessageState(
    authOrMessageId: AuthCredentials | string,
    messageIdOrPayload: string | UpdateMailMessageStatePayload,
    maybePayload?: UpdateMailMessageStatePayload,
    ): Promise<UpdateMailMessageStateResponse> {
    const auth = isAuthCredentials(authOrMessageId)
        ? authOrMessageId
        : undefined;

    const messageId = isAuthCredentials(authOrMessageId)
        ? messageIdOrPayload as string
        : authOrMessageId;

    const payload = isAuthCredentials(authOrMessageId)
        ? maybePayload
        : messageIdOrPayload as UpdateMailMessageStatePayload;

    if (!messageId.trim()) {
        throw new Error(
        'No fue posible identificar el correo.',
        );
    }

    if (!payload) {
        throw new Error(
        'No se recibió el estado del correo a actualizar.',
        );
    }

    return api.patch<UpdateMailMessageStateResponse>(
        mailMessageStatePath(messageId),
        payload,
        buildAuthOptions(auth),
    );
}

/**
 * Compatible con:
 * - Mobile: moveMailMessage(auth, messageId, payload)
 * - Web: moveMailMessage(messageId, payload)
 */
export function moveMailMessage(
    authOrMessageId: AuthCredentials | string,
    messageIdOrPayload: string | MoveMailMessagePayload,
    maybePayload?: MoveMailMessagePayload,
    ): Promise<MoveMailMessageResponse> {
    const auth = isAuthCredentials(authOrMessageId)
        ? authOrMessageId
        : undefined;

    const messageId = isAuthCredentials(authOrMessageId)
        ? messageIdOrPayload as string
        : authOrMessageId;

    const payload = isAuthCredentials(authOrMessageId)
        ? maybePayload
        : messageIdOrPayload as MoveMailMessagePayload;

    if (!messageId.trim()) {
        throw new Error(
        'No fue posible identificar el correo.',
        );
    }

    if (!payload) {
        throw new Error(
        'No se recibió el destino del correo.',
        );
    }

    return api.post<MoveMailMessageResponse>(
        mailMessageMovePath(messageId),
        payload,
        buildAuthOptions(auth),
    );
}

/**
 * Compatible con:
 * - Mobile: createMailDraft(auth, payload)
 * - Web: createMailDraft(payload)
 */
export function createMailDraft(
    authOrPayload: AuthCredentials | CreateMailDraftPayload,
    maybePayload?: CreateMailDraftPayload,
    ): Promise<CreateMailDraftResponse> {
    const auth = isAuthCredentials(authOrPayload)
        ? authOrPayload
        : undefined;

    const payload = isAuthCredentials(authOrPayload)
        ? maybePayload
        : authOrPayload;

    if (!payload) {
        throw new Error(
        'No se recibió la información del borrador.',
        );
    }

    return api.post<CreateMailDraftResponse>(
        '/mail/drafts/',
        payload,
        buildAuthOptions(auth),
    );
}

/**
 * Compatible con:
 * - Mobile: updateMailDraft(auth, messageId, payload)
 * - Web: updateMailDraft(messageId, payload)
 */
export function updateMailDraft(
    authOrMessageId: AuthCredentials | string,
    messageIdOrPayload: string | UpdateMailDraftPayload,
    maybePayload?: UpdateMailDraftPayload,
    ): Promise<UpdateMailDraftResponse> {
    const auth = isAuthCredentials(authOrMessageId)
        ? authOrMessageId
        : undefined;

    const messageId = isAuthCredentials(authOrMessageId)
        ? messageIdOrPayload as string
        : authOrMessageId;

    const payload = isAuthCredentials(authOrMessageId)
        ? maybePayload
        : messageIdOrPayload as UpdateMailDraftPayload;

    if (!messageId.trim()) {
        throw new Error(
        'No fue posible identificar el borrador.',
        );
    }

    if (!payload) {
        throw new Error(
        'No se recibió la información del borrador.',
        );
    }

    return api.patch<UpdateMailDraftResponse>(
        mailDraftDetailPath(messageId),
        payload,
        buildAuthOptions(auth),
    );
}

/**
 * Compatible con:
 * - Mobile: deleteMailDraft(auth, messageId)
 * - Web: deleteMailDraft(messageId)
 */
export async function deleteMailDraft(
    authOrMessageId: AuthCredentials | string,
    maybeMessageId?: string,
    ): Promise<void> {
    const auth = isAuthCredentials(authOrMessageId)
        ? authOrMessageId
        : undefined;

    const messageId = isAuthCredentials(authOrMessageId)
        ? maybeMessageId
        : authOrMessageId;

    if (!messageId?.trim()) {
        throw new Error(
        'No fue posible identificar el borrador.',
        );
    }

    await api.delete<void>(
        mailDraftDetailPath(messageId),
        buildAuthOptions(auth),
    );
}

/**
 * Compatible con:
 * - Mobile: sendMailDraft(auth, messageId)
 * - Web: sendMailDraft(messageId)
 */
export function sendMailDraft(
    authOrMessageId: AuthCredentials | string,
    maybeMessageId?: string,
    ): Promise<SendMailDraftResponse> {
    const auth = isAuthCredentials(authOrMessageId)
        ? authOrMessageId
        : undefined;

    const messageId = isAuthCredentials(authOrMessageId)
        ? maybeMessageId
        : authOrMessageId;

    if (!messageId?.trim()) {
        throw new Error(
        'No fue posible identificar el borrador.',
        );
    }

    return api.post<SendMailDraftResponse>(
        mailDraftSendPath(messageId),
        {},
        buildAuthOptions(auth),
    );
}

/**
 * Descarga temporalmente un adjunto del proveedor usando la autorización
 * de BeeApp. Nunca expone tokens OAuth a la aplicación móvil.
 */
export function downloadMailAttachment(
    auth: AuthCredentials,
    messageId: string,
    attachmentId: string,
    ): Promise<{
    blob: Blob;
    contentType: string | null;
    contentDisposition: string | null;
}> {
    const normalizedMessageId = messageId.trim();
    const normalizedAttachmentId = attachmentId.trim();

    if (!normalizedMessageId) {
        throw new Error(
        'No fue posible identificar el correo del adjunto.',
        );
    }

    if (!normalizedAttachmentId) {
        throw new Error(
        'No fue posible identificar el adjunto.',
        );
    }

    return downloadApiFile(
        (
        `${mailMessagePath(normalizedMessageId)}`
        + `attachments/${encodeURIComponent(
            normalizedAttachmentId,
        )}/download/`
        ),
        buildAuthOptions(auth),
    );
}

/**
 * Compatible con:
 * - Mobile: syncMail(auth, payload)
 * - Web: syncMail(payload)
 */
export function syncMail(
    authOrPayload: AuthCredentials | MailSyncPayload = {},
    maybePayload: MailSyncPayload = {},
    ): Promise<MailSyncResponse> {
    const auth = isAuthCredentials(authOrPayload)
        ? authOrPayload
        : undefined;

    const payload = isAuthCredentials(authOrPayload)
        ? maybePayload
        : authOrPayload;

    return api.post<MailSyncResponse>(
        '/mail/sync/',
        payload,
        buildAuthOptions(auth),
    );
}