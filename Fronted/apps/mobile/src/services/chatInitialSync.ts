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
  hydrateChatConversations,
  setChatConversations,
  setChatMessages,
} from '../stores/chatStore';

const INITIAL_CHAT_LIMIT = 20;
const INITIAL_MESSAGES_PAGE_SIZE = 100;
const INITIAL_MAX_MESSAGES_PER_CONVERSATION = 300;
const INITIAL_SYNC_MONTHS = 1;

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

  cutoff.setMonth(
    cutoff.getMonth() - INITIAL_SYNC_MONTHS,
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

    const messagesWithinMonth = pageMessages.filter(
      (message) => (
        getMessageTimestamp(message) >= cutoff
      ),
    );

    collected.push(...messagesWithinMonth);

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
      limit: INITIAL_CHAT_LIMIT,
    },
  );

  const conversations = inboxResponse.conversations;

  setChatConversations(conversations);

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
      await synchronizeConversationMessages(
        auth,
        conversation,
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
