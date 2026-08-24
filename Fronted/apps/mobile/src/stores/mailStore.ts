import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  MailIntegration,
  MailMessage,
  MailMessagesPagination,
} from '@beeapp/shared-types';

import type {
  MailAccountFilter,
  MailInboxFolder,
} from '../services/mailService';

const MAIL_INBOX_CACHE_PREFIX = 'beeapp.mail.inbox.v1';
const MAIL_DETAIL_CACHE_PREFIX = 'beeapp.mail.detail.v1';

const MAIL_CACHE_VERSION = 1;

export const MAX_PERSISTED_MAIL_MESSAGES_PER_VIEW = 60;
export const MAX_PERSISTED_MAIL_DETAILS = 60;

export interface MailInboxCacheQuery {
  accountFilter: MailAccountFilter;
  folder: MailInboxFolder;
  search?: string;
}

export interface MailInboxCacheMetadata {
  cachedAt: string | null;
  lastRefreshedAt: string | null;
  lastProviderSyncAt: string | null;
}

export interface MailInboxCachePayload
  extends MailInboxCacheMetadata {
  version: number;
  queryKey: string;
  messages: MailMessage[];
  pagination: MailMessagesPagination;
}

export interface MailDetailCachePayload {
  version: number;
  messageId: string;
  message: MailMessage;
  cachedAt: string;
  lastRefreshedAt: string | null;
  lastAccessedAt: string;
}

interface MailDetailsIndexPayload {
  version: number;
  messageIds: string[];
}

let activeUserId: string | null = null;

let integrations: MailIntegration[] = [];

let inboxByQueryKey: Record<
  string,
  MailInboxCachePayload
> = {};

let detailByMessageId: Record<
  string,
  MailDetailCachePayload
> = {};

let detailIdsByMostRecentAccess: string[] = [];

function getDefaultPagination(): MailMessagesPagination {
  return {
    limit: 25,
    offset: 0,
    count: 0,
    total_count: 0,
    has_more: false,
    next_offset: null,
  };
}

function normalizeUserId(
  userId: string,
): string {
  return String(userId || '').trim();
}

function normalizeMessageId(
  messageId: string,
): string {
  return String(messageId || '').trim();
}

function normalizeSearch(
  search: string | undefined,
): string {
  return String(search || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '_')
    .slice(0, 80) || 'none';
}

function getMessageTimestamp(
  message: MailMessage,
): number {
  const rawTimestamp = (
    message.received_at
    || message.sent_at
    || message.updated_at
    || message.created_at
    || ''
  );

  const timestamp = new Date(rawTimestamp).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function normalizeMessages(
  messages: MailMessage[],
): MailMessage[] {
  const messagesById = new Map<string, MailMessage>();

  for (const message of messages) {
    const messageId = normalizeMessageId(message?.id || '');

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

    const incomingIsNewer = (
      getMessageTimestamp(message)
      >= getMessageTimestamp(current)
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
      attachments: (
        newest.attachments?.length
          ? newest.attachments
          : oldest.attachments
      ),
      recipients: newest.recipients || oldest.recipients,
      sender: newest.sender || oldest.sender || null,
      body_text: newest.body_text ?? oldest.body_text ?? null,
      body_html: newest.body_html ?? oldest.body_html ?? null,
    });
  }

  return Array.from(messagesById.values())
    .sort((left, right) => {
      const timestampDifference = (
        getMessageTimestamp(right)
        - getMessageTimestamp(left)
      );

      if (timestampDifference !== 0) {
        return timestampDifference;
      }

      return left.id.localeCompare(right.id);
    });
}

function trimMessages(
  messages: MailMessage[],
): MailMessage[] {
  return normalizeMessages(messages).slice(
    0,
    MAX_PERSISTED_MAIL_MESSAGES_PER_VIEW,
  );
}

function getInboxStorageKey(
  userId: string,
  queryKey: string,
): string {
  return `${MAIL_INBOX_CACHE_PREFIX}.${userId}.${queryKey}`;
}

function getDetailStorageKey(
  userId: string,
  messageId: string,
): string {
  return `${MAIL_DETAIL_CACHE_PREFIX}.${userId}.${messageId}`;
}

function getDetailsIndexStorageKey(
  userId: string,
): string {
  return `${MAIL_DETAIL_CACHE_PREFIX}.${userId}.index`;
}

