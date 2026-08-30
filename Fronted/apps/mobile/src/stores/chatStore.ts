import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  ChatConversation,
  ChatMessage,
  ChatRealtimeEvent,
} from '@beeapp/shared-types';

const CHAT_INBOX_CACHE_PREFIX = 'beeapp.chat.inbox.v2';
const CHAT_MESSAGES_CACHE_PREFIX = 'beeapp.chat.messages.v3';
const CHAT_ARCHIVED_CONVERSATIONS_PREFIX = (
  'beeapp.chat.archived-conversations.v1'
);

const CHAT_INBOX_CACHE_VERSION = 2;
const CHAT_MESSAGES_CACHE_VERSION = 3;
const MAX_PERSISTED_MESSAGES_PER_CONVERSATION = 300;

interface ChatInboxCachePayload {
  version: number;
  conversations: ChatConversation[];
  lastSyncedAt: string | null;
}

interface ChatMessagesCachePayload {
  version: number;
  conversationId: string;
  messages: ChatMessage[];
  nextBeforeSequence: number | null;
  hasMore: boolean;
  lastSyncedAt: string | null;
}

interface ChatMessagesCacheMetadata {
  nextBeforeSequence: number | null;
  hasMore: boolean;
  lastSyncedAt: string | null;
}

let conversations: ChatConversation[] = [];

let messagesByConversationId: Record<
  string,
  ChatMessage[]
> = {};

let messageCacheMetadataByConversationId: Record<
  string,
  ChatMessagesCacheMetadata
> = {};

let protectedConversationIds: string[] = [];
let archivedConversationIds: string[] = [];

let activeUserId: string | null = null;

export type ChatStoreChange =
  | {
      type: 'conversations';
      conversationIds?: string[];
    }
  | {
      type: 'messages';
      conversationId: string;
    }
  | {
      type: 'conversation-removed';
      conversationId: string;
    }
  | {
      type: 'reset';
    };

export type ChatStoreListener = (
  change: ChatStoreChange,
) => void;

const chatStoreListeners = new Set<ChatStoreListener>();

export function subscribeChatStore(
  listener: ChatStoreListener,
): () => void {
  chatStoreListeners.add(listener);

  return () => {
    chatStoreListeners.delete(listener);
  };
}

function notifyChatStore(
  change: ChatStoreChange,
): void {
  chatStoreListeners.forEach((listener) => {
    try {
      listener(change);
    } catch {
      // Un listener no debe impedir actualizar a los demás.
    }
  });
}

const RECENT_CHAT_EVENT_LIMIT = 500;
const recentChatEventIds = new Set<string>();
const recentChatEventOrder: string[] = [];

function rememberChatEvent(
  eventId: string,
): boolean {
  const normalizedEventId = String(eventId || '').trim();

  if (!normalizedEventId) {
    return true;
  }

  if (recentChatEventIds.has(normalizedEventId)) {
    return false;
  }

  recentChatEventIds.add(normalizedEventId);
  recentChatEventOrder.push(normalizedEventId);

  while (
    recentChatEventOrder.length
    > RECENT_CHAT_EVENT_LIMIT
  ) {
    const expiredEventId = recentChatEventOrder.shift();

    if (expiredEventId) {
      recentChatEventIds.delete(expiredEventId);
    }
  }

  return true;
}

function getInboxCacheKey(
  userId: string,
): string {
  return `${CHAT_INBOX_CACHE_PREFIX}.${userId}`;
}

function getMessagesCacheKey(
  userId: string,
  conversationId: string,
): string {
  return (
    `${CHAT_MESSAGES_CACHE_PREFIX}.${userId}.`
    + `${conversationId}`
  );
}

function getMessagesCachePrefix(
  userId: string,
): string {
  return `${CHAT_MESSAGES_CACHE_PREFIX}.${userId}.`;
}

function getArchivedConversationsCacheKey(
  userId: string,
): string {
  return (
    `${CHAT_ARCHIVED_CONVERSATIONS_PREFIX}.${userId}`
  );
}

