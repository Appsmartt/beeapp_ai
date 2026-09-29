import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '@beeapp/shared-types';

const PREFIX = 'beeapp.chat.message-snapshot.v1.';
const VERSION = 1;
const MAX_MESSAGES = 30;
let cacheGeneration = 0;

export interface ChatMessageSnapshotMetadata {
  nextBeforeSequence: number | null;
  hasMore: boolean;
  lastSyncedAt: string;
}

export interface ChatMessageSnapshot {
  messages: ChatMessage[];
  metadata: ChatMessageSnapshotMetadata;
}

type StoredSnapshot = ChatMessageSnapshot & {
  version: number;
  userId: string;
  identityId: string;
  conversationId: string;
};

function snapshotKey(
  userId: string,
  identityId: string,
  conversationId: string,
): string {
  return `${PREFIX}${encodeURIComponent(userId)}.${encodeURIComponent(identityId)}.${encodeURIComponent(conversationId)}`;
}

function recentMessages(messages: ChatMessage[], conversationId: string): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of messages) {
    if (
      typeof message?.id === 'string'
      && message.id.length > 0
      && message.conversation_id === conversationId
    ) byId.set(message.id, message);
  }
  return [...byId.values()].sort((left, right) => (
    (left.sequence_number ?? 0) - (right.sequence_number ?? 0)
    || Date.parse(left.created_at) - Date.parse(right.created_at)
    || left.id.localeCompare(right.id)
  )).slice(-MAX_MESSAGES);
}

export async function readChatMessageSnapshot(
  userId: string,
  identityId: string,
  conversationId: string,
): Promise<ChatMessageSnapshot | null> {
  if (!userId || !identityId || !conversationId) return null;
  try {
    const stored = await AsyncStorage.getItem(
      snapshotKey(userId, identityId, conversationId),
    );
    if (!stored) return null;
    const parsed: StoredSnapshot = JSON.parse(stored);
    if (
      parsed.version !== VERSION
      || parsed.userId !== userId
      || parsed.identityId !== identityId
      || parsed.conversationId !== conversationId
      || !Array.isArray(parsed.messages)
      || parsed.messages.length > MAX_MESSAGES
      || !parsed.messages.every((message) => (
        typeof message?.id === 'string'
        && message.conversation_id === conversationId
        && typeof message.created_at === 'string'
      ))
      || typeof parsed.metadata?.hasMore !== 'boolean'
      || typeof parsed.metadata.lastSyncedAt !== 'string'
      || (
        parsed.metadata.nextBeforeSequence !== null
        && typeof parsed.metadata.nextBeforeSequence !== 'number'
      )
    ) return null;
    console.log('[chat-message-cache] read', {
      conversationId,
      count: parsed.messages.length,
      messageIds: parsed.messages.map((message) => message.id),
      sequences: parsed.messages.map((message) => message.sequence_number ?? null),
      hasMore: parsed.metadata.hasMore,
    });
    return { messages: parsed.messages, metadata: parsed.metadata };
  } catch (error) {
    console.warn('[chat-message-cache] read-failed', {
      conversationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function writeChatMessageSnapshot(
  userId: string,
  identityId: string,
  conversationId: string,
  snapshot: ChatMessageSnapshot,
): Promise<boolean> {
  if (!userId || !identityId || !conversationId) return false;
  const messages = recentMessages(snapshot.messages, conversationId);
  const value: StoredSnapshot = {
    version: VERSION,
    userId,
    identityId,
    conversationId,
    messages,
    metadata: snapshot.metadata,
  };
  const generation = cacheGeneration;
  const key = snapshotKey(userId, identityId, conversationId);
  try {
    if (generation !== cacheGeneration) return false;
    await AsyncStorage.setItem(key, JSON.stringify(value));
    if (generation !== cacheGeneration) {
      await AsyncStorage.removeItem(key);
      return false;
    }
    const verified = await readChatMessageSnapshot(userId, identityId, conversationId);
    if (generation !== cacheGeneration) {
      await AsyncStorage.removeItem(key);
      return false;
    }
    const saved = Boolean(
      verified
      && verified.messages.length === messages.length
      && verified.messages.every((message, index) => message.id === messages[index].id),
    );
    console.log('[chat-message-cache] write-verified', {
      conversationId,
      saved,
      count: messages.length,
      messageIds: messages.map((message) => message.id),
      sequences: messages.map((message) => message.sequence_number ?? null),
      hasMore: snapshot.metadata.hasMore,
      nextBeforeSequence: snapshot.metadata.nextBeforeSequence,
      lastSyncedAt: snapshot.metadata.lastSyncedAt,
    });
    return saved;
  } catch (error) {
    console.warn('[chat-message-cache] write-failed', {
      conversationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function removeChatMessageSnapshot(
  userId: string,
  identityId: string,
  conversationId: string,
): Promise<void> {
  if (!userId || !identityId || !conversationId) return;
  await AsyncStorage.removeItem(snapshotKey(userId, identityId, conversationId));
}

export async function clearChatMessageSnapshots(
  userId?: string,
): Promise<void> {
  cacheGeneration += 1;
  const prefix = userId
    ? `${PREFIX}${encodeURIComponent(userId)}.`
    : PREFIX;
  const keys = (await AsyncStorage.getAllKeys()).filter(
    (key) => key.startsWith(prefix),
  );
  if (keys.length) await AsyncStorage.multiRemove(keys);
  console.log('[chat-message-cache] cleared', {
    scope: userId ? 'user' : 'all',
    count: keys.length,
  });
}