function clearInMemoryMailData(): void {
  activeUserId = null;
  integrations = [];
  inboxByQueryKey = {};
  detailByMessageId = {};
  detailIdsByMostRecentAccess = [];
}

function ensureActiveUser(
  userId: string,
): string {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    clearInMemoryMailData();

    return '';
  }

  if (
    activeUserId
    && activeUserId !== normalizedUserId
  ) {
    clearInMemoryMailData();
  }

  activeUserId = normalizedUserId;

  return normalizedUserId;
}

function getDefaultInboxMetadata(): MailInboxCacheMetadata {
  return {
    cachedAt: null,
    lastRefreshedAt: null,
    lastProviderSyncAt: null,
  };
}

function getInboxPayload(
  query: MailInboxCacheQuery,
): MailInboxCachePayload | null {
  return inboxByQueryKey[
    getMailInboxQueryKey(query)
  ] || null;
}

function persistInbox(
  queryKey: string,
): void {
  if (!activeUserId) {
    return;
  }

  const payload = inboxByQueryKey[queryKey];

  if (!payload) {
    return;
  }

  void AsyncStorage.setItem(
    getInboxStorageKey(activeUserId, queryKey),
    JSON.stringify(payload),
  ).catch(() => {
    // La persistencia no debe bloquear el uso de Mail.
  });
}

function moveDetailToMostRecent(
  messageId: string,
): void {
  detailIdsByMostRecentAccess = [
    messageId,
    ...detailIdsByMostRecentAccess.filter(
      (id) => id !== messageId,
    ),
  ];
}

function persistDetailsIndex(): void {
  if (!activeUserId) {
    return;
  }

  const payload: MailDetailsIndexPayload = {
    version: MAIL_CACHE_VERSION,
    messageIds: detailIdsByMostRecentAccess,
  };

  void AsyncStorage.setItem(
    getDetailsIndexStorageKey(activeUserId),
    JSON.stringify(payload),
  ).catch(() => {
    // La persistencia no debe bloquear el uso de Mail.
  });
}

function persistDetail(
  messageId: string,
): void {
  if (!activeUserId) {
    return;
  }

  const payload = detailByMessageId[messageId];

  if (!payload) {
    return;
  }

  void AsyncStorage.setItem(
    getDetailStorageKey(activeUserId, messageId),
    JSON.stringify(payload),
  ).catch(() => {
    // La persistencia no debe bloquear el uso de Mail.
  });
}

function removeStoredDetail(
  messageId: string,
): void {
  const normalizedMessageId = normalizeMessageId(messageId);

  if (!normalizedMessageId) {
    return;
  }

  const {
    [normalizedMessageId]: _removed,
    ...remainingDetails
  } = detailByMessageId;

  detailByMessageId = remainingDetails;

  detailIdsByMostRecentAccess = (
    detailIdsByMostRecentAccess.filter(
      (id) => id !== normalizedMessageId,
    )
  );

  if (activeUserId) {
    void AsyncStorage.removeItem(
      getDetailStorageKey(
        activeUserId,
        normalizedMessageId,
      ),
    ).catch(() => {
      // La limpieza no debe bloquear el uso de Mail.
    });
  }
}

function enforceDetailsLimit(): void {
  while (
    detailIdsByMostRecentAccess.length
    > MAX_PERSISTED_MAIL_DETAILS
  ) {
    const leastRecentlyAccessedId = (
      detailIdsByMostRecentAccess[
        detailIdsByMostRecentAccess.length - 1
      ]
    );

    removeStoredDetail(leastRecentlyAccessedId);
  }

  persistDetailsIndex();
}

function normalizeInboxPayload(
  value: Partial<MailInboxCachePayload>,
  queryKey: string,
): MailInboxCachePayload | null {
  if (
    value.version !== MAIL_CACHE_VERSION
    || value.queryKey !== queryKey
    || !Array.isArray(value.messages)
    || !value.pagination
  ) {
    return null;
  }

  return {
    version: MAIL_CACHE_VERSION,
    queryKey,
    messages: trimMessages(
      value.messages as MailMessage[],
    ),
    pagination: value.pagination as MailMessagesPagination,
    cachedAt: (
      typeof value.cachedAt === 'string'
      && value.cachedAt.trim()
        ? value.cachedAt
        : new Date().toISOString()
    ),
    lastRefreshedAt: (
      typeof value.lastRefreshedAt === 'string'
      && value.lastRefreshedAt.trim()
        ? value.lastRefreshedAt
        : null
    ),
    lastProviderSyncAt: (
      typeof value.lastProviderSyncAt === 'string'
      && value.lastProviderSyncAt.trim()
        ? value.lastProviderSyncAt
        : null
    ),
  };
}