function hasConversationId(
  conversation: ChatConversation | null | undefined,
): conversation is ChatConversation {
  return Boolean(
    conversation
    && typeof conversation.id === 'string'
    && conversation.id.trim(),
  );
}

function normalizeConversationId(
  conversationId: string,
): string {
  return String(conversationId || '').trim();
}

function normalizeConversationIds(
  conversationIds: string[],
): string[] {
  return Array.from(
    new Set(
      conversationIds
        .map(normalizeConversationId)
        .filter(Boolean),
    ),
  );
}

function getConversationTimestamp(
  conversation: ChatConversation,
): number {
  const value = (
    conversation.last_message_at
    || conversation.last_message?.created_at
    || conversation.updated_at
    || conversation.created_at
  );

  const timestamp = value
    ? new Date(value).getTime()
    : 0;

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function getMessageTimestamp(
  message: ChatMessage,
): number {
  const timestamp = new Date(
    message.created_at,
  ).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function getMessageSequence(
  message: ChatMessage,
): number | null {
  const sequenceNumber = message.sequence_number;

  return (
    typeof sequenceNumber === 'number'
    && Number.isFinite(sequenceNumber)
    && sequenceNumber > 0
  )
    ? sequenceNumber
    : null;
}

function compareMessages(
  left: ChatMessage,
  right: ChatMessage,
): number {
  const leftSequence = getMessageSequence(left);
  const rightSequence = getMessageSequence(right);

  if (
    leftSequence !== null
    && rightSequence !== null
    && leftSequence !== rightSequence
  ) {
    return leftSequence - rightSequence;
  }

  const timestampDifference = (
    getMessageTimestamp(left)
    - getMessageTimestamp(right)
  );

  if (timestampDifference !== 0) {
    return timestampDifference;
  }

  return left.id.localeCompare(right.id);
}

function mergeMessage(
  current: ChatMessage,
  incoming: ChatMessage,
): ChatMessage {
  const currentSequence = getMessageSequence(current);
  const incomingSequence = getMessageSequence(incoming);

  const currentTimestamp = getMessageTimestamp(current);
  const incomingTimestamp = getMessageTimestamp(incoming);

  const incomingIsNewer = (
    incomingSequence !== null
    && (
      currentSequence === null
      || incomingSequence >= currentSequence
    )
  )
  || (
    incomingSequence === null
    && (
      currentSequence === null
      || incomingTimestamp >= currentTimestamp
    )
  );

  const newest = incomingIsNewer
    ? incoming
    : current;

  const oldest = incomingIsNewer
    ? current
    : incoming;

  return {
    ...oldest,
    ...newest,
    id: newest.id,
    conversation_id: (
      newest.conversation_id
      || oldest.conversation_id
    ),
    sequence_number: (
      newest.sequence_number
      ?? oldest.sequence_number
    ),
    attachments: (
      newest.attachments?.length
        ? newest.attachments
        : oldest.attachments
    ),
    sender: newest.sender || oldest.sender || null,
    reply_to: newest.reply_to || oldest.reply_to || null,
  };
}

function normalizeMessages(
  nextMessages: ChatMessage[],
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();

  for (const message of nextMessages) {
    const id = String(message?.id || '').trim();

    if (!id) {
      continue;
    }

    const current = byId.get(id);

    byId.set(
      id,
      current
        ? mergeMessage(current, {
            ...message,
            id,
          })
        : {
            ...message,
            id,
          },
    );
  }

  return Array.from(byId.values()).sort(
    compareMessages,
  );
}

function mergeConversation(
  current: ChatConversation,
  incoming: ChatConversation,
): ChatConversation {
  const currentTimestamp = getConversationTimestamp(current);
  const incomingTimestamp = getConversationTimestamp(incoming);

  const newest = incomingTimestamp >= currentTimestamp
    ? incoming
    : current;

  const oldest = newest === incoming
    ? current
    : incoming;

  return {
    ...oldest,
    ...newest,
    id: newest.id,
    participants: (
      newest.participants?.length
        ? newest.participants
        : oldest.participants
    ),
    last_message: (
      newest.last_message
      || oldest.last_message
      || null
    ),
    last_message_at: (
      newest.last_message_at
      || oldest.last_message_at
      || null
    ),
    cached_avatar_url: (
      newest.avatar_url
      && oldest.avatar_url
      && newest.avatar_url !== oldest.avatar_url
        ? null
        : (
            newest.cached_avatar_url
            || oldest.cached_avatar_url
            || null
          )
    ),
  };
}

function normalizeConversations(
  nextConversations: ChatConversation[],
): ChatConversation[] {
  const byId = new Map<string, ChatConversation>();

  for (const conversation of nextConversations) {
    if (!hasConversationId(conversation)) {
      continue;
    }

    const id = conversation.id.trim();
    const current = byId.get(id);

    byId.set(
      id,
      current
        ? mergeConversation(current, {
            ...conversation,
            id,
          })
        : {
            ...conversation,
            id,
          },
    );
  }

  return Array.from(byId.values()).sort(
    (left, right) => (
      getConversationTimestamp(right)
      - getConversationTimestamp(left)
    ),
  );
}

function getDefaultMessageCacheMetadata(): ChatMessagesCacheMetadata {
  return {
    nextBeforeSequence: null,
    hasMore: false,
    lastSyncedAt: null,
  };
}

function getMessageCacheMetadata(
  conversationId: string,
): ChatMessagesCacheMetadata {
  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  return (
    messageCacheMetadataByConversationId[
      normalizedConversationId
    ]
    || getDefaultMessageCacheMetadata()
  );
}

function persistConversations(
  lastSyncedAt: string | null = null,
): void {
  if (!activeUserId) {
    return;
  }

  const payload: ChatInboxCachePayload = {
    version: CHAT_INBOX_CACHE_VERSION,
    conversations,
    lastSyncedAt,
  };

  void AsyncStorage.setItem(
    getInboxCacheKey(activeUserId),
    JSON.stringify(payload),
  ).catch(() => {
    // Cache persistence must never block chat usage.
  });
}

function persistArchivedConversationIds(): void {
  if (!activeUserId) {
    return;
  }

  void AsyncStorage.setItem(
    getArchivedConversationsCacheKey(activeUserId),
    JSON.stringify(archivedConversationIds),
  ).catch(() => {
    // Archive persistence must never block chat usage.
  });
}

function persistMessages(
  conversationId: string,
): void {
  if (!activeUserId) {
    return;
  }

  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  if (!normalizedConversationId) {
    return;
  }

  const messages = getChatMessages(
    normalizedConversationId,
  );

  const metadata = getMessageCacheMetadata(
    normalizedConversationId,
  );

  const persistedMessages = messages.slice(
    -MAX_PERSISTED_MESSAGES_PER_CONVERSATION,
  );

  const payload: ChatMessagesCachePayload = {
    version: CHAT_MESSAGES_CACHE_VERSION,
    conversationId: normalizedConversationId,
    messages: persistedMessages,
    nextBeforeSequence: metadata.nextBeforeSequence,
    hasMore: metadata.hasMore,
    lastSyncedAt: metadata.lastSyncedAt,
  };

  void AsyncStorage.setItem(
    getMessagesCacheKey(
      activeUserId,
      normalizedConversationId,
    ),
    JSON.stringify(payload),
  ).catch(() => {
    // Cache persistence must never block chat usage.
  });
}

function clearInMemoryChatData(): void {
  conversations = [];
  messagesByConversationId = {};
  messageCacheMetadataByConversationId = {};
  protectedConversationIds = [];
  archivedConversationIds = [];
  activeUserId = null;

  notifyChatStore({
    type: 'reset',
  });
}

function removeMessageCachesNotInSnapshot(
  userId: string,
  conversationIds: string[],
): void {
  const validConversationIds = new Set(
    normalizeConversationIds(conversationIds),
  );

  void AsyncStorage.getAllKeys()
    .then((keys) => {
      const messageCachePrefix = getMessagesCachePrefix(userId);

      const staleKeys = keys.filter((key) => {
        if (!key.startsWith(messageCachePrefix)) {
          return false;
        }

        const conversationId = key.slice(
          messageCachePrefix.length,
        );

        return !validConversationIds.has(conversationId);
      });

      if (!staleKeys.length) {
        return;
      }

      return AsyncStorage.multiRemove(staleKeys);
    })
    .catch(() => {
      // Snapshot cleanup must never block chat usage.
    });
}

export async function hydrateChatConversations(
  userId: string,
): Promise<ChatConversation[]> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    clearInMemoryChatData();

    return conversations;
  }

  if (activeUserId === normalizedUserId) {
    return conversations;
  }

  clearInMemoryChatData();
  activeUserId = normalizedUserId;

  try {
    const [
      serializedConversations,
      serializedArchivedConversationIds,
    ] = await Promise.all([
      AsyncStorage.getItem(
        getInboxCacheKey(normalizedUserId),
      ),
      AsyncStorage.getItem(
        getArchivedConversationsCacheKey(normalizedUserId),
      ),
    ]);

    if (serializedArchivedConversationIds) {
      try {
        const parsedArchivedIds = JSON.parse(
          serializedArchivedConversationIds,
        );

        if (Array.isArray(parsedArchivedIds)) {
          archivedConversationIds = normalizeConversationIds(
            parsedArchivedIds,
          );
        }
      } catch {
        archivedConversationIds = [];
      }
    }

    if (!serializedConversations) {
      return conversations;
    }

    const parsedPayload = JSON.parse(
      serializedConversations,
    ) as Partial<ChatInboxCachePayload>;

    const validPayload = (
      parsedPayload
      && parsedPayload.version === CHAT_INBOX_CACHE_VERSION
      && Array.isArray(parsedPayload.conversations)
    );

    if (!validPayload) {
      await AsyncStorage.removeItem(
        getInboxCacheKey(normalizedUserId),
      );

      return conversations;
    }

    conversations = normalizeConversations(
      parsedPayload.conversations as ChatConversation[],
    );

    notifyChatStore({
      type: 'conversations',
      conversationIds: conversations.map(
        (conversation) => conversation.id,
      ),
    });

    return conversations;
  } catch {
    return conversations;
  }
}

