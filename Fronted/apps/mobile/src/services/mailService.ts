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
    isArchived: boolean;
    isSpam: boolean;
    isTrashed: boolean;
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
  bodyHtml: string | null;
    bodyPreview: string;
    sentAt: string | null;
    receivedAt: string | null;
    isRead: boolean;
    isStarred: boolean;
    isArchived: boolean;
    isSpam: boolean;
    isTrashed: boolean;
    folder: MailFolder;
    hasAttachment: boolean;
    attachmentCount: number;
    attachments: MailMessage['attachments'];
    initialsColor: string;
}

interface MailSenderData {
    email: string;
    displayName: string;
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
const FALLBACK_SENDER_NAME = 'Remitente desconocido';

const RECIPIENT_KINDS = [
    'from',
    'to',
    'cc',
    'bcc',
    'reply_to',
] as const;

function hashString(
    value: string,
    ): number {
    let hash = 0;

    for (
        let index = 0;
        index < value.length;
        index += 1
    ) {
        hash = (
        (hash << 5)
        - hash
        + value.charCodeAt(index)
        ) | 0;
    }

    return Math.abs(hash);
}

function normalizeValue(
    value: string | null | undefined,
    ): string {
    return value?.trim() || '';
}

function getRecipientFromCollection(
    message: MailMessage,
    recipientType: (
        | 'from'
        | 'reply_to'
    ),
    ): MailMessageRecipient | null {
    const recipients = message.recipients;

    if (!recipients) {
        return null;
    }

    if (Array.isArray(recipients)) {
        return recipients.find((recipient) => (
        recipient.recipient_type === recipientType
        && Boolean(normalizeValue(recipient.email))
        )) || null;
    }

    const recipientsByType = recipients[recipientType];

    if (!Array.isArray(recipientsByType)) {
        return null;
    }

    return recipientsByType.find((recipient) => (
        Boolean(normalizeValue(recipient.email))
    )) || null;
}

function getMailSender(
    message: MailMessage,
    ): MailSenderData {
    const directSenderEmail = normalizeValue(
        message.sender?.email,
    );

    const directSenderName = normalizeValue(
        message.sender?.display_name,
    );

    if (directSenderEmail || directSenderName) {
        return {
        email: directSenderEmail,
        displayName: (
            directSenderName
            || directSenderEmail
            || FALLBACK_SENDER_NAME
        ),
        };
    }

    const fromRecipient = getRecipientFromCollection(
        message,
        'from',
    );

    const fromEmail = normalizeValue(
        fromRecipient?.email,
    );

    const fromDisplayName = normalizeValue(
        fromRecipient?.display_name,
    );

    if (fromEmail || fromDisplayName) {
        return {
        email: fromEmail,
        displayName: (
            fromDisplayName
            || fromEmail
            || FALLBACK_SENDER_NAME
        ),
        };
    }

    const replyToRecipient = getRecipientFromCollection(
        message,
        'reply_to',
    );

    const replyToEmail = normalizeValue(
        replyToRecipient?.email,
    );

    const replyToDisplayName = normalizeValue(
        replyToRecipient?.display_name,
    );

    if (replyToEmail || replyToDisplayName) {
        return {
        email: replyToEmail,
        displayName: (
            replyToDisplayName
            || replyToEmail
            || FALLBACK_SENDER_NAME
        ),
        };
    }

    return {
        email: '',
        displayName: FALLBACK_SENDER_NAME,
    };
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
    return getMailSender(message).displayName;
}

export function getMailSenderEmail(
    message: MailMessage,
    ): string {
    return getMailSender(message).email;
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

export function isMailMessageArchived(
    message: MailMessage,
    ): boolean {
    return Boolean(
        message.is_archived
        || message.folder === 'archived'
    );
}

export function isMailMessageSpam(
    message: MailMessage,
    ): boolean {
    return Boolean(
        message.is_spam
        || message.folder === 'spam'
    );
}

export function isMailMessageTrashed(
    message: MailMessage,
    ): boolean {
    return Boolean(
        message.is_trashed
        || message.folder === 'trash'
    );
}

export function getMailMessageRecipients(
    message: MailMessage,
    ): MailMessageRecipient[] {
    const rawRecipients = message.recipients;

    if (!rawRecipients) {
        return [];
    }

    if (Array.isArray(rawRecipients)) {
        return rawRecipients.map((recipient) => ({
        ...recipient,
        recipient_type: (
            recipient.recipient_type
            || 'to'
        ),
        }));
    }

    const recipients: MailMessageRecipient[] = [];

    RECIPIENT_KINDS.forEach((recipientKind) => {
        const recipientsByKind = rawRecipients[recipientKind];

        if (!Array.isArray(recipientsByKind)) {
        return;
        }

        recipientsByKind.forEach((recipient) => {
        recipients.push({
            ...recipient,
            recipient_type: recipientKind,
        });
        });
    });

    return recipients;
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

    const sender = getMailSender(message);

    const dateParts = formatMailDate(
        getMailMessageTimestamp(message),
    );

    return {
        id: message.id,
        mailIntegrationId: message.mail_integration_id,
        provider: message.provider,
        senderName: sender.displayName,
        senderEmail: sender.email,
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
        isArchived: isMailMessageArchived(message),
        isSpam: isMailMessageSpam(message),
        isTrashed: isMailMessageTrashed(message),
        hasAttachment: message.has_attachments,
        attachmentCount: message.attachment_count,
        folder: message.folder,
        accountEmail,
        initialsColor: colorFromMailSeed(
        sender.email
        || sender.displayName,
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

    const sender = getMailSender(message);

    return {
        id: message.id,
        mailIntegrationId: message.mail_integration_id,
        provider: message.provider,
        accountEmail,
        subject: message.subject || '(Sin asunto)',
        senderName: sender.displayName,
        senderEmail: sender.email,
        recipients: getMailMessageRecipients(message),
        body: getMailBodyText(message),
        bodyHtml: message.body_html?.trim() || null,
        bodyPreview: (
        message.body_preview
        || message.snippet
        || 'Sin vista previa disponible.'
        ),
        sentAt: message.sent_at,
        receivedAt: message.received_at,
        isRead: message.is_read,
        isStarred: message.is_starred,
        isArchived: isMailMessageArchived(message),
        isSpam: isMailMessageSpam(message),
        isTrashed: isMailMessageTrashed(message),
        folder: message.folder,
        hasAttachment: message.has_attachments,
        attachmentCount: message.attachment_count,
        attachments: message.attachments || [],
        initialsColor: colorFromMailSeed(
        sender.email
        || sender.displayName,
        ),
    };
}