import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    } from 'react';
import {
    getMailIntegrations,
    getMailMessage,
    getMailMessages,
    moveMailMessage,
    syncMail,
    updateMailMessageState,
    } from '@beeapp/api-client';
import type {
    MailFolder,
    MailIntegration,
    MailMessage,
    MailMessagesPagination,
    MailSyncResponse,
    } from '@beeapp/shared-types';

import {
    getValidSessionCredentials,
    } from '../services/authSession';
import {
    getMailIntegrationMap,
    isMailMessageArchived,
    isMailMessageSpam,
    isMailMessageTrashed,
    mapMailMessageToDetail,
    mapMailMessageToListItem,
    type MailAccountFilter,
    type MailDetailModel,
    type MailInboxFolder,
    type MailListItemModel,
    } from '../services/mailService';

const DEFAULT_PAGE_LIMIT = 25;

const EMPTY_PAGINATION: MailMessagesPagination = {
    limit: DEFAULT_PAGE_LIMIT,
    offset: 0,
    count: 0,
    total_count: 0,
    has_more: false,
    next_offset: null,
};

export interface UseMailOptions {
    accountFilter?: MailAccountFilter;
    folder?: MailInboxFolder;
    search?: string;
    autoLoad?: boolean;
}

export interface UseMailResult {
    integrations: MailIntegration[];
    messages: MailListItemModel[];
    pagination: MailMessagesPagination;
    loading: boolean;
    refreshing: boolean;
    loadingMore: boolean;
    syncing: boolean;
    updatingMessageId: string | null;
    error: string | null;
    hasActiveIntegrations: boolean;
    loadMail: (
        options?: {
        refresh?: boolean;
        reloadIntegrations?: boolean;
        },
    ) => Promise<void>;
    loadMore: () => Promise<void>;
    refreshMail: () => Promise<void>;
    refreshIntegrations: () => Promise<MailIntegration[]>;
    syncInbox: () => Promise<MailSyncResponse>;
    getMessageById: (
        messageId: string,
    ) => Promise<MailDetailModel>;
    updateMessageState: (
        messageId: string,
        payload: {
        is_read?: boolean;
        is_starred?: boolean;
        },
    ) => Promise<MailMessage>;
    moveMessage: (
        messageId: string,
        folder: 'inbox' | 'archived' | 'spam' | 'trash',
    ) => Promise<MailMessage>;
    toggleMessageRead: (
        messageId: string,
    ) => Promise<MailMessage>;
    toggleMessageStar: (
        messageId: string,
    ) => Promise<MailMessage>;
    archiveMessage: (
        messageId: string,
    ) => Promise<MailMessage>;
    trashMessage: (
        messageId: string,
    ) => Promise<MailMessage>;
    restoreMessage: (
        messageId: string,
    ) => Promise<MailMessage>;
    clearError: () => void;
}

function getErrorMessage(
    error: unknown,
    fallback: string,
    ): string {
    if (
        error instanceof Error
        && error.message
    ) {
        return error.message;
    }

    return fallback;
}

function normalizeFolderQuery(
    folder: MailInboxFolder,
    ): {
    folder?: MailFolder;
    unread_only?: boolean;
    starred_only?: boolean;
    } {
    if (folder === 'unread') {
        return {
        folder: 'inbox',
        unread_only: true,
        };
    }

    if (folder === 'starred') {
        return {
        starred_only: true,
        };
    }

    return {
        folder,
    };
}

function shouldKeepMessageInCurrentView(
    message: MailMessage,
    accountFilter: MailAccountFilter,
    activeFolder: MailInboxFolder,
    ): boolean {
    if (
        accountFilter !== 'all'
        && message.mail_integration_id !== accountFilter
    ) {
        return false;
    }

    const isArchived = isMailMessageArchived(message);
    const isSpam = isMailMessageSpam(message);
    const isTrashed = isMailMessageTrashed(message);

    switch (activeFolder) {
        case 'unread':
        return (
            message.folder === 'inbox'
            && !message.is_read
            && !isArchived
            && !isSpam
            && !isTrashed
        );

        case 'starred':
        return (
            message.is_starred
            && !isTrashed
        );

        case 'inbox':
        return (
            message.folder === 'inbox'
            && !isArchived
            && !isSpam
            && !isTrashed
        );

        case 'archived':
        return isArchived;

        case 'spam':
        return isSpam;

        case 'trash':
        return isTrashed;

        case 'sent':
        case 'drafts':
        return (
            message.folder === activeFolder
            && !isTrashed
        );

        default:
        return message.folder === activeFolder;
    }
}