export async function hydrateChatMessages(
  userId: string,
  conversationId: string,
): Promise<ChatMessage[]> {
  const normalizedUserId = userId.trim();
  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  if (
    !normalizedUserId
    || !normalizedConversationId
  ) {
    return [];
  }

  if (activeUserId !== normalizedUserId) {
    await hydrateChatConversations(normalizedUserId);
  }

  if (
    Object.prototype.hasOwnProperty.call(
      messagesByConversationId,
      normalizedConversationId,
    )
  ) {
    return getChatMessages(normalizedConversationId);
  }

  try {
    const serializedPayload = await AsyncStorage.getItem(
      getMessagesCacheKey(
        normalizedUserId,
        normalizedConversationId,
      ),
    );

    if (!serializedPayload) {
      messagesByConversationId = {
        ...messagesByConversationId,
        [normalizedConversationId]: [],
      };

      return [];
    }

    const parsedPayload = JSON.parse(
      serializedPayload,
    ) as Partial<ChatMessagesCachePayload>;

    const validPayload = (
      parsedPayload
      && parsedPayload.version === CHAT_MESSAGES_CACHE_VERSION
      && parsedPayload.conversationId === normalizedConversationId
      && Array.isArray(parsedPayload.messages)
    );

    if (!validPayload) {
      await AsyncStorage.removeItem(
        getMessagesCacheKey(
          normalizedUserId,
          normalizedConversationId,
        ),
      );

      messagesByConversationId = {
        ...messagesByConversationId,
        [normalizedConversationId]: [],
      };

      return [];
    }

    const hydratedMessages = normalizeMessages(
      parsedPayload.messages as ChatMessage[],
    );

    messagesByConversationId = {
      ...messagesByConversationId,
      [normalizedConversationId]: hydratedMessages,
    };

    notifyChatStore({
      type: 'messages',
      conversationId: normalizedConversationId,
    });

    messageCacheMetadataByConversationId = {
      ...messageCacheMetadataByConversationId,
      [normalizedConversationId]: {
        nextBeforeSequence: (
          typeof parsedPayload.nextBeforeSequence === 'number'
          && Number.isFinite(
            parsedPayload.nextBeforeSequence,
          )
            ? parsedPayload.nextBeforeSequence
            : null
        ),
        hasMore: Boolean(parsedPayload.hasMore),
        lastSyncedAt: (
          typeof parsedPayload.lastSyncedAt === 'string'
          && parsedPayload.lastSyncedAt.trim()
            ? parsedPayload.lastSyncedAt
            : null
        ),
      },
    };

    return hydratedMessages;
  } catch {
    messagesByConversationId = {
      ...messagesByConversationId,
      [normalizedConversationId]: [],
    };

    return [];
  }
}

