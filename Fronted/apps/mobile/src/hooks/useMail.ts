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
    syncMail,
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
}

export interface UseMailResult {
    integrations: MailIntegration[];
    messages: MailListItemModel[];
    pagination: MailMessagesPagination;
    loading: boolean;
    refreshing: boolean;
    loadingMore: boolean;
    syncing: boolean;
    error: string | null;
    hasActiveIntegrations: boolean;
    loadMail: (
        options?: {
        refresh?: boolean;
        },
    ) => Promise<void>;
    loadMore: () => Promise<void>;
    refreshMail: () => Promise<void>;
    syncInbox: () => Promise<MailSyncResponse>;
    getMessageById: (
        messageId: string,
    ) => Promise<MailDetailModel>;
    clearError: () => void;
}

function getErrorMessage(
    error: unknown,
    fallback: string,
    ): string {
    if (error instanceof Error && error.message) {
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
    }: UseMailOptions = {},
    ): UseMailResult {
    const [integrations, setIntegrations] = useState<
        MailIntegration[]
    >([]);

    const [rawMessages, setRawMessages] = useState<
        MailMessage[]
    >([]);

    const [pagination, setPagination] = useState(
        EMPTY_PAGINATION,
    );

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const requestIdRef = useRef(0);

    const normalizedSearch = search.trim();

    const integrationId = (
        accountFilter === 'all'
        ? undefined
        : accountFilter
    );

    const loadMail = useCallback(async (
        options: {
        refresh?: boolean;
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

        const [
            integrationsResponse,
            messagesResponse,
        ] = await Promise.all([
            getMailIntegrations(
            auth,
            {
                include_inactive: true,
            },
            ),
            getMailMessages(
            auth,
            {
                integration_id: integrationId,
                ...normalizeFolderQuery(folder),
                search: normalizedSearch || undefined,
                limit: DEFAULT_PAGE_LIMIT,
                offset: 0,
            },
            ),
        ]);

        if (requestId !== requestIdRef.current) {
            return;
        }

        setIntegrations(
            integrationsResponse.integrations,
        );

        setRawMessages(messagesResponse.messages);

        setPagination(
            messagesResponse.pagination,
        );
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

        setRawMessages((currentMessages) => {
            const existingIds = new Set(
            currentMessages.map(
                (message) => message.id,
            ),
            );

            const nextMessages = response.messages.filter(
            (message) => !existingIds.has(message.id),
            );

            return [
            ...currentMessages,
            ...nextMessages,
            ];
        });

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
    ]);

    const refreshMail = useCallback(async () => {
        await loadMail({
        refresh: true,
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

        const [
        integrationsResponse,
        messageResponse,
        ] = await Promise.all([
        integrations.length > 0
            ? Promise.resolve({
            integrations,
            })
            : getMailIntegrations(
            auth,
            {
                include_inactive: true,
            },
            ),
        getMailMessage(
            auth,
            normalizedMessageId,
        ),
        ]);

        if (integrations.length === 0) {
        setIntegrations(
            integrationsResponse.integrations,
        );
        }

        return mapMailMessageToDetail(
        messageResponse.message,
        getMailIntegrationMap(
            integrationsResponse.integrations,
        ),
        );
    }, [integrations]);

    useEffect(() => {
        void loadMail();
    }, [loadMail]);

    const integrationsById = useMemo(
        () => getMailIntegrationMap(integrations),
        [integrations],
    );

    const messages = useMemo(
        () => rawMessages.map((message) =>
        mapMailMessageToListItem(
            message,
            integrationsById,
        ),
        ),
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
        error,
        hasActiveIntegrations,
        loadMail,
        loadMore,
        refreshMail,
        syncInbox,
        getMessageById,
        clearError,
    };
}