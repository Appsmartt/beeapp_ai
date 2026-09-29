import { getValidSessionCredentials } from './authSession';
import { prefetchRecentChatMessages } from './chatInitialSync';
import {
  readCachedPrivateChatIdentityId,
  readCachedProtectedChatIds,
  readChatInboxCache,
} from './chatInboxCache';
import {
  readChatMessageSnapshot,
  removeChatMessageSnapshot,
  writeChatMessageSnapshot,
} from './chatMessageSnapshotCache';
import {
  getActiveChatStoreIdentityId,
  getChatConversations,
  getChatMessages,
  getChatMessagesCacheMetadata,
  hydrateChatConversations,
  setChatMessages,
  subscribeChatStore,
} from '../stores/chatStore';

let unsubscribe: (() => void) | null = null;
let subscribedUserId: string | null = null;
const pending = new Map<string, Promise<void>>();
const knownConversationIds = new Set<string>();

async function persistConversation(
  userId: string,
  identityId: string,
  conversationId: string,
  newlyObserved = false,
): Promise<void> {
  if (
    subscribedUserId !== userId
    || getActiveChatStoreIdentityId() !== identityId
  ) return;

  const protectedIds = await readCachedProtectedChatIds(userId);
  if (!protectedIds) return;
  if (protectedIds.includes(conversationId)) {
    await removeChatMessageSnapshot(userId, identityId, conversationId);
    return;
  }

  const belongsToIdentity = getChatConversations().some(
    (conversation) => (
      conversation.id === conversationId
      && conversation.own_participant?.identity_id === identityId
    ),
  );
  if (!belongsToIdentity) return;

  const previous = await readChatMessageSnapshot(
    userId, identityId, conversationId,
  );
  if (!previous && newlyObserved) {
    const auth = await getValidSessionCredentials();
    if (
      auth?.scheme !== 'Bearer'
      || subscribedUserId !== userId
      || getActiveChatStoreIdentityId() !== identityId
    ) return;
    const conversation = getChatConversations().find(
      (item) => item.id === conversationId
        && item.own_participant?.identity_id === identityId,
    );
    if (!conversation) return;
    await prefetchRecentChatMessages(auth, [conversation], {
      userId,
      identityId,
      protectedConversationIds: new Set(protectedIds),
    });
    return;
  }
  if (!previous || subscribedUserId !== userId) return;

  const current = getChatMessages(conversationId);
  if (!current.length) return;
  const merged = new Map(
    previous.messages.map((message) => [message.id, message]),
  );
  current.forEach((message) => {
    merged.set(message.id, {
      ...merged.get(message.id),
      ...message,
    });
  });
  const conversation = getChatConversations().find(
    (item) => item.id === conversationId,
  );
  const lastMessage = conversation?.last_message;
  if (lastMessage && merged.has(lastMessage.id)) {
    const stored = merged.get(lastMessage.id)!;
    const receiptRank = {
      failed: -1,
      sent: 0,
      delivered: 1,
      read: 2,
    } as const;
    const status = receiptRank[lastMessage.status] > receiptRank[stored.status]
      ? lastMessage.status : stored.status;
    merged.set(lastMessage.id, { ...stored, status });
  }
  const metadata = getChatMessagesCacheMetadata(conversationId);
  if (
    subscribedUserId !== userId
    || getActiveChatStoreIdentityId() !== identityId
  ) return;
  const latestProtection = await readCachedProtectedChatIds(userId);
  if (!latestProtection || latestProtection.includes(conversationId)) return;

  await writeChatMessageSnapshot(
    userId,
    identityId,
    conversationId,
    {
      messages: [...merged.values()],
      metadata: {
        nextBeforeSequence: metadata.lastSyncedAt
          ? metadata.nextBeforeSequence
          : previous.metadata.nextBeforeSequence,
        hasMore: metadata.lastSyncedAt
          ? metadata.hasMore
          : previous.metadata.hasMore,
        lastSyncedAt: metadata.lastSyncedAt
          || previous.metadata.lastSyncedAt,
      },
    },
  );
}

export async function startChatMessageSnapshotSync(
  userId: string,
): Promise<void> {
  if (!userId.trim() || (unsubscribe && subscribedUserId === userId)) return;
  stopChatMessageSnapshotSync();
  subscribedUserId = userId;

  const identityId = await readCachedPrivateChatIdentityId(userId);
  const protectedIds = await readCachedProtectedChatIds(userId);
  if (identityId && protectedIds && subscribedUserId === userId) {
    if (!getActiveChatStoreIdentityId()) {
      await hydrateChatConversations(userId, identityId);
    }
    if (getActiveChatStoreIdentityId() === identityId) {
      const inbox = await readChatInboxCache(userId, identityId);
      for (const conversation of inbox) {
        if (
          subscribedUserId !== userId
          || getActiveChatStoreIdentityId() !== identityId
        ) break;
        if (protectedIds.includes(conversation.id)) {
          await removeChatMessageSnapshot(
            userId, identityId, conversation.id,
          );
          continue;
        }
        if (getChatMessages(conversation.id).length) continue;
        const snapshot = await readChatMessageSnapshot(
          userId, identityId, conversation.id,
        );
        if (snapshot && subscribedUserId === userId
          && getActiveChatStoreIdentityId() === identityId) {
          setChatMessages(
            conversation.id,
            snapshot.messages,
            snapshot.metadata,
          );
        }
      }
    }
  }
  if (subscribedUserId !== userId) return;
  getChatConversations().forEach((conversation) => {
    knownConversationIds.add(conversation.id);
  });
  unsubscribe = subscribeChatStore((change) => {
    const identityId = getActiveChatStoreIdentityId();
    if (!identityId || subscribedUserId !== userId) return;
    const ids = change.type === 'messages'
      ? [change.conversationId]
      : change.type === 'conversations'
        ? (change.conversationIds || []).filter((conversationId) => {
            const conversation = getChatConversations().find(
              (item) => item.id === conversationId,
            );
            const cachedLast = getChatMessages(conversationId).find(
              (message) => message.id === conversation?.last_message?.id,
            );
            return Boolean(
              cachedLast
              && conversation?.last_message
              && cachedLast.status !== conversation.last_message.status
            );
          })
        : [];
    const newIds = change.type === 'conversations'
      ? (change.conversationIds || []).filter((conversationId) => {
          const conversation = getChatConversations().find(
            (item) => item.id === conversationId,
          );
          if (
            !conversation
            || knownConversationIds.has(conversationId)
            || conversation.own_participant?.identity_id !== identityId
          ) return false;
          if (!conversation.last_message) return false;
          knownConversationIds.add(conversationId);
          return true;
        })
      : [];
    for (const conversationId of new Set([...ids, ...newIds])) {
      const key = `${userId}:${identityId}:${conversationId}`;
      const previous = pending.get(key) || Promise.resolve();
      const next = previous.catch(() => {}).then(() => (
        persistConversation(
          userId, identityId, conversationId,
          newIds.includes(conversationId),
        )
      )).catch((error) => {
        console.warn('[chat-message-cache] global-update-failed', {
          conversationId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
      pending.set(key, next);
      void next.finally(() => {
        if (pending.get(key) === next) pending.delete(key);
      });
    }
  });
}

export function stopChatMessageSnapshotSync(): void {
  subscribedUserId = null;
  unsubscribe?.();
  unsubscribe = null;
  knownConversationIds.clear();
}