export async function clearChatConversationsCache(
  userId?: string,
): Promise<void> {
  const targetUserId = (userId || activeUserId || '').trim();

  if (targetUserId) {
    const messageCachePrefix = getMessagesCachePrefix(
      targetUserId,
    );

    const keys = await AsyncStorage.getAllKeys();

    const keysToRemove = keys.filter((key) => (
      key === getInboxCacheKey(targetUserId)
      || key === getArchivedConversationsCacheKey(targetUserId)
      || key.startsWith(messageCachePrefix)
    ));

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  }

  if (!userId || userId === activeUserId) {
    clearInMemoryChatData();
  }
}

export async function clearChatMessagesCache(
  userId: string,
  conversationId: string,
): Promise<void> {
  const normalizedUserId = userId.trim();
  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  if (
    !normalizedUserId
    || !normalizedConversationId
  ) {
    return;
  }

  await AsyncStorage.removeItem(
    getMessagesCacheKey(
      normalizedUserId,
      normalizedConversationId,
    ),
  );

  if (activeUserId === normalizedUserId) {
    const {
      [normalizedConversationId]: _removedMessages,
      ...remainingMessages
    } = messagesByConversationId;

    const {
      [normalizedConversationId]: _removedMetadata,
      ...remainingMetadata
    } = messageCacheMetadataByConversationId;

    messagesByConversationId = remainingMessages;
    messageCacheMetadataByConversationId = remainingMetadata;
  }
}

export function getChatConversations(): ChatConversation[] {
  return conversations;
}

export function setChatConversations(
  nextConversations: ChatConversation[],
): void {
  conversations = normalizeConversations(nextConversations);
  persistConversations();

  notifyChatStore({
    type: 'conversations',
    conversationIds: conversations.map(
      (conversation) => conversation.id,
    ),
  });
}

export function replaceChatConversationsSnapshot(
  nextConversations: ChatConversation[],
  options: {
    lastSyncedAt?: string | null;
    removeStaleMessageCaches?: boolean;
  } = {},
): void {
  conversations = normalizeConversations(nextConversations);

  const lastSyncedAt = (
    options.lastSyncedAt === undefined
      ? new Date().toISOString()
      : options.lastSyncedAt
  );

  persistConversations(lastSyncedAt);

  notifyChatStore({
    type: 'conversations',
    conversationIds: conversations.map(
      (conversation) => conversation.id,
    ),
  });

  if (
    options.removeStaleMessageCaches !== false
    && activeUserId
  ) {
    removeMessageCachesNotInSnapshot(
      activeUserId,
      conversations.map((conversation) => conversation.id),
    );
  }
}

export function upsertChatConversation(
  conversation: ChatConversation,
): void {
  if (!hasConversationId(conversation)) {
    return;
  }

  setChatConversations([
    conversation,
    ...conversations,
  ]);
}