function mergeMailMessages(
    currentMessages: MailMessage[],
    incomingMessages: MailMessage[],
    ): MailMessage[] {
    const messagesById = new Map<string, MailMessage>();

    currentMessages.forEach((message) => {
        messagesById.set(message.id, message);
    });

    incomingMessages.forEach((message) => {
        messagesById.set(message.id, message);
    });

    return Array.from(messagesById.values());
}

async function getAuthCredentials() {
    const credentials = await getValidSessionCredentials();

    if (!credentials) {
        throw new Error(
        'Tu sesión expiró. Inicia sesión nuevamente.',
        );
    }

    return credentials;
}

export function useMail(
    {
        accountFilter = 'all',
        folder = 'inbox',
        search = '',
        autoLoad = true,
    }: UseMailOptions = {},
    ): UseMailResult {
    const [
        integrations,
        setIntegrations,
    ] = useState<MailIntegration[]>([]);

    const [
        rawMessages,
        setRawMessages,
    ] = useState<MailMessage[]>([]);

    const [
        pagination,
        setPagination,
    ] = useState<MailMessagesPagination>(
        EMPTY_PAGINATION,
    );

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const [
        updatingMessageId,
        setUpdatingMessageId,
    ] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(
        null,
    );

    const requestIdRef = useRef(0);
    const rawMessagesRef = useRef<MailMessage[]>([]);
    const integrationsRef = useRef<MailIntegration[]>([]);

    const setMessages = useCallback((
        messages: MailMessage[],
    ) => {
        rawMessagesRef.current = messages;
        setRawMessages(messages);
    }, []);

    const setMailIntegrations = useCallback((
        nextIntegrations: MailIntegration[],
    ) => {
        integrationsRef.current = nextIntegrations;
        setIntegrations(nextIntegrations);
    }, []);

    const normalizedSearch = search.trim();

    const integrationId = (
        accountFilter === 'all'
        ? undefined
        : accountFilter
    );

    const refreshIntegrations = useCallback(async () => {
        const auth = await getAuthCredentials();

        const response = await getMailIntegrations(
        auth,
        {
            include_inactive: true,
        },
        );

        setMailIntegrations(response.integrations);

        return response.integrations;
    }, [setMailIntegrations]);

    const loadMail = useCallback(async (
        options: {
        refresh?: boolean;
        reloadIntegrations?: boolean;
        } = {},
    ) => {
        const requestId = requestIdRef.current + 1;

        requestIdRef.current = requestId;

        if (options.refresh) {
        setRefreshing(true);
        } else {
        setLoading(true);
        }

        setError(null);

        try {
        const auth = await getAuthCredentials();

        const shouldReloadIntegrations = (
            Boolean(options.reloadIntegrations)
            || integrationsRef.current.length === 0
        );

        const messagesRequest = getMailMessages(
            auth,
            {
            integration_id: integrationId,
            ...normalizeFolderQuery(folder),
            search: normalizedSearch || undefined,
            limit: DEFAULT_PAGE_LIMIT,
            offset: 0,
            },
        );

        const integrationsRequest = shouldReloadIntegrations
            ? getMailIntegrations(
            auth,
            {
                include_inactive: true,
            },
            )
            : Promise.resolve(null);

        const [
            messagesResponse,
            integrationsResponse,
        ] = await Promise.all([
            messagesRequest,
            integrationsRequest,
        ]);

        if (requestId !== requestIdRef.current) {
            return;
        }

        if (integrationsResponse) {
            setMailIntegrations(
            integrationsResponse.integrations,
            );
        }

        setMessages(messagesResponse.messages);
        setPagination(messagesResponse.pagination);
        } catch (loadError) {
        if (requestId !== requestIdRef.current) {
            return;
        }

        setError(
            getErrorMessage(
            loadError,
            'No fue posible cargar tus correos.',
            ),
        );
        } finally {
        if (requestId === requestIdRef.current) {
            setLoading(false);
            setRefreshing(false);
        }
        }
    }, [
        folder,
        integrationId,
        normalizedSearch,
        setMailIntegrations,
        setMessages,
    ]);

    const loadMore = useCallback(async () => {
        if (
        loading
        || refreshing
        || loadingMore
        || !pagination.has_more
        || pagination.next_offset === null
        ) {
        return;
        }

        setLoadingMore(true);
        setError(null);

        try {
        const auth = await getAuthCredentials();

        const response = await getMailMessages(
            auth,
            {
            integration_id: integrationId,
            ...normalizeFolderQuery(folder),
            search: normalizedSearch || undefined,
            limit: DEFAULT_PAGE_LIMIT,
            offset: pagination.next_offset,
            },
        );

        const mergedMessages = mergeMailMessages(
            rawMessagesRef.current,
            response.messages,
        );

        setMessages(mergedMessages);
        setPagination(response.pagination);
        } catch (loadMoreError) {
        setError(
            getErrorMessage(
            loadMoreError,
            'No fue posible cargar más correos.',
            ),
        );
        } finally {
        setLoadingMore(false);
        }
    }, [
        folder,
        integrationId,
        loading,
        loadingMore,
        normalizedSearch,
        pagination.has_more,
        pagination.next_offset,
        refreshing,
        setMessages,
    ]);

    const refreshMail = useCallback(async () => {
        await loadMail({
        refresh: true,
        reloadIntegrations: false,
        });
    }, [loadMail]);

    const syncInbox = useCallback(async () => {
        setSyncing(true);
        setError(null);

        try {
        const auth = await getAuthCredentials();

        const response = await syncMail(
            auth,
            {
            integration_ids: integrationId
                ? [integrationId]
                : undefined,
            force_full_sync: false,
            },
        );

        await loadMail({
            refresh: true,
            reloadIntegrations: true,
        });

        return response;
        } catch (syncError) {
        const message = getErrorMessage(
            syncError,
            'No fue posible actualizar tus correos.',
        );

        setError(message);

        throw new Error(message);
        } finally {
        setSyncing(false);
        }
    }, [
        integrationId,
        loadMail,
    ]);

    const updateMessageState = useCallback(async (
        messageId: string,
        payload: {
        is_read?: boolean;
        is_starred?: boolean;
        },
    ) => {
        const normalizedMessageId = messageId.trim();

        if (!normalizedMessageId) {
        throw new Error(
            'No fue posible identificar el correo.',
        );
        }

        if (
        payload.is_read === undefined
        && payload.is_starred === undefined
        ) {
        throw new Error(
            'Selecciona un estado para actualizar.',
        );
        }

        const previousMessages = rawMessagesRef.current;

        const targetMessage = previousMessages.find(
        (message) => message.id === normalizedMessageId,
        );

        setUpdatingMessageId(normalizedMessageId);
        setError(null);

        if (targetMessage) {
        const optimisticMessages = previousMessages
            .map((message) => (
            message.id === normalizedMessageId
                ? {
                ...message,
                ...payload,
                }
                : message
            ))
            .filter((message) => shouldKeepMessageInCurrentView(
            message,
            accountFilter,
            folder,
            ));

        setMessages(optimisticMessages);
        }

        try {
        const auth = await getAuthCredentials();

        const response = await updateMailMessageState(
            auth,
            normalizedMessageId,
            payload,
        );

        if (targetMessage) {
            const serverMessages = previousMessages
            .map((message) => (
                message.id === normalizedMessageId
                ? response.message
                : message
            ))
            .filter((message) => shouldKeepMessageInCurrentView(
                message,
                accountFilter,
                folder,
            ));

            setMessages(serverMessages);
        }

        return response.message;
        } catch (updateError) {
        if (targetMessage) {
            setMessages(previousMessages);
        }

        const message = getErrorMessage(
            updateError,
            'No fue posible actualizar el correo.',
        );

        setError(message);

        throw new Error(message);
        } finally {
        setUpdatingMessageId((currentMessageId) => (
            currentMessageId === normalizedMessageId
            ? null
            : currentMessageId
        ));
        }
    }, [
        accountFilter,
        folder,
        setMessages,
    ]);

    const moveMessage = useCallback(async (
        messageId: string,
        destinationFolder: (
        | 'inbox'
        | 'archived'
        | 'spam'
        | 'trash'
        ),
    ) => {
        const normalizedMessageId = messageId.trim();

        if (!normalizedMessageId) {
        throw new Error(
            'No fue posible identificar el correo.',
        );
        }

        const previousMessages = rawMessagesRef.current;

        const targetMessage = previousMessages.find(
        (message) => message.id === normalizedMessageId,
        );

        if (!targetMessage) {
        throw new Error(
            'No fue posible encontrar el correo.',
        );
        }

        const optimisticTargetMessage: MailMessage = {
        ...targetMessage,
        folder: destinationFolder,
        is_archived: destinationFolder === 'archived',
        is_spam: destinationFolder === 'spam',
        is_trashed: destinationFolder === 'trash',
        };

        const optimisticMessages = previousMessages
        .map((message) => (
            message.id === normalizedMessageId
            ? optimisticTargetMessage
            : message
        ))
        .filter((message) => shouldKeepMessageInCurrentView(
            message,
            accountFilter,
            folder,
        ));

        setUpdatingMessageId(normalizedMessageId);
        setError(null);
        setMessages(optimisticMessages);

        try {
        const auth = await getAuthCredentials();

        const response = await moveMailMessage(
            auth,
            normalizedMessageId,
            {
            folder: destinationFolder,
            },
        );

        const serverMessages = previousMessages
            .map((message) => (
            message.id === normalizedMessageId
                ? response.message
                : message
            ))
            .filter((message) => shouldKeepMessageInCurrentView(
            message,
            accountFilter,
            folder,
            ));

        setMessages(serverMessages);

        return response.message;
        } catch (moveError) {
        setMessages(previousMessages);

        const message = getErrorMessage(
            moveError,
            'No fue posible mover el correo.',
        );

        setError(message);

        throw new Error(message);
        } finally {
        setUpdatingMessageId((currentMessageId) => (
            currentMessageId === normalizedMessageId
            ? null
            : currentMessageId
        ));
        }
    }, [
        accountFilter,
        folder,
        setMessages,
    ]);

    const toggleMessageRead = useCallback(async (
        messageId: string,
    ) => {
        const message = rawMessagesRef.current.find(
        (item) => item.id === messageId,
        );

        if (!message) {
        throw new Error(
            'No fue posible encontrar el correo.',
        );
        }

        return updateMessageState(
        messageId,
        {
            is_read: !message.is_read,
        },
        );
    }, [
        updateMessageState,
    ]);

    const toggleMessageStar = useCallback(async (
        messageId: string,
    ) => {
        const message = rawMessagesRef.current.find(
        (item) => item.id === messageId,
        );

        if (!message) {
        throw new Error(
            'No fue posible encontrar el correo.',
        );
        }

        return updateMessageState(
        messageId,
        {
            is_starred: !message.is_starred,
        },
        );
    }, [
        updateMessageState,
    ]);

    const archiveMessage = useCallback(async (
        messageId: string,
    ) => {
        return moveMessage(
        messageId,
        'archived',
        );
    }, [
        moveMessage,
    ]);

    const trashMessage = useCallback(async (
        messageId: string,
    ) => {
        return moveMessage(
        messageId,
        'trash',
        );
    }, [
        moveMessage,
    ]);

    const restoreMessage = useCallback(async (
        messageId: string,
    ) => {
        return moveMessage(
        messageId,
        'inbox',
        );
    }, [
        moveMessage,
    ]);

    const getMessageById = useCallback(async (
        messageId: string,
    ) => {
        const normalizedMessageId = messageId.trim();

        if (!normalizedMessageId) {
        throw new Error(
            'No fue posible identificar el correo.',
        );
        }

        const auth = await getAuthCredentials();

        const shouldLoadIntegrations = (
        integrationsRef.current.length === 0
        );

        const [
        messageResponse,
        integrationsResponse,
        ] = await Promise.all([
        getMailMessage(
            auth,
            normalizedMessageId,
        ),
        shouldLoadIntegrations
            ? getMailIntegrations(
            auth,
            {
                include_inactive: true,
            },
            )
            : Promise.resolve(null),
        ]);

        if (integrationsResponse) {
        setMailIntegrations(
            integrationsResponse.integrations,
        );
        }

        return mapMailMessageToDetail(
        messageResponse.message,
        getMailIntegrationMap(
            integrationsResponse?.integrations
            || integrationsRef.current,
        ),
        );
    }, [setMailIntegrations]);

    useEffect(() => {
        if (!autoLoad) {
        return;
        }

        void loadMail({
        reloadIntegrations: integrationsRef.current.length === 0,
        });
    }, [
        autoLoad,
        loadMail,
    ]);

    const integrationsById = useMemo(
        () => getMailIntegrationMap(integrations),
        [integrations],
    );

    const messages = useMemo(
        () => rawMessages.map((message) => (
        mapMailMessageToListItem(
            message,
            integrationsById,
        )
        )),
        [
        integrationsById,
        rawMessages,
        ],
    );

    const hasActiveIntegrations = integrations.some(
        (integration) => (
        integration.status === 'active'
        && integration.can_sync
        ),
    );

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        integrations,
        messages,
        pagination,
        loading,
        refreshing,
        loadingMore,
        syncing,
        updatingMessageId,
        error,
        hasActiveIntegrations,
        loadMail,
        loadMore,
        refreshMail,
        refreshIntegrations,
        syncInbox,
        getMessageById,
        updateMessageState,
        moveMessage,
        toggleMessageRead,
        toggleMessageStar,
        archiveMessage,
        trashMessage,
        restoreMessage,
        clearError,
    };
}