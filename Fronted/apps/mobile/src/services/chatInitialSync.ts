import {
  bootstrapChat,
  getChatIdentities,
  getChatInbox,
  getChatMessages,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  ChatConversation,
  ChatMessage,
} from '@beeapp/shared-types';

import {
  getValidAuthSession,
  getValidSessionCredentials,
} from './authSession';
import {
  cacheChatConversationAvatars,
} from './chatAvatarCache';
import {
  hydrateChatConversations,
  replaceChatConversationsSnapshot,
  setChatMessages,
} from '../stores/chatStore';

const INITIAL_INBOX_REQUEST_LIMIT = 100;
const INITIAL_DIRECT_CHAT_LIMIT = 10;
const INITIAL_GROUP_CHAT_LIMIT = 5;
const INITIAL_MESSAGES_PAGE_SIZE = 100;
const INITIAL_MAX_MESSAGES_PER_CONVERSATION = 300;
const INITIAL_SYNC_DAYS = 7;

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

function getInitialSyncCutoff(): number {
  const cutoff = new Date();

  cutoff.setDate(
    cutoff.getDate() - INITIAL_SYNC_DAYS,
  );

  return cutoff.getTime();
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
  const directChats: ChatConversation[] = [];
  const groupChats: ChatConversation[] = [];

  for (const conversation of conversations) {
    if (
      conversation.conversation_type === 'direct'
      && directChats.length < INITIAL_DIRECT_CHAT_LIMIT
    ) {
      directChats.push(conversation);
      continue;
    }

    if (
      conversation.conversation_type === 'group'
      && groupChats.length < INITIAL_GROUP_CHAT_LIMIT
    ) {
      groupChats.push(conversation);
    }

    if (
      directChats.length >= INITIAL_DIRECT_CHAT_LIMIT
      && groupChats.length >= INITIAL_GROUP_CHAT_LIMIT
    ) {
      break;
    }
  }

  return [...directChats, ...groupChats].sort(
    (left, right) => {
      const leftTimestamp = new Date(
        left.last_message_at
        || left.updated_at
        || left.created_at,
      ).getTime();

      const rightTimestamp = new Date(
        right.last_message_at
        || right.updated_at
        || right.created_at,
      ).getTime();

      return rightTimestamp - leftTimestamp;
    },
  );
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
): Promise<void> {
  const cutoff = getInitialSyncCutoff();

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

    const messagesWithinWindow = pageMessages.filter(
      (message) => (
        getMessageTimestamp(message) >= cutoff
      ),
    );

    collected.push(...messagesWithinWindow);

    const oldestPageMessage = pageMessages[0];
    const reachedCutoff = (
      getMessageTimestamp(oldestPageMessage) < cutoff
    );

    nextBeforeSequence = response.next_before_sequence;

    if (
      reachedCutoff
      || nextBeforeSequence === null
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

  setChatMessages(
    conversation.id,
    sortMessages(uniqueMessages).slice(
      -INITIAL_MAX_MESSAGES_PER_CONVERSATION,
    ),
    {
      nextBeforeSequence,
      hasMore,
      lastSyncedAt: new Date().toISOString(),
    },
  );
}

export async function synchronizeInitialPrivateChats(
  onProgress?: (
    progress: ChatInitialSyncProgress,
  ) => void,
): Promise<ChatInitialSyncResult> {
  console.log('[chat-initial-sync] start');

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

  await hydrateChatConversations(userId);

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

  console.log('[chat-initial-sync] inbox loaded', {
    inboxCount: inboxResponse.conversations.length,
    selectedCount: selectedConversations.length,
    directCount: selectedConversations.filter(
      (conversation) => conversation.conversation_type === 'direct',
    ).length,
    groupCount: selectedConversations.filter(
      (conversation) => conversation.conversation_type === 'group',
    ).length,
    conversationIds: selectedConversations.map(
      (conversation) => conversation.id,
    ),
  });

  const conversations = await cacheChatConversationAvatars(
    userId,
    selectedConversations,
  );

  replaceChatConversationsSnapshot(
    conversations,
    {
      lastSyncedAt: new Date().toISOString(),
      /*
       * Este bootstrap solo conserva 10 chats directos y 5 grupos.
       * Por eso no es un snapshot completo del inbox y no puede
       * eliminar caches de conversaciones que no se seleccionaron.
       */
      removeStaleMessageCaches: false,
    },
  );

  let completedConversations = 0;
  let failedConversations = 0;

  for (const conversation of conversations) {
    onProgress?.({
      phase: 'messages',
      completedConversations,
      totalConversations: conversations.length,
      conversationId: conversation.id,
      failedConversations,
    });

    try {
      console.log('[chat-initial-sync] syncing messages', {
        conversationId: conversation.id,
      });

      await synchronizeConversationMessages(
        auth,
        conversation,
      );

      console.log('[chat-initial-sync] messages cached', {
        conversationId: conversation.id,
      });
    } catch (error) {
      failedConversations += 1;

      console.warn('[chat-initial-sync] message sync failed', {
        conversationId: conversation.id,
        error: error instanceof Error
          ? error.message
          : String(error),
      });
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

  console.log('[chat-initial-sync] complete', {
    conversationCount: conversations.length,
    completedConversations,
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
 * Llena en segundo plano el cache de mensajes de los chats que el
 * usuario probablemente abrirá primero. No bloquea la lista de chats
 * ni borra mensajes de conversaciones fuera de la selección.
 */
export async function prefetchRecentChatMessages(
  auth: AuthCredentials,
  conversations: ChatConversation[],
): Promise<void> {
  const selectedConversations = selectInitialConversations(
    conversations,
  );

  if (selectedConversations.length === 0) {
    return;
  }

  console.log('[chat-message-prefetch] started', {
    conversationCount: selectedConversations.length,
    conversationIds: selectedConversations.map(
      (conversation) => conversation.id,
    ),
  });

  await runWithConcurrency(
    selectedConversations,
    INITIAL_MESSAGE_PREFETCH_CONCURRENCY,
    async (conversation) => {
      await synchronizeConversationMessages(
        auth,
        conversation,
      );

      console.log('[chat-message-prefetch] cached', {
        conversationId: conversation.id,
      });
    },
  );

  console.log('[chat-message-prefetch] complete', {
    conversationCount: selectedConversations.length,
  });
}