export function applyChatRealtimeEvent(
  event: ChatRealtimeEvent,
): boolean {
  if (!rememberChatEvent(event.event_id)) {
    return false;
  }

  if (
    event.event_type === 'chat.message.created'
    || event.event_type === 'chat.message.updated'
  ) {
    const payload = event.payload;

    if (
      !('conversation_id' in payload)
      || !('message' in payload)
    ) {
      return false;
    }

    const conversationId = normalizeConversationId(
      payload.conversation_id,
    );

    if (!conversationId) {
      return false;
    }

    upsertChatMessage(
      conversationId,
      payload.message,
    );

    const currentConversation = conversations.find(
      (conversation) => conversation.id === conversationId,
    );

    if (currentConversation) {
      const patch = payload.conversation_patch;

      upsertChatConversation({
        ...currentConversation,
        last_message: payload.message,
        last_message_at: (
          patch?.last_message_at
          || payload.message.created_at
        ),
        updated_at: (
          patch?.updated_at
          || payload.message.updated_at
          || payload.message.created_at
        ),
        unread_count: (
          typeof patch?.unread_count === 'number'
            ? patch.unread_count
            : currentConversation.unread_count
        ),
      });
    }

    return true;
  }

  if (event.event_type === 'chat.message.deleted') {
    const payload = event.payload;

    if (
      !('conversation_id' in payload)
      || !('message_id' in payload)
    ) {
      return false;
    }

    const conversationId = normalizeConversationId(
      payload.conversation_id,
    );

    const messageId = String(
      payload.message_id || '',
    ).trim();

    if (!conversationId || !messageId) {
      return false;
    }

    const currentMessages = getChatMessages(conversationId);

    setChatMessages(
      conversationId,
      currentMessages.map((message) => (
        message.id === messageId
          ? {
              ...message,
              deleted_at: (
                payload.deleted_at
                || event.occurred_at
              ),
              destroyed_at: (
                payload.destroyed_at
                || message.destroyed_at
                || null
              ),
              content: '',
              attachments: [],
            }
          : message
      )),
    );

    return true;
  }

  if (event.event_type === 'chat.conversation.updated') {
    const payload = event.payload;

    if ('conversation' in payload) {
      upsertChatConversation(payload.conversation);
      return true;
    }
  }

  return false;
}

export function updateChatConversationLastMessage(
  conversationId: string,
  message: ChatMessage,
): void {
  const currentConversation = conversations.find(
    (conversation) => conversation.id === conversationId,
  );

  if (!currentConversation) {
    return;
  }

  upsertChatConversation({
    ...currentConversation,
    last_message: message,
    last_message_at: message.created_at,
    updated_at: message.created_at,
  });
}

export function removeChatConversation(
  conversationId: string,
): void {
  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  conversations = conversations.filter(
    (item) => item.id !== normalizedConversationId,
  );

  archivedConversationIds = archivedConversationIds.filter(
    (id) => id !== normalizedConversationId,
  );

  const {
    [normalizedConversationId]: _removedMessages,
    ...remainingMessages
  } = messagesByConversationId;

  const {
    [normalizedConversationId]: _removedMetadata,
    ...remainingMetadata
  } = messageCacheMetadataByConversationId;

  messagesByConversationId = remainingMessages;
  messageCacheMetadataByConversationId = remainingMetadata;

  protectedConversationIds = protectedConversationIds.filter(
    (id) => id !== normalizedConversationId,
  );

  persistConversations();
  persistArchivedConversationIds();

  notifyChatStore({
    type: 'conversation-removed',
    conversationId: normalizedConversationId,
  });

  if (activeUserId && normalizedConversationId) {
    void AsyncStorage.removeItem(
      getMessagesCacheKey(
        activeUserId,
        normalizedConversationId,
      ),
    ).catch(() => {
      // Cache cleanup must never block chat usage.
    });
  }
}

export function getChatMessages(
  conversationId: string,
): ChatMessage[] {
  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  return (
    messagesByConversationId[
      normalizedConversationId
    ]
    || []
  );
}

export function getChatMessagesCacheMetadata(
  conversationId: string,
): ChatMessagesCacheMetadata {
  return getMessageCacheMetadata(conversationId);
}

