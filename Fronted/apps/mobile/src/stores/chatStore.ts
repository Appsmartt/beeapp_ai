import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  ChatConversation,
  ChatMessage,
} from '@beeapp/shared-types';

const CHAT_INBOX_CACHE_PREFIX = 'beeapp.chat.inbox.v1';

let conversations: ChatConversation[] = [];

let messagesByConversationId: Record<
  string,
  ChatMessage[]
> = {};

let protectedConversationIds: string[] = [];

let activeUserId: string | null = null;

function getInboxCacheKey(
  userId: string,
): string {
  return `${CHAT_INBOX_CACHE_PREFIX}.${userId}`;
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

export async function hydrateChatConversations(
  userId: string,
): Promise<ChatConversation[]> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    conversations = [];
    activeUserId = null;

    return conversations;
  }

  if (activeUserId === normalizedUserId) {
    return conversations;
  }

  activeUserId = normalizedUserId;
  conversations = [];

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
    conversations = [];
    messagesByConversationId = {};
    protectedConversationIds = [];
    activeUserId = null;
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
  conversations = conversations.filter(
    (item) => item.id !== conversationId,
  );

  delete messagesByConversationId[conversationId];

  protectedConversationIds = protectedConversationIds.filter(
    (id) => id !== conversationId,
  );

  persistConversations();
}

export function getChatMessages(
  conversationId: string,
): ChatMessage[] {
  return messagesByConversationId[conversationId] || [];
}

export function setChatMessages(
  conversationId: string,
  messages: ChatMessage[],
): void {
  messagesByConversationId = {
    ...messagesByConversationId,
    [conversationId]: messages,
  };
}

export function upsertChatMessage(
  conversationId: string,
  message: ChatMessage,
): void {
  const currentMessages = getChatMessages(conversationId);

  const exists = currentMessages.some(
    (item) => item.id === message.id,
  );

  const nextMessages = exists
    ? currentMessages.map((item) => (
        item.id === message.id
          ? message
          : item
      ))
    : [...currentMessages, message];

  setChatMessages(conversationId, nextMessages);
}

export function removeChatMessage(
  conversationId: string,
  messageId: string,
): void {
  setChatMessages(
    conversationId,
    getChatMessages(conversationId).filter(
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
