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
  AuthCredentials,
  MailFolder,
  MailIntegration,
  MailMessage,
  MailMessagesPagination,
  MailSyncResponse,
} from '@beeapp/shared-types';

import {
  getValidAuthSession,
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
import {
  getMailInboxCacheMetadata,
  getStoredMailInbox,
  getStoredMailIntegrations,
  hydrateMailDetail,
  hydrateMailInbox,
  setStoredMailDetail,
  setStoredMailInbox,
  setStoredMailIntegrations,
  touchStoredMailDetail,
  updateStoredMailMessage,
  type MailInboxCacheMetadata,
  type MailInboxCacheQuery,
} from '../stores/mailStore';

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
  refreshMailIfStale: (
    maxAgeMs?: number,
  ) => Promise<boolean>;
  refreshIntegrations: () => Promise<MailIntegration[]>;
  syncInbox: () => Promise<MailSyncResponse>;
  syncInboxIfStale: (
    maxAgeMs?: number,
  ) => Promise<MailSyncResponse | null>;
  getMailCacheMetadata: () => MailInboxCacheMetadata;
  getCachedMessageById: (
    messageId: string,
  ) => Promise<MailDetailModel | null>;
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

  for (const message of [
    ...currentMessages,
    ...incomingMessages,
  ]) {
    const messageId = String(message?.id || '').trim();

    if (!messageId) {
      continue;
    }

    const current = messagesById.get(messageId);

    if (!current) {
      messagesById.set(messageId, {
        ...message,
        id: messageId,
      });
      continue;
    }

    const currentTimestamp = new Date(
      current.updated_at
      || current.received_at
      || current.sent_at
      || current.created_at
      || 0,
    ).getTime();

    const incomingTimestamp = new Date(
      message.updated_at
      || message.received_at
      || message.sent_at
      || message.created_at
      || 0,
    ).getTime();

    const incomingIsNewer = (
      incomingTimestamp >= currentTimestamp
    );

    const newest = incomingIsNewer
      ? message
      : current;

    const oldest = incomingIsNewer
      ? current
      : message;

    messagesById.set(messageId, {
      ...oldest,
      ...newest,
      id: messageId,
      sender: newest.sender || oldest.sender || null,
      recipients: newest.recipients || oldest.recipients,
      attachments: (
        newest.attachments?.length
          ? newest.attachments
          : oldest.attachments
      ),
      body_text: newest.body_text ?? oldest.body_text ?? null,
      body_html: newest.body_html ?? oldest.body_html ?? null,
    });
  }

  return Array.from(messagesById.values()).sort(
    (left, right) => {
      const leftTimestamp = new Date(
        left.received_at
        || left.sent_at
        || left.updated_at
        || left.created_at
        || 0,
      ).getTime();

      const rightTimestamp = new Date(
        right.received_at
        || right.sent_at
        || right.updated_at
        || right.created_at
        || 0,
      ).getTime();

      if (leftTimestamp !== rightTimestamp) {
        return rightTimestamp - leftTimestamp;
      }

      return left.id.localeCompare(right.id);
    },
  );
}

async function getMailAuthContext(): Promise<{
  currentUserId: string;
  token: AuthCredentials;
}> {
  const [
    session,
    token,
  ] = await Promise.all([
    getValidAuthSession(),
    getValidSessionCredentials(),
  ]);

  if (!session || !token) {
    throw new Error(
      'Tu sesión expiró. Inicia sesión nuevamente.',
    );
  }

  return {
    currentUserId: session.user.id,
    token,
  };
}

function isOlderThan(
  isoDate: string | null,
  maxAgeMs: number,
): boolean {
  if (!isoDate) {
    return true;
  }

  const timestamp = new Date(isoDate).getTime();

  if (!Number.isFinite(timestamp)) {
    return true;
  }

  return Date.now() - timestamp >= maxAgeMs;
}