function normalizeDetailPayload(
  value: Partial<MailDetailCachePayload>,
  messageId: string,
): MailDetailCachePayload | null {
  if (
    value.version !== MAIL_CACHE_VERSION
    || value.messageId !== messageId
    || !value.message
  ) {
    return null;
  }

  return {
    version: MAIL_CACHE_VERSION,
    messageId,
    message: {
      ...(value.message as MailMessage),
      id: messageId,
    },
    cachedAt: (
      typeof value.cachedAt === 'string'
      && value.cachedAt.trim()
        ? value.cachedAt
        : new Date().toISOString()
    ),
    lastRefreshedAt: (
      typeof value.lastRefreshedAt === 'string'
      && value.lastRefreshedAt.trim()
        ? value.lastRefreshedAt
        : null
    ),
    lastAccessedAt: (
      typeof value.lastAccessedAt === 'string'
      && value.lastAccessedAt.trim()
        ? value.lastAccessedAt
        : new Date().toISOString()
    ),
  };
}

export function getMailInboxQueryKey(
  query: MailInboxCacheQuery,
): string {
  const account = query.accountFilter === 'all'
    ? 'all'
    : String(query.accountFilter || '').trim() || 'all';

  const folder = String(
    query.folder || 'inbox',
  ).trim() || 'inbox';

  return `${account}.${folder}.${normalizeSearch(
    query.search,
  )}`;
}

export function getStoredMailIntegrations(): MailIntegration[] {
  return integrations;
}

export function setStoredMailIntegrations(
  nextIntegrations: MailIntegration[],
): void {
  integrations = [...nextIntegrations];
}

export function getStoredMailInbox(
  query: MailInboxCacheQuery,
): MailInboxCachePayload | null {
  return getInboxPayload(query);
}

export function getMailInboxCacheMetadata(
  query: MailInboxCacheQuery,
): MailInboxCacheMetadata {
  const payload = getInboxPayload(query);

  if (!payload) {
    return getDefaultInboxMetadata();
  }

  return {
    cachedAt: payload.cachedAt,
    lastRefreshedAt: payload.lastRefreshedAt,
    lastProviderSyncAt: payload.lastProviderSyncAt,
  };
}

export function setStoredMailInbox(
  query: MailInboxCacheQuery,
  messages: MailMessage[],
  pagination: MailMessagesPagination,
  metadata: Partial<MailInboxCacheMetadata> = {},
): void {
  const queryKey = getMailInboxQueryKey(query);
  const current = inboxByQueryKey[queryKey];
  const now = new Date().toISOString();

  inboxByQueryKey = {
    ...inboxByQueryKey,
    [queryKey]: {
      version: MAIL_CACHE_VERSION,
      queryKey,
      messages: trimMessages(messages),
      pagination,
      cachedAt: metadata.cachedAt
        || current?.cachedAt
        || now,
      lastRefreshedAt: metadata.lastRefreshedAt === undefined
        ? current?.lastRefreshedAt || null
        : metadata.lastRefreshedAt,
      lastProviderSyncAt: metadata.lastProviderSyncAt === undefined
        ? current?.lastProviderSyncAt || null
        : metadata.lastProviderSyncAt,
    },
  };

  persistInbox(queryKey);
}

export function mergeStoredMailInbox(
  query: MailInboxCacheQuery,
  incomingMessages: MailMessage[],
  pagination?: MailMessagesPagination,
  metadata: Partial<MailInboxCacheMetadata> = {},
): MailInboxCachePayload {
  const current = getInboxPayload(query);

  const mergedMessages = trimMessages([
    ...(current?.messages || []),
    ...incomingMessages,
  ]);

  const nextPagination = (
    pagination
    || current?.pagination
    || getDefaultPagination()
  );

  setStoredMailInbox(
    query,
    mergedMessages,
    nextPagination,
    metadata,
  );

  return getInboxPayload(query) as MailInboxCachePayload;
}