export function setChatMessagesCacheMetadata(
  conversationId: string,
  metadata: Partial<ChatMessagesCacheMetadata>,
): void {
  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  if (!normalizedConversationId) {
    return;
  }

  const current = getMessageCacheMetadata(
    normalizedConversationId,
  );

  messageCacheMetadataByConversationId = {
    ...messageCacheMetadataByConversationId,
    [normalizedConversationId]: {
      nextBeforeSequence: (
        metadata.nextBeforeSequence === undefined
          ? current.nextBeforeSequence
          : metadata.nextBeforeSequence
      ),
      hasMore: (
        metadata.hasMore === undefined
          ? current.hasMore
          : metadata.hasMore
      ),
      lastSyncedAt: (
        metadata.lastSyncedAt === undefined
          ? current.lastSyncedAt
          : metadata.lastSyncedAt
      ),
    },
  };

  persistMessages(normalizedConversationId);

  notifyChatStore({
    type: 'messages',
    conversationId: normalizedConversationId,
  });
}

export function setChatMessages(
  conversationId: string,
  messages: ChatMessage[],
  metadata: Partial<ChatMessagesCacheMetadata> = {},
): void {
  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  if (!normalizedConversationId) {
    return;
  }

  messagesByConversationId = {
    ...messagesByConversationId,
    [normalizedConversationId]: normalizeMessages(messages),
  };

  const currentMetadata = getMessageCacheMetadata(
    normalizedConversationId,
  );

  messageCacheMetadataByConversationId = {
    ...messageCacheMetadataByConversationId,
    [normalizedConversationId]: {
      nextBeforeSequence: (
        metadata.nextBeforeSequence === undefined
          ? currentMetadata.nextBeforeSequence
          : metadata.nextBeforeSequence
      ),
      hasMore: (
        metadata.hasMore === undefined
          ? currentMetadata.hasMore
          : metadata.hasMore
      ),
      lastSyncedAt: (
        metadata.lastSyncedAt === undefined
          ? currentMetadata.lastSyncedAt
          : metadata.lastSyncedAt
      ),
    },
  };

  persistMessages(normalizedConversationId);

  notifyChatStore({
    type: 'messages',
    conversationId: normalizedConversationId,
  });
}

export function upsertChatMessage(
  conversationId: string,
  message: ChatMessage,
): void {
  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  if (!normalizedConversationId) {
    return;
  }

  setChatMessages(
    normalizedConversationId,
    [
      ...getChatMessages(normalizedConversationId),
      message,
    ],
  );
}

export function removeChatMessage(
  conversationId: string,
  messageId: string,
): void {
  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  setChatMessages(
    normalizedConversationId,
    getChatMessages(normalizedConversationId).filter(
      (item) => item.id !== messageId,
    ),
  );
}

export function getProtectedConversationIds(): string[] {
  return protectedConversationIds;
}

export function isChatConversationProtected(
  conversationId: string,
): boolean {
  return protectedConversationIds.includes(conversationId);
}

export function setChatConversationProtected(
  conversationId: string,
  value: boolean,
): void {
  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  if (!normalizedConversationId) {
    return;
  }

  if (value) {
    if (
      !protectedConversationIds.includes(
        normalizedConversationId,
      )
    ) {
      protectedConversationIds = [
        ...protectedConversationIds,
        normalizedConversationId,
      ];
    }
  } else {
    protectedConversationIds = protectedConversationIds.filter(
      (id) => id !== normalizedConversationId,
    );
  }

  notifyChatStore({
    type: 'conversations',
    conversationIds: [normalizedConversationId],
  });
}

export function getArchivedChatConversationIds(): string[] {
  return archivedConversationIds;
}

export function isChatConversationArchived(
  conversationId: string,
): boolean {
  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  return archivedConversationIds.includes(
    normalizedConversationId,
  );
}

export function setChatConversationArchived(
  conversationId: string,
  value: boolean,
): void {
  const normalizedConversationId = normalizeConversationId(
    conversationId,
  );

  if (!normalizedConversationId) {
    return;
  }

  if (value) {
    if (
      !archivedConversationIds.includes(
        normalizedConversationId,
      )
    ) {
      archivedConversationIds = [
        ...archivedConversationIds,
        normalizedConversationId,
      ];
    }
  } else {
    archivedConversationIds = archivedConversationIds.filter(
      (id) => id !== normalizedConversationId,
    );
  }

  persistArchivedConversationIds();

  notifyChatStore({
    type: 'conversations',
    conversationIds: [normalizedConversationId],
  });
}