export function useMail(
  {
    accountFilter = 'all',
    folder = 'inbox',
    search = '',
    autoLoad = true,
  }: UseMailOptions = {},
): UseMailResult {
  const normalizedSearch = search.trim();

  const inboxQuery = useMemo<MailInboxCacheQuery>(() => ({
    accountFilter,
    folder,
    search: normalizedSearch,
  }), [
    accountFilter,
    folder,
    normalizedSearch,
  ]);

  const integrationId = (
    accountFilter === 'all'
      ? undefined
      : accountFilter
  );

  const initialInbox = getStoredMailInbox(inboxQuery);

  const [
    integrations,
    setIntegrations,
  ] = useState<MailIntegration[]>(
    getStoredMailIntegrations(),
  );

  const [
    rawMessages,
    setRawMessages,
  ] = useState<MailMessage[]>(
    initialInbox?.messages || [],
  );

  const [
    pagination,
    setPagination,
  ] = useState<MailMessagesPagination>(
    initialInbox?.pagination || EMPTY_PAGINATION,
  );

  const [loading, setLoading] = useState(
    !initialInbox?.messages.length,
  );

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
  const rawMessagesRef = useRef<MailMessage[]>(
    initialInbox?.messages || [],
  );

  const integrationsRef = useRef<MailIntegration[]>(
    getStoredMailIntegrations(),
  );

  const currentUserIdRef = useRef<string | null>(null);

  const setMessages = useCallback((
    messages: MailMessage[],
  ) => {
    rawMessagesRef.current = messages;
    setRawMessages(messages);
  }, []);

  const synchronizeInbox = useCallback((
    messages: MailMessage[],
    nextPagination: MailMessagesPagination,
    metadata: {
      lastRefreshedAt?: string | null;
      lastProviderSyncAt?: string | null;
    } = {},
  ) => {
    setMessages(messages);
    setPagination(nextPagination);

    setStoredMailInbox(
      inboxQuery,
      messages,
      nextPagination,
      metadata,
    );
  }, [
    inboxQuery,
    setMessages,
  ]);

  const setMailIntegrations = useCallback((
    nextIntegrations: MailIntegration[],
  ) => {
    const normalizedIntegrations = [
      ...nextIntegrations,
    ];

    integrationsRef.current = normalizedIntegrations;
    setStoredMailIntegrations(normalizedIntegrations);
    setIntegrations(normalizedIntegrations);
  }, []);

  const refreshIntegrations = useCallback(async () => {
    const { token } = await getMailAuthContext();

    const response = await getMailIntegrations(
      token,
      {
        include_inactive: true,
      },
    );

    setMailIntegrations(response.integrations);

    return response.integrations;
  }, [setMailIntegrations]);

  const hydrateCurrentInbox = useCallback(async (
    userId: string,
  ) => {
    const cachedInbox = await hydrateMailInbox(
      userId,
      inboxQuery,
    );

    if (!cachedInbox) {
      return null;
    }

    setMessages(cachedInbox.messages);
    setPagination(cachedInbox.pagination);
    setLoading(false);

    return cachedInbox;
  }, [
    inboxQuery,
    setMessages,
  ]);

  const loadMail = useCallback(async (
    options: {
      refresh?: boolean;
      reloadIntegrations?: boolean;
    } = {},
  ) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const hasMemoryCache = (
      rawMessagesRef.current.length > 0
    );

    if (options.refresh) {
      setRefreshing(true);
    } else if (!hasMemoryCache) {
      setLoading(true);
    }

    setError(null);

    try {
      const {
        currentUserId,
        token,
      } = await getMailAuthContext();

      currentUserIdRef.current = currentUserId;

      const cachedInbox = await hydrateCurrentInbox(
        currentUserId,
      );

      if (requestId !== requestIdRef.current) {
        return;
      }

      const hasCachedMessages = Boolean(
        cachedInbox?.messages.length,
      );

      if (!options.refresh && hasCachedMessages) {
        setLoading(false);
      }

      const shouldReloadIntegrations = (
        Boolean(options.reloadIntegrations)
        || integrationsRef.current.length === 0
      );

      const messagesRequest = getMailMessages(
        token,
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
          token,
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

      synchronizeInbox(
        messagesResponse.messages,
        messagesResponse.pagination,
        {
          lastRefreshedAt: new Date().toISOString(),
        },
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
    hydrateCurrentInbox,
    integrationId,
    normalizedSearch,
    setMailIntegrations,
    synchronizeInbox,
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
      const {
        currentUserId,
        token,
      } = await getMailAuthContext();

      currentUserIdRef.current = currentUserId;

      const response = await getMailMessages(
        token,
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

      synchronizeInbox(
        mergedMessages,
        response.pagination,
        {
          lastRefreshedAt: new Date().toISOString(),
        },
      );
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
    synchronizeInbox,
  ]);

  const refreshMail = useCallback(async () => {
    await loadMail({
      refresh: true,
      reloadIntegrations: false,
    });
  }, [loadMail]);

  const getMailCacheMetadata = useCallback(() => (
    getMailInboxCacheMetadata(inboxQuery)
  ), [inboxQuery]);

  const refreshMailIfStale = useCallback(async (
    maxAgeMs = 60_000,
  ) => {
    const metadata = getMailInboxCacheMetadata(
      inboxQuery,
    );

    if (
      !isOlderThan(
        metadata.lastRefreshedAt,
        maxAgeMs,
      )
    ) {
      return false;
    }

    await refreshMail();

    return true;
  }, [
    inboxQuery,
    refreshMail,
  ]);

  const syncInbox = useCallback(async () => {
    if (syncing) {
      throw new Error(
        'La sincronización de correo ya está en curso.',
      );
    }

    setSyncing(true);
    setError(null);

    try {
      const {
        currentUserId,
        token,
      } = await getMailAuthContext();

      currentUserIdRef.current = currentUserId;

      const response = await syncMail(
        token,
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

      const currentInbox = getStoredMailInbox(
        inboxQuery,
      );

      if (currentInbox) {
        setStoredMailInbox(
          inboxQuery,
          currentInbox.messages,
          currentInbox.pagination,
          {
            lastProviderSyncAt: new Date().toISOString(),
          },
        );
      }

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
    inboxQuery,
    integrationId,
    loadMail,
    syncing,
  ]);

  const syncInboxIfStale = useCallback(async (
    maxAgeMs = 5 * 60_000,
  ) => {
    const metadata = getMailInboxCacheMetadata(
      inboxQuery,
    );

    if (
      !isOlderThan(
        metadata.lastProviderSyncAt,
        maxAgeMs,
      )
    ) {
      return null;
    }

    if (!integrationsRef.current.some(
      (integration) => (
        integration.status === 'active'
        && integration.can_sync
      ),
    )) {
      return null;
    }

    return syncInbox();
  }, [
    inboxQuery,
    syncInbox,
  ]);

  const getCachedMessageById = useCallback(async (
    messageId: string,
  ) => {
    const normalizedMessageId = messageId.trim();

    if (!normalizedMessageId) {
      return null;
    }

    try {
      const {
        currentUserId,
      } = await getMailAuthContext();

      currentUserIdRef.current = currentUserId;

      const cachedDetail = await hydrateMailDetail(
        currentUserId,
        normalizedMessageId,
      );

      if (cachedDetail) {
        touchStoredMailDetail(normalizedMessageId);

        return mapMailMessageToDetail(
          cachedDetail.message,
          getMailIntegrationMap(
            integrationsRef.current,
          ),
        );
      }

      const cachedListMessage = rawMessagesRef.current.find(
        (message) => message.id === normalizedMessageId,
      );

      if (!cachedListMessage) {
        return null;
      }

      return mapMailMessageToDetail(
        cachedListMessage,
        getMailIntegrationMap(
          integrationsRef.current,
        ),
      );
    } catch {
      return null;
    }
  }, []);

  const getMessageById = useCallback(async (
    messageId: string,
  ) => {
    const normalizedMessageId = messageId.trim();

    if (!normalizedMessageId) {
      throw new Error(
        'No fue posible identificar el correo.',
      );
    }

    const {
      currentUserId,
      token,
    } = await getMailAuthContext();

    currentUserIdRef.current = currentUserId;

    const shouldLoadIntegrations = (
      integrationsRef.current.length === 0
    );

    const [
      messageResponse,
      integrationsResponse,
    ] = await Promise.all([
      getMailMessage(
        token,
        normalizedMessageId,
      ),
      shouldLoadIntegrations
        ? getMailIntegrations(
          token,
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

    setStoredMailDetail(
      messageResponse.message,
      {
        lastRefreshedAt: new Date().toISOString(),
      },
    );

    updateStoredMailMessage(messageResponse.message);

    const currentMessages = rawMessagesRef.current.map(
      (message) => (
        message.id === normalizedMessageId
          ? {
              ...message,
              ...messageResponse.message,
            }
          : message
      ),
    );

    if (currentMessages.some(
      (message) => message.id === normalizedMessageId,
    )) {
      setMessages(currentMessages);
    }

    return mapMailMessageToDetail(
      messageResponse.message,
      getMailIntegrationMap(
        integrationsResponse?.integrations
        || integrationsRef.current,
      ),
    );
  }, [
    setMailIntegrations,
    setMessages,
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
      const optimisticTarget: MailMessage = {
        ...targetMessage,
        ...payload,
      };

      const optimisticMessages = previousMessages
        .map((message) => (
          message.id === normalizedMessageId
            ? optimisticTarget
            : message
        ))
        .filter((message) => shouldKeepMessageInCurrentView(
          message,
          accountFilter,
          folder,
        ));

      synchronizeInbox(
        optimisticMessages,
        pagination,
      );

      updateStoredMailMessage(optimisticTarget);
    }

    try {
      const { token } = await getMailAuthContext();

      const response = await updateMailMessageState(
        token,
        normalizedMessageId,
        payload,
      );

      const serverMessage = response.message;

      if (targetMessage) {
        const serverMessages = previousMessages
          .map((message) => (
            message.id === normalizedMessageId
              ? serverMessage
              : message
          ))
          .filter((message) => shouldKeepMessageInCurrentView(
            message,
            accountFilter,
            folder,
          ));

        synchronizeInbox(
          serverMessages,
          pagination,
        );
      }

      updateStoredMailMessage(serverMessage);
      setStoredMailDetail(
        serverMessage,
        {
          lastRefreshedAt: new Date().toISOString(),
        },
      );

      return serverMessage;
    } catch (updateError) {
      if (targetMessage) {
        synchronizeInbox(
          previousMessages,
          pagination,
        );

        updateStoredMailMessage(targetMessage);
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
    pagination,
    synchronizeInbox,
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

    synchronizeInbox(
      optimisticMessages,
      pagination,
    );

    updateStoredMailMessage(optimisticTargetMessage);

    try {
      const { token } = await getMailAuthContext();

      const response = await moveMailMessage(
        token,
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

      synchronizeInbox(
        serverMessages,
        pagination,
      );

      updateStoredMailMessage(response.message);

      setStoredMailDetail(
        response.message,
        {
          lastRefreshedAt: new Date().toISOString(),
        },
      );

      return response.message;
    } catch (moveError) {
      synchronizeInbox(
        previousMessages,
        pagination,
      );

      updateStoredMailMessage(targetMessage);

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
    pagination,
    synchronizeInbox,
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
  ) => moveMessage(
    messageId,
    'archived',
  ), [
    moveMessage,
  ]);

  const trashMessage = useCallback(async (
    messageId: string,
  ) => moveMessage(
    messageId,
    'trash',
  ), [
    moveMessage,
  ]);

  const restoreMessage = useCallback(async (
    messageId: string,
  ) => moveMessage(
    messageId,
    'inbox',
  ), [
    moveMessage,
  ]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    void loadMail({
      reloadIntegrations: (
        integrationsRef.current.length === 0
      ),
    });
  }, [
    autoLoad,
    loadMail,
  ]);

  useEffect(() => {
    const cachedInbox = getStoredMailInbox(inboxQuery);

    if (!cachedInbox) {
      return;
    }

    setMessages(cachedInbox.messages);
    setPagination(cachedInbox.pagination);
    setLoading(false);
  }, [
    inboxQuery,
    setMessages,
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
    refreshMailIfStale,
    refreshIntegrations,
    syncInbox,
    syncInboxIfStale,
    getMailCacheMetadata,
    getCachedMessageById,
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