export function updateStoredMailMessage(
  message: MailMessage,
): void {
  const messageId = normalizeMessageId(message?.id || '');

  if (!messageId) {
    return;
  }

  Object.entries(inboxByQueryKey).forEach(
    ([queryKey, payload]) => {
      const nextMessages = payload.messages.map(
        (currentMessage) => (
          currentMessage.id === messageId
            ? {
                ...currentMessage,
                ...message,
                id: messageId,
              }
            : currentMessage
        ),
      );

      if (
        nextMessages.some(
          (currentMessage) => (
            currentMessage.id === messageId
          ),
        )
      ) {
        inboxByQueryKey = {
          ...inboxByQueryKey,
          [queryKey]: {
            ...payload,
            messages: trimMessages(nextMessages),
          },
        };

        persistInbox(queryKey);
      }
    },
  );

  const detail = detailByMessageId[messageId];

  if (detail) {
    detailByMessageId = {
      ...detailByMessageId,
      [messageId]: {
        ...detail,
        message: {
          ...detail.message,
          ...message,
          id: messageId,
        },
        lastRefreshedAt: new Date().toISOString(),
      },
    };

    persistDetail(messageId);
  }
}

export function removeStoredMailMessage(
  messageId: string,
): void {
  const normalizedMessageId = normalizeMessageId(messageId);

  if (!normalizedMessageId) {
    return;
  }

  Object.entries(inboxByQueryKey).forEach(
    ([queryKey, payload]) => {
      const nextMessages = payload.messages.filter(
        (message) => message.id !== normalizedMessageId,
      );

      if (nextMessages.length !== payload.messages.length) {
        inboxByQueryKey = {
          ...inboxByQueryKey,
          [queryKey]: {
            ...payload,
            messages: nextMessages,
          },
        };

        persistInbox(queryKey);
      }
    },
  );

  removeStoredDetail(normalizedMessageId);
  persistDetailsIndex();
}

export async function hydrateMailInbox(
  userId: string,
  query: MailInboxCacheQuery,
): Promise<MailInboxCachePayload | null> {
  const normalizedUserId = ensureActiveUser(userId);
  const queryKey = getMailInboxQueryKey(query);

  if (!normalizedUserId || !queryKey) {
    return null;
  }

  const existingPayload = inboxByQueryKey[queryKey];

  if (existingPayload) {
    return existingPayload;
  }

  try {
    const serializedPayload = await AsyncStorage.getItem(
      getInboxStorageKey(normalizedUserId, queryKey),
    );

    if (!serializedPayload) {
      return null;
    }

    const parsedPayload = JSON.parse(
      serializedPayload,
    ) as Partial<MailInboxCachePayload>;

    const payload = normalizeInboxPayload(
      parsedPayload,
      queryKey,
    );

    if (!payload) {
      await AsyncStorage.removeItem(
        getInboxStorageKey(normalizedUserId, queryKey),
      );

      return null;
    }

    inboxByQueryKey = {
      ...inboxByQueryKey,
      [queryKey]: payload,
    };

    return payload;
  } catch {
    return null;
  }
}

export function getStoredMailDetail(
  messageId: string,
): MailDetailCachePayload | null {
  const normalizedMessageId = normalizeMessageId(messageId);

  if (!normalizedMessageId) {
    return null;
  }

  return detailByMessageId[normalizedMessageId] || null;
}

export async function hydrateMailDetail(
  userId: string,
  messageId: string,
): Promise<MailDetailCachePayload | null> {
  const normalizedUserId = ensureActiveUser(userId);
  const normalizedMessageId = normalizeMessageId(messageId);

  if (!normalizedUserId || !normalizedMessageId) {
    return null;
  }

  const existingPayload = detailByMessageId[
    normalizedMessageId
  ];

  if (existingPayload) {
    moveDetailToMostRecent(normalizedMessageId);

    return existingPayload;
  }

  try {
    const serializedPayload = await AsyncStorage.getItem(
      getDetailStorageKey(
        normalizedUserId,
        normalizedMessageId,
      ),
    );

    if (!serializedPayload) {
      return null;
    }

    const parsedPayload = JSON.parse(
      serializedPayload,
    ) as Partial<MailDetailCachePayload>;

    const payload = normalizeDetailPayload(
      parsedPayload,
      normalizedMessageId,
    );

    if (!payload) {
      await AsyncStorage.removeItem(
        getDetailStorageKey(
          normalizedUserId,
          normalizedMessageId,
        ),
      );

      return null;
    }

    detailByMessageId = {
      ...detailByMessageId,
      [normalizedMessageId]: payload,
    };

    moveDetailToMostRecent(normalizedMessageId);
    persistDetailsIndex();

    return payload;
  } catch {
    return null;
  }
}

