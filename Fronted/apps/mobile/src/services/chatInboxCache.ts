import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatConversation } from '@beeapp/shared-types';

const CACHE_PREFIX = 'beeapp.chat.inbox.v1.';
const CACHE_VERSION = 1;
const MAX_UNPINNED_PER_TYPE = 20;

type CachedInbox = {
  version: number;
  userId: string;
  identityId: string;
  conversations: ChatConversation[];
};

let cacheGeneration = 0;
let pendingWrite: Promise<void> = Promise.resolve();
const pendingSnapshots = new Map<string, CachedInbox>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function cacheKey(userId: string, identityId: string): string {
  return `${CACHE_PREFIX}${encodeURIComponent(userId)}.${encodeURIComponent(identityId)}`;
}

function inboxTimestamp(conversation: ChatConversation): number {
  const value = conversation.last_message_at
    || conversation.last_message?.created_at
    || conversation.updated_at
    || conversation.created_at;
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function selectInboxConversations(
  conversations: ChatConversation[],
  identityId: string,
): ChatConversation[] {
  const selected: ChatConversation[] = [];
  const seen = new Set<string>();
  let directCount = 0;
  let groupCount = 0;

  for (const conversation of [...conversations].sort(
    (left, right) => inboxTimestamp(right) - inboxTimestamp(left),
  )) {
    if (
      !conversation.id
      || seen.has(conversation.id)
      || conversation.own_participant?.identity_id !== identityId
      || (
        conversation.conversation_type !== 'direct'
        && conversation.conversation_type !== 'group'
      )
    ) continue;

    if (!conversation.is_pinned) {
      if (conversation.conversation_type === 'direct') {
        if (directCount >= MAX_UNPINNED_PER_TYPE) continue;
        directCount += 1;
      } else {
        if (groupCount >= MAX_UNPINNED_PER_TYPE) continue;
        groupCount += 1;
      }
    }

    seen.add(conversation.id);
    selected.push({
      ...conversation,
      last_message: conversation.last_message
        ? {
            id: conversation.last_message.id,
            conversation_id: conversation.id,
            sender_id: conversation.last_message.sender_id,
            sender_identity_id: conversation.last_message.sender_identity_id,
            message_type: conversation.last_message.message_type,
            content: conversation.last_message.content,
            status: conversation.last_message.status,
            created_at: conversation.last_message.created_at,
            sender: conversation.last_message.sender
              ? {
                  id: conversation.last_message.sender.id,
                  first_name: conversation.last_message.sender.first_name,
                  last_name: conversation.last_message.sender.last_name,
                }
              : null,
          }
        : null,
      participants: conversation.participants?.slice(0, 2),
    });
  }

  return selected;
}

function privateIdentityKey(userId: string): string {
  return `${CACHE_PREFIX}${encodeURIComponent(userId)}.private-identity`;
}

export async function readCachedPrivateChatIdentityId(
  userId: string,
): Promise<string | null> {
  if (!userId.trim()) return null;
  try {
    const identityId = await AsyncStorage.getItem(privateIdentityKey(userId));
    if (!identityId?.trim()) return null;
    const cached = await readChatInboxCache(userId, identityId);
    return cached.length ? identityId : null;
  } catch {
    return null;
  }
}

export async function saveCachedPrivateChatIdentityId(
  userId: string,
  identityId: string,
): Promise<void> {
  if (!userId.trim() || !identityId.trim()) return;
  try {
    await AsyncStorage.setItem(privateIdentityKey(userId), identityId);
  } catch {
    // Identity metadata must never block the authenticated inbox.
  }
}

export async function readChatInboxCache(
  userId: string,
  identityId: string,
): Promise<ChatConversation[]> {
  if (!userId.trim() || !identityId.trim()) return [];

  try {
    const key = cacheKey(userId, identityId);
    const pending = pendingSnapshots.get(key);
    if (pending) return selectInboxConversations(pending.conversations, identityId);
    await pendingWrite;
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return [];
    const parsed: CachedInbox = JSON.parse(stored);
    if (
      parsed.version !== CACHE_VERSION
      || parsed.userId !== userId
      || parsed.identityId !== identityId
      || !Array.isArray(parsed.conversations)
    ) return [];

    return selectInboxConversations(parsed.conversations, identityId);
  } catch {
    return [];
  }
}

export function writeChatInboxCache(
  userId: string,
  identityId: string,
  conversations: ChatConversation[],
): void {
  if (!userId.trim() || !identityId.trim()) return;

  const snapshot: CachedInbox = {
    version: CACHE_VERSION,
    userId,
    identityId,
    conversations: selectInboxConversations(conversations, identityId),
  };

  pendingSnapshots.set(cacheKey(userId, identityId), snapshot);
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    const generation = cacheGeneration;
    const entries = [...pendingSnapshots.entries()];
    pendingSnapshots.clear();
    pendingWrite = pendingWrite.catch(() => {}).then(async () => {
      if (generation !== cacheGeneration || !entries.length) return;
      await AsyncStorage.multiSet(entries.map(([key, value]) => (
        [key, JSON.stringify(value)]
      )));
    }).catch(() => {
      // Cache failures must not block the inbox or realtime updates.
    });
  }, 250);
}

export async function clearChatInboxCache(userId?: string): Promise<void> {
  cacheGeneration += 1;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = null;
  pendingSnapshots.clear();
  await pendingWrite.catch(() => {});

  const keys = await AsyncStorage.getAllKeys();
  const prefix = userId
    ? `${CACHE_PREFIX}${encodeURIComponent(userId)}.`
    : CACHE_PREFIX;
  const matching = keys.filter((key) => key.startsWith(prefix));
  if (matching.length) await AsyncStorage.multiRemove(matching);
}
