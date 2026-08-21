import type {
    MailFolder,
    MailIntegration,
    MailMessage,
    MailMessageRecipient,
    } from '@beeapp/shared-types';

export type MailAccountFilter = 'all' | string;

export type MailInboxFolder =
    | MailFolder
    | 'unread'
    | 'starred';

export interface MailListItemModel {
    id: string;
    mailIntegrationId: string;
    provider: 'google' | 'microsoft';
    senderName: string;
    senderEmail: string;
    subject: string;
    bodyPreview: string;
    timestamp: string;
    date: string;
    isRead: boolean;
    isStarred: boolean;
    hasAttachment: boolean;
    attachmentCount: number;
    folder: MailFolder;
    accountEmail: string;
    initialsColor: string;
}

export interface MailDetailModel {
    id: string;
    mailIntegrationId: string;
    provider: 'google' | 'microsoft';
    accountEmail: string;
    subject: string;
    senderName: string;
    senderEmail: string;
    recipients: MailMessageRecipient[];
    body: string;
    bodyPreview: string;
    sentAt: string | null;
    receivedAt: string | null;
    isRead: boolean;
    isStarred: boolean;
    folder: MailFolder;
    hasAttachment: boolean;
    attachmentCount: number;
    attachments: MailMessage['attachments'];
    initialsColor: string;
}

const AVATAR_COLORS = [
    '#7C3AED',
    '#059669',
    '#D97706',
    '#1D4ED8',
    '#DB2777',
    '#0891B2',
    '#EA580C',
];

const FALLBACK_ACCOUNT_LABEL = 'Cuenta conectada';

function hashString(
    value: string,
    ): number {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = (
        (hash << 5)
        - hash
        + value.charCodeAt(index)
        ) | 0;
    }

    return Math.abs(hash);
}

export function colorFromMailSeed(
    value: string,
    ): string {
    if (!value.trim()) {
        return AVATAR_COLORS[0];
    }

    return AVATAR_COLORS[
        hashString(value) % AVATAR_COLORS.length
    ];
}

export function getMailIntegrationLabel(
    integration: MailIntegration,
    ): string {
    return (
        integration.provider_email
        || integration.provider_display_name
        || integration.provider_account_id
        || FALLBACK_ACCOUNT_LABEL
    );
}

export function getMailIntegrationMap(
    integrations: MailIntegration[],
    ): Map<string, MailIntegration> {
    return new Map(
        integrations.map((integration) => [
        integration.id,
        integration,
        ]),
    );
}

export function formatMailDate(
    value: string | null,
    ): {
    date: string;
    time: string;
    } {
    if (!value) {
        return {
        date: '',
        time: '',
        };
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        return {
        date: '',
        time: '',
        };
    }

    const now = new Date();

    const isToday = (
        parsedDate.getFullYear() === now.getFullYear()
        && parsedDate.getMonth() === now.getMonth()
        && parsedDate.getDate() === now.getDate()
    );

    const time = new Intl.DateTimeFormat(
        'es-CO',
        {
        hour: 'numeric',
        minute: '2-digit',
        },
    ).format(parsedDate);

    if (isToday) {
        return {
        date: 'Hoy',
        time,
        };
    }

    const yesterday = new Date(now);

    yesterday.setDate(now.getDate() - 1);

    const isYesterday = (
        parsedDate.getFullYear() === yesterday.getFullYear()
        && parsedDate.getMonth() === yesterday.getMonth()
        && parsedDate.getDate() === yesterday.getDate()
    );

    if (isYesterday) {
        return {
        date: 'Ayer',
        time: 'Ayer',
        };
    }

    return {
        date: new Intl.DateTimeFormat(
        'es-CO',
        {
            day: 'numeric',
            month: 'short',
        },
        ).format(parsedDate),
        time,
    };
}

export function getMailMessageTimestamp(
    message: MailMessage,
    ): string | null {
    return (
        message.received_at
        || message.sent_at
        || null
    );
}

export function getMailSenderName(
    message: MailMessage,
    ): string {
    return (
        message.sender?.display_name
        || message.sender?.email
        || 'Remitente desconocido'
    );
}

export function getMailSenderEmail(
    message: MailMessage,
    ): string {
    return message.sender?.email || '';
}

export function getMailBodyText(
    message: MailMessage,
    ): string {
    return (
        message.body_text
        || message.body_preview
        || message.snippet
        || 'Este correo no contiene texto disponible.'
    );
}

export function mapMailMessageToListItem(
    message: MailMessage,
    integrationsById: Map<string, MailIntegration>,
    ): MailListItemModel {
    const integration = integrationsById.get(
        message.mail_integration_id,
    );

    const accountEmail = integration
        ? getMailIntegrationLabel(integration)
        : FALLBACK_ACCOUNT_LABEL;

    const senderName = getMailSenderName(message);
    const senderEmail = getMailSenderEmail(message);
    const dateParts = formatMailDate(
        getMailMessageTimestamp(message),
    );

    return {
        id: message.id,
        mailIntegrationId: message.mail_integration_id,
        provider: message.provider,
        senderName,
        senderEmail,
        subject: message.subject || '(Sin asunto)',
        bodyPreview: (
        message.body_preview
        || message.snippet
        || 'Sin vista previa disponible.'
        ),
        timestamp: dateParts.time || dateParts.date,
        date: dateParts.date,
        isRead: message.is_read,
        isStarred: message.is_starred,
        hasAttachment: message.has_attachments,
        attachmentCount: message.attachment_count,
        folder: message.folder,
        accountEmail,
        initialsColor: colorFromMailSeed(
        senderEmail || senderName,
        ),
    };
}

export function mapMailMessageToDetail(
    message: MailMessage,
    integrationsById: Map<string, MailIntegration>,
    ): MailDetailModel {
    const integration = integrationsById.get(
        message.mail_integration_id,
    );

    const accountEmail = integration
        ? getMailIntegrationLabel(integration)
        : FALLBACK_ACCOUNT_LABEL;

    return {
        id: message.id,
        mailIntegrationId: message.mail_integration_id,
        provider: message.provider,
        accountEmail,
        subject: message.subject || '(Sin asunto)',
        senderName: getMailSenderName(message),
        senderEmail: getMailSenderEmail(message),
        recipients: message.recipients || [],
        body: getMailBodyText(message),
        bodyPreview: (
        message.body_preview
        || message.snippet
        || 'Sin vista previa disponible.'
        ),
        sentAt: message.sent_at,
        receivedAt: message.received_at,
        isRead: message.is_read,
        isStarred: message.is_starred,
        folder: message.folder,
        hasAttachment: message.has_attachments,
        attachmentCount: message.attachment_count,
        attachments: message.attachments || [],
        initialsColor: colorFromMailSeed(
        getMailSenderEmail(message)
        || getMailSenderName(message),
        ),
    };
}