import {
  bootstrapChat,
  getChatIdentities,
  getChatInbox,
  getChatMessages,
  markChatConversationDelivered,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  ChatConversation,
  ChatMessage,
} from '@beeapp/shared-types';

import {
  getLatestIncomingChatMessage,
} from './chatMessageReceipts';
import {
  readChatMessageSnapshot,
  removeChatMessageSnapshot,
  writeChatMessageSnapshot,
} from './chatMessageSnapshotCache';
import {
  getValidAuthSession,
  getValidSessionCredentials,
} from './authSession';
import {
  cacheChatConversationAvatars,
} from './chatAvatarCache';
import {
  getActiveChatStoreIdentityId,
  getChatMessages as getStoredChatMessages,
  getChatMessagesCacheMetadata,
  hydrateChatConversations,
  replaceChatConversationsSnapshot,
  setChatMessages,
} from '../stores/chatStore';

const INITIAL_INBOX_REQUEST_LIMIT = 100;
const INITIAL_DIRECT_CHAT_LIMIT = 20;
const INITIAL_GROUP_CHAT_LIMIT = 20;
const INITIAL_MESSAGES_PAGE_SIZE = 30;
const INITIAL_MAX_MESSAGES_PER_CONVERSATION = 30;
export interface ChatInitialSyncProgress {
  phase: 'preparing' | 'inbox' | 'messages' | 'complete';
  completedConversations: number;
  totalConversations: number;
  conversationId?: string;
  failedConversations: number;
}

export interface ChatInitialSyncResult {
  conversationCount: number;
  synchronizedConversationCount: number;
  failedConversationCount: number;
  skipped: boolean;
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

function sortMessages(
  messages: ChatMessage[],
): ChatMessage[] {
  return [...messages].sort((left, right) => {
    const leftSequence = (
      typeof left.sequence_number === 'number'
        ? left.sequence_number
        : 0
    );

    const rightSequence = (
      typeof right.sequence_number === 'number'
        ? right.sequence_number
        : 0
    );

    if (leftSequence !== rightSequence) {
      return leftSequence - rightSequence;
    }

    return (
      getMessageTimestamp(left)
      - getMessageTimestamp(right)
    );
  });
}

function selectInitialConversations(
  conversations: ChatConversation[],
): ChatConversation[] {
  const selected: ChatConversation[] = [];
  const seen = new Set<string>();
  let directCount = 0;
  let groupCount = 0;

  const sorted = [...conversations].sort((left, right) => {
    const leftAt = Date.parse(
      left.last_message_at || left.updated_at || left.created_at,
    ) || 0;
    const rightAt = Date.parse(
      right.last_message_at || right.updated_at || right.created_at,
    ) || 0;
    return rightAt - leftAt;
  });

  for (const conversation of sorted) {
    if (
      !conversation.id
      || seen.has(conversation.id)
      || (
        conversation.conversation_type !== 'direct'
        && conversation.conversation_type !== 'group'
      )
    ) continue;

    if (!conversation.is_pinned) {
      if (conversation.conversation_type === 'direct') {
        if (directCount >= INITIAL_DIRECT_CHAT_LIMIT) continue;
        directCount += 1;
      } else {
        if (groupCount >= INITIAL_GROUP_CHAT_LIMIT) continue;
        groupCount += 1;
      }
    }

    seen.add(conversation.id);
    selected.push(conversation);
  }

  return selected;
}

async function getChatSyncAuth(): Promise<{
  userId: string;
  auth: AuthCredentials;
}> {
  const [
    authSession,
    auth,
  ] = await Promise.all([
    getValidAuthSession(),
    getValidSessionCredentials(),
  ]);

  if (!authSession || !auth) {
    throw new Error(
      'Tu sesión expiró. Inicia sesión nuevamente.',
    );
  }

  if (auth.scheme !== 'Bearer') {
    throw new Error(
      'La sincronización de Chat requiere una sesión Bearer.',
    );
  }

  return {
    userId: authSession.user.id,
    auth,
  };
}

async function synchronizeConversationMessages(
  auth: AuthCredentials,
  conversation: ChatConversation,
  recipientIdentityId?: string,
  recipientUserId?: string,
): Promise<void> {
  const collected: ChatMessage[] = [];
  let beforeSequence: number | null = null;
  let nextBeforeSequence: number | null = null;
  let hasMore = false;

  while (
    collected.length
    < INITIAL_MAX_MESSAGES_PER_CONVERSATION
  ) {
    const response = await getChatMessages(
      auth,
      conversation.id,
      {
        limit: INITIAL_MESSAGES_PAGE_SIZE,
        beforeSequence,
      },
    );

    const pageMessages = response.messages;

    if (!pageMessages.length) {
      nextBeforeSequence = null;
      hasMore = false;
      break;
    }

    collected.push(...pageMessages);

    nextBeforeSequence = response.next_before_sequence;

    if (
      nextBeforeSequence === null
      || collected.length
        >= INITIAL_MAX_MESSAGES_PER_CONVERSATION
    ) {
      hasMore = nextBeforeSequence !== null;
      break;
    }

    beforeSequence = nextBeforeSequence;
  }

  const uniqueMessages = Array.from(
    new Map(
      collected.map((message) => [
        message.id,
        message,
      ]),
    ).values(),
  );

  const conversationIdentityId = (
    recipientIdentityId
    || conversation.own_participant?.identity_id
  );
  if (
    conversationIdentityId
    && getActiveChatStoreIdentityId()
      === conversationIdentityId
  ) {
    const merged = new Map(
      uniqueMessages.map((message) => [message.id, message]),
    );
    getStoredChatMessages(conversation.id).forEach((message) => {
      merged.set(message.id, {
        ...merged.get(message.id),
        ...message,
      });
    });
    const recent = sortMessages([...merged.values()]).slice(
      -INITIAL_MAX_MESSAGES_PER_CONVERSATION,
    );
    setChatMessages(
      conversation.id,
      recent,
      {
        nextBeforeSequence,
        hasMore,
        lastSyncedAt: new Date().toISOString(),
      },
    );
  }

  if (recipientIdentityId && recipientUserId) {
    const latestIncoming = getLatestIncomingChatMessage(
      uniqueMessages,
      recipientIdentityId,
      recipientUserId,
    );

    if (latestIncoming) {
      try {
        await markChatConversationDelivered(
          auth,
          conversation.id,
          {
            identity_id: recipientIdentityId,
            last_delivered_message_id: latestIncoming.id,
          },
        );
      } catch {
        // Un acuse fallido no invalida mensajes sincronizados.
      }
    }
  }
}

export async function synchronizeInitialPrivateChats(
  onProgress?: (
    progress: ChatInitialSyncProgress,
  ) => void,
): Promise<ChatInitialSyncResult> {

  onProgress?.({
    phase: 'preparing',
    completedConversations: 0,
    totalConversations: 0,
    failedConversations: 0,
  });

  const {
    userId,
    auth,
  } = await getChatSyncAuth();

  await bootstrapChat(auth);

  const identitiesResponse = await getChatIdentities(auth);

  const privateIdentity = identitiesResponse.identities.find(
    (identity) => (
      identity.identity_type === 'profile'
      && identity.is_active
    ),
  );

  if (!privateIdentity) {
    throw new Error(
      'No fue posible encontrar tu identidad privada de Chat.',
    );
  }

  await hydrateChatConversations(
    userId,
    privateIdentity.id,
  );

  onProgress?.({
    phase: 'inbox',
    completedConversations: 0,
    totalConversations: 0,
    failedConversations: 0,
  });

  const inboxResponse = await getChatInbox(
    auth,
    privateIdentity.id,
    {
      limit: INITIAL_INBOX_REQUEST_LIMIT,
    },
  );

  const selectedConversations = selectInitialConversations(
    inboxResponse.conversations,
  );


  const conversations = await cacheChatConversationAvatars(
    userId,
    selectedConversations,
  );

  if (getActiveChatStoreIdentityId() !== privateIdentity.id) {
    return {
      conversationCount: 0,
      synchronizedConversationCount: 0,
      failedConversationCount: 0,
      skipped: true,
    };
  }

  replaceChatConversationsSnapshot(conversations);

  let completedConversations = 0;
  let failedConversations = 0;

  for (const conversation of conversations) {
    if (getActiveChatStoreIdentityId() !== privateIdentity.id) {
      return {
        conversationCount: conversations.length,
        synchronizedConversationCount: (
          completedConversations - failedConversations
        ),
        failedConversationCount: failedConversations,
        skipped: true,
      };
    }
    onProgress?.({
      phase: 'messages',
      completedConversations,
      totalConversations: conversations.length,
      conversationId: conversation.id,
      failedConversations,
    });

    try {

      await synchronizeConversationMessages(
        auth,
        conversation,
        privateIdentity.id,
        userId,
      );

    } catch {
      failedConversations += 1;
    }

    completedConversations += 1;

    onProgress?.({
      phase: 'messages',
      completedConversations,
      totalConversations: conversations.length,
      conversationId: conversation.id,
      failedConversations,
    });
  }

  onProgress?.({
    phase: 'complete',
    completedConversations,
    totalConversations: conversations.length,
    failedConversations,
  });


  return {
    conversationCount: conversations.length,
    synchronizedConversationCount: (
      completedConversations - failedConversations
    ),
    failedConversationCount: failedConversations,
    skipped: false,
  };
}

const INITIAL_MESSAGE_PREFETCH_CONCURRENCY = 3;

async function runWithConcurrency<T>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<void>,
): Promise<void> {
  const queue = [...values];

  const workers = Array.from(
    {
      length: Math.min(
        Math.max(concurrency, 1),
        queue.length,
      ),
    },
    async () => {
      while (queue.length > 0) {
        const value = queue.shift();

        if (value === undefined) {
          return;
        }

        try {
          await worker(value);
        } catch (error) {
          console.warn('[chat-message-prefetch] failed', {
            conversationId: (
              value
              && typeof value === 'object'
              && 'id' in value
                ? String(value.id)
                : undefined
            ),
            error: error instanceof Error
              ? error.message
              : String(error),
          });
        }
      }
    },
  );

  await Promise.all(workers);
}

/*
 * Precarga los mensajes de los chats seleccionados y espera a que se
 * intente persistir cada snapshot. La primera entrada en Chats espera
 * muestra los chats disponibles mientras esta tarea sigue en segundo plano;
 * un refresco reintenta solo los snapshots faltantes.
 * No borra mensajes de conversaciones fuera de la selección.
 */
export async function prefetchRecentChatMessages(
  auth: AuthCredentials,
  conversations: ChatConversation[],
  context: {
    userId: string;
    identityId: string;
    protectedConversationIds: ReadonlySet<string>;
  },
): Promise<void> {
  const selectedConversations = selectInitialConversations(
    conversations,
  ).filter((conversation) => (
    conversation.own_participant?.identity_id === context.identityId
  ));


  await runWithConcurrency(
    selectedConversations,
    INITIAL_MESSAGE_PREFETCH_CONCURRENCY,
    async (conversation) => {
      if (getActiveChatStoreIdentityId() !== context.identityId) return;
      if (context.protectedConversationIds.has(conversation.id)) {
        await removeChatMessageSnapshot(
          context.userId, context.identityId, conversation.id,
        );
        return;
      }

      const saved = await readChatMessageSnapshot(
        context.userId, context.identityId, conversation.id,
      );
      if (saved) {
        return;
      }

      await synchronizeConversationMessages(
        auth, conversation,
      );
      if (getActiveChatStoreIdentityId() !== context.identityId) return;

      const messages = getStoredChatMessages(conversation.id);
      const metadata = getChatMessagesCacheMetadata(conversation.id);
      const verified = await writeChatMessageSnapshot(
        context.userId,
        context.identityId,
        conversation.id,
        {
          messages,
          metadata: {
            nextBeforeSequence: metadata.nextBeforeSequence,
            hasMore: metadata.hasMore,
            lastSyncedAt: metadata.lastSyncedAt || new Date().toISOString(),
          },
        },
      );
      if (!verified) {
        console.warn('[chat-message-prefetch] not-persisted', {
          conversationId: conversation.id,
        });
      }
    },
  );

}