export function setStoredMailDetail(
  message: MailMessage,
  metadata: {
    lastRefreshedAt?: string | null;
  } = {},
): void {
  const messageId = normalizeMessageId(message?.id || '');

  if (!messageId) {
    return;
  }

  const now = new Date().toISOString();

  detailByMessageId = {
    ...detailByMessageId,
    [messageId]: {
      version: MAIL_CACHE_VERSION,
      messageId,
      message: {
        ...message,
        id: messageId,
      },
      cachedAt: (
        detailByMessageId[messageId]?.cachedAt
        || now
      ),
      lastRefreshedAt: (
        metadata.lastRefreshedAt === undefined
          ? (
              detailByMessageId[messageId]
                ?.lastRefreshedAt
              || now
            )
          : metadata.lastRefreshedAt
      ),
      lastAccessedAt: now,
    },
  };

  moveDetailToMostRecent(messageId);
  enforceDetailsLimit();
  persistDetail(messageId);
}

export function touchStoredMailDetail(
  messageId: string,
): void {
  const normalizedMessageId = normalizeMessageId(messageId);
  const detail = detailByMessageId[normalizedMessageId];

  if (!detail) {
    return;
  }

  const now = new Date().toISOString();

  detailByMessageId = {
    ...detailByMessageId,
    [normalizedMessageId]: {
      ...detail,
      lastAccessedAt: now,
    },
  };

  moveDetailToMostRecent(normalizedMessageId);
  persistDetail(normalizedMessageId);
  persistDetailsIndex();
}

export async function hydrateMailDetailsIndex(
  userId: string,
): Promise<string[]> {
  const normalizedUserId = ensureActiveUser(userId);

  if (!normalizedUserId) {
    return [];
  }

  if (detailIdsByMostRecentAccess.length > 0) {
    return detailIdsByMostRecentAccess;
  }

  try {
    const serializedPayload = await AsyncStorage.getItem(
      getDetailsIndexStorageKey(normalizedUserId),
    );

    if (!serializedPayload) {
      return [];
    }

    const payload = JSON.parse(
      serializedPayload,
    ) as Partial<MailDetailsIndexPayload>;

    if (
      payload.version !== MAIL_CACHE_VERSION
      || !Array.isArray(payload.messageIds)
    ) {
      await AsyncStorage.removeItem(
        getDetailsIndexStorageKey(normalizedUserId),
      );

      return [];
    }

    detailIdsByMostRecentAccess = payload.messageIds
      .map((messageId) => normalizeMessageId(messageId))
      .filter(Boolean)
      .slice(0, MAX_PERSISTED_MAIL_DETAILS);

    return detailIdsByMostRecentAccess;
  } catch {
    return [];
  }
}

export async function clearMailCacheForUser(
  userId?: string,
): Promise<void> {
  const targetUserId = normalizeUserId(
    userId || activeUserId || '',
  );

  if (!targetUserId) {
    clearInMemoryMailData();

    return;
  }

  const keys = await AsyncStorage.getAllKeys();

  const userPrefix = (
    `${MAIL_INBOX_CACHE_PREFIX}.${targetUserId}.`
  );

  const detailsPrefix = (
    `${MAIL_DETAIL_CACHE_PREFIX}.${targetUserId}.`
  );

  const keysToRemove = keys.filter((key) => (
    key.startsWith(userPrefix)
    || key.startsWith(detailsPrefix)
  ));

  if (keysToRemove.length > 0) {
    await AsyncStorage.multiRemove(keysToRemove);
  }

  if (
    !userId
    || targetUserId === activeUserId
  ) {
    clearInMemoryMailData();
  }
}
