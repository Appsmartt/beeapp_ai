import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  ChatConversation,
  ChatMessage,
} from '@beeapp/shared-types';

const CHAT_INBOX_CACHE_PREFIX = 'beeapp.chat.inbox.v1';
const CHAT_MESSAGES_CACHE_PREFIX = 'beeapp.chat.messages.v2';

const CHAT_MESSAGES_CACHE_VERSION = 2;
const MAX_PERSISTED_MESSAGES_PER_CONVERSATION = 300;

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

let activeUserId: string | null = null;

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

function persistConversations(): void {
  if (!activeUserId) {
    return;
  }

  void AsyncStorage.setItem(
    getInboxCacheKey(activeUserId),
    JSON.stringify(conversations),
  ).catch(() => {
    // Cache persistence must never block chat usage.
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
  activeUserId = null;
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
    const serializedConversations = await AsyncStorage.getItem(
      getInboxCacheKey(normalizedUserId),
    );

    if (!serializedConversations) {
      return conversations;
    }

    const parsedConversations = JSON.parse(
      serializedConversations,
    );

    if (!Array.isArray(parsedConversations)) {
      return conversations;
    }

    conversations = normalizeConversations(
      parsedConversations as ChatConversation[],
    );

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
    await AsyncStorage.removeItem(
      getInboxCacheKey(targetUserId),
    );
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
  if (value) {
    if (!protectedConversationIds.includes(conversationId)) {
      protectedConversationIds = [
        ...protectedConversationIds,
        conversationId,
      ];
    }

    return;
  }

  protectedConversationIds = protectedConversationIds.filter(
    (id) => id !== conversationId,
  );
}
