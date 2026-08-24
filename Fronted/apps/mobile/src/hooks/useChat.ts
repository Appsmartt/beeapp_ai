import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  bootstrapChat,
  createDirectChatConversation,
  getChatConversation,
  getChatIdentities,
  getChatInbox,
  getChatMessages,
  getChatParticipants,
  searchChatRecipients,
  sendChatMessage,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  ChatConversation,
  ChatMessage,
  ChatMessageType,
  ChatParticipant,
} from '@beeapp/shared-types';

import {
  getValidAuthSession,
  getValidSessionCredentials,
} from '../services/authSession';
import {
  mapChatMessageToModel,
  mapChatSearchUser,
  mapConversationToListItem,
  type ChatListItemModel,
  type ChatMessageModel,
  type ChatUserOption,
} from '../services/chatService';
import {
  getChatConversations as getStoredConversations,
  getChatMessages as getStoredMessages,
  getChatMessagesCacheMetadata,
  getProtectedConversationIds,
  hydrateChatConversations,
  hydrateChatMessages,
  isChatConversationProtected,
  setChatConversationProtected,
  setChatConversations,
  setChatMessages,
  upsertChatConversation,
  updateChatConversationLastMessage,
  upsertChatMessage,
} from '../stores/chatStore';

const DEFAULT_LIMIT = 50;
const MAX_CHAT_REQUEST_ATTEMPTS = 3;
const CHAT_RETRY_BASE_DELAY_MS = 350;

function wait(
  milliseconds: number,
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function retryChatRequest<T>(
  request: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= MAX_CHAT_REQUEST_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await request();
    } catch (error) {
      lastError = error;

      if (attempt === MAX_CHAT_REQUEST_ATTEMPTS) {
        break;
      }

      await wait(
        CHAT_RETRY_BASE_DELAY_MS * attempt,
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        'No fue posible completar la solicitud de Chat.',
      );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return (
    error instanceof Error
    && error.message
  )
    ? error.message
    : fallback;
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

function sortMessages(
  messages: ChatMessage[],
): ChatMessage[] {
  return [...messages].sort((left, right) => {
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
  });
}

function mergeMessages(
  currentMessages: ChatMessage[],
  incomingMessages: ChatMessage[],
): ChatMessage[] {
  const messagesById = new Map<string, ChatMessage>();

  for (const message of [
    ...currentMessages,
    ...incomingMessages,
  ]) {
    const id = String(message?.id || '').trim();

    if (!id) {
      continue;
    }

    const existing = messagesById.get(id);

    if (!existing) {
      messagesById.set(id, {
        ...message,
        id,
      });
      continue;
    }

    const existingSequence = getMessageSequence(existing);
    const incomingSequence = getMessageSequence(message);

    const incomingIsNewer = (
      incomingSequence !== null
      && (
        existingSequence === null
        || incomingSequence >= existingSequence
      )
    )
    || (
      incomingSequence === null
      && (
        existingSequence === null
        || getMessageTimestamp(message)
          >= getMessageTimestamp(existing)
      )
    );

    const newest = incomingIsNewer
      ? message
      : existing;

    const oldest = incomingIsNewer
      ? existing
      : message;

    messagesById.set(id, {
      ...oldest,
      ...newest,
      id,
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
    });
  }

  return sortMessages(
    Array.from(messagesById.values()),
  );
}

function sortConversations(
  conversations: ChatConversation[],
): ChatConversation[] {
  return [...conversations].sort((left, right) => {
    const leftDate = new Date(
      left.last_message_at
      || left.updated_at,
    ).getTime();

    const rightDate = new Date(
      right.last_message_at
      || right.updated_at,
    ).getTime();

    return rightDate - leftDate;
  });
}

async function getChatAuthContext(): Promise<{
  currentUserId: string;
  token: AuthCredentials;
}> {
  const [
    session,
    token,
  ] = await Promise.all([
    getValidAuthSession(),
    getValidSessionCredentials(),
  ]);

  if (!session || !token) {
    throw new Error(
      'Tu sesión expiró. Inicia sesión nuevamente.',
    );
  }

  if (token.scheme !== 'Bearer') {
    throw new Error(
      'Chat requiere una sesión iniciada con correo y contraseña. '
      + 'Cierra sesión e ingresa nuevamente con correo.',
    );
  }

  return {
    currentUserId: session.user.id,
    token,
  };
}

export interface UseChatConversationsOptions {
  autoLoad?: boolean;
  includeArchived?: boolean;
}

export interface UseChatConversationsResult {
  conversations: ChatListItemModel[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  loadConversations: (
    options?: {
      refresh?: boolean;
      archived?: boolean;
    },
  ) => Promise<ChatListItemModel[]>;
  createDirectConversation: (
    userId: string,
  ) => Promise<ChatListItemModel>;
  createGroupConversation: (
    payload: {
      name: string;
      description?: string;
      participantIds: string[];
    },
  ) => Promise<ChatListItemModel>;
  updateConversation: (
    conversationId: string,
    payload: {
      name?: string;
      description?: string | null;
      isMuted?: boolean;
      isArchived?: boolean;
      isPinned?: boolean;
    },
  ) => Promise<ChatListItemModel>;
  deleteConversation: (
    conversationId: string,
  ) => Promise<void>;
  setProtected: (
    conversationId: string,
    value: boolean,
  ) => void;
  isProtected: (
    conversationId: string,
  ) => boolean;
  searchUsers: (
    query: string,
  ) => Promise<ChatUserOption[]>;
  clearError: () => void;
}

export function useChatConversations(
  {
    autoLoad = true,
  }: UseChatConversationsOptions = {},
): UseChatConversationsResult {
  const [rawConversations, setRawConversations] = useState<
    ChatConversation[]
  >(
    getStoredConversations(),
  );

  const [currentUserId, setCurrentUserId] = useState('');
  const [privateIdentityId, setPrivateIdentityId] = useState<
    string | null
  >(null);

  const [loading, setLoading] = useState(
    getStoredConversations().length === 0,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const synchronizeConversations = useCallback((
    nextConversations: ChatConversation[],
  ) => {
    const sorted = sortConversations(nextConversations);

    setChatConversations(sorted);
    setRawConversations(sorted);
  }, []);

  const resolvePrivateIdentityId = useCallback(async (
    token: AuthCredentials,
  ) => {
    await bootstrapChat(token);

    const response = await getChatIdentities(token);

    const identity = response.identities.find(
      (item) => (
        item.identity_type === 'profile'
        && item.is_active
      ),
    );

    if (!identity) {
      throw new Error(
        'No fue posible crear tu identidad privada de Chat.',
      );
    }

    setPrivateIdentityId(identity.id);

    return identity.id;
  }, []);

  const loadConversations = useCallback(async (
    options: {
      refresh?: boolean;
      archived?: boolean;
    } = {},
  ) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const hasMemoryCache = getStoredConversations().length > 0;

    if (options.refresh) {
      setRefreshing(true);
    } else if (!hasMemoryCache) {
      setLoading(true);
    }

    setError(null);

    try {
      const {
        currentUserId: activeUserId,
        token,
      } = await getChatAuthContext();

      const cachedConversations = await hydrateChatConversations(
        activeUserId,
      );

      if (requestId !== requestIdRef.current) {
        return [];
      }

      setCurrentUserId(activeUserId);

      if (cachedConversations.length > 0) {
        setRawConversations(cachedConversations);
      }

      const identityId = (
        privateIdentityId
        || await resolvePrivateIdentityId(token)
      );

      const response = await getChatInbox(
        token,
        identityId,
        {
          limit: 100,
        },
      );

      if (requestId !== requestIdRef.current) {
        return [];
      }

      setCurrentUserId(activeUserId);
      synchronizeConversations(response.conversations);

      return response.conversations.map((conversation) => (
        mapConversationToListItem(
          conversation,
          activeUserId,
          isChatConversationProtected(conversation.id),
        )
      ));
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          getErrorMessage(
            loadError,
            'No fue posible cargar tus chats.',
          ),
        );
      }

      throw loadError;
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    privateIdentityId,
    resolvePrivateIdentityId,
    synchronizeConversations,
  ]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    void loadConversations().catch(() => {
      // El hook conserva el error para la pantalla.
    });
  }, [
    autoLoad,
    loadConversations,
  ]);

  const createDirectConversation = useCallback(async (
    recipientIdentityId: string,
  ) => {
    const {
      currentUserId: activeUserId,
      token,
    } = await getChatAuthContext();

    const senderIdentityId = (
      privateIdentityId
      || await resolvePrivateIdentityId(token)
    );

    const response = await createDirectChatConversation(
      token,
      {
        sender_identity_id: senderIdentityId,
        recipient_identity_id: recipientIdentityId,
      },
    );

    setCurrentUserId(activeUserId);
    upsertChatConversation(response.conversation);

    synchronizeConversations(getStoredConversations());

    return mapConversationToListItem(
      response.conversation,
      activeUserId,
      isChatConversationProtected(response.conversation.id),
    );
  }, [
    privateIdentityId,
    resolvePrivateIdentityId,
    synchronizeConversations,
  ]);

  const searchUsers = useCallback(async (
    query: string,
  ) => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return [];
    }

    const { token } = await getChatAuthContext();

    const response = await searchChatRecipients(
      token,
      normalizedQuery,
      20,
    );

    return response.users.map(mapChatSearchUser);
  }, []);

  const setProtected = useCallback((
    conversationId: string,
    value: boolean,
  ) => {
    setChatConversationProtected(
      conversationId,
      value,
    );

    setRawConversations([
      ...getStoredConversations(),
    ]);
  }, []);

  const isProtected = useCallback((
    conversationId: string,
  ) => isChatConversationProtected(conversationId), []);

  const unsupportedConversationAction = useCallback(
    async () => {
      throw new Error(
        'Esta acción todavía no está conectada al API actual de Chat.',
      );
    },
    [],
  );

  const conversations = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    const protectedIds = getProtectedConversationIds();

    return rawConversations.map((conversation) => (
      mapConversationToListItem(
        conversation,
        currentUserId,
        protectedIds.includes(conversation.id),
      )
    ));
  }, [
    currentUserId,
    rawConversations,
  ]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    conversations,
    loading,
    refreshing,
    error,
    loadConversations,
    createDirectConversation,
    createGroupConversation: (
      unsupportedConversationAction as UseChatConversationsResult[
        'createGroupConversation'
      ]
    ),
    updateConversation: (
      unsupportedConversationAction as UseChatConversationsResult[
        'updateConversation'
      ]
    ),
    deleteConversation: (
      unsupportedConversationAction as UseChatConversationsResult[
        'deleteConversation'
      ]
    ),
    setProtected,
    isProtected,
    searchUsers,
    clearError,
  };
}

export interface UseChatMessagesOptions {
  conversationId: string | null | undefined;
  conversationIsAi?: boolean;
  autoLoad?: boolean;
}

export interface UseChatMessagesResult {
  messages: ChatMessageModel[];
  participants: ChatParticipant[];
  conversation: ChatConversation | null;
  currentUserId: string;
  privateIdentityId: string | null;
  postingIdentityId: string | null;
  loading: boolean;
  refreshing: boolean;
  sending: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMessages: (
    options?: {
      refresh?: boolean;
      beforeSequence?: number;
    },
  ) => Promise<ChatMessageModel[]>;
  loadMore: () => Promise<void>;
  loadConversation: () => Promise<ChatConversation | null>;
  loadParticipants: () => Promise<ChatParticipant[]>;
  sendMessage: (
    payload: {
      content: string;
      messageType?: ChatMessageType;
      replyToId?: string | null;
      fileIds?: string[];
    },
  ) => Promise<ChatMessageModel>;
  editMessage: (
    messageId: string,
    content: string,
  ) => Promise<ChatMessageModel>;
  deleteMessage: (
    messageId: string,
  ) => Promise<void>;
  togglePinnedMessage: (
    messageId: string,
    isPinned: boolean,
  ) => Promise<ChatMessageModel>;
  addParticipants: (
    userIds: string[],
  ) => Promise<ChatParticipant[]>;
  removeParticipant: (
    userId: string,
  ) => Promise<void>;
  clearError: () => void;
}

export function useChatMessages(
  {
    conversationId,
    conversationIsAi = false,
    autoLoad = true,
  }: UseChatMessagesOptions,
): UseChatMessagesResult {
  const normalizedConversationId = String(
    conversationId || '',
  ).trim();

  const [currentUserId, setCurrentUserId] = useState('');
  const [privateIdentityId, setPrivateIdentityId] = useState<
    string | null
  >(null);

  const [rawMessages, setRawMessages] = useState<
    ChatMessage[]
  >(
    normalizedConversationId
      ? getStoredMessages(normalizedConversationId)
      : [],
  );

  const [participants, setParticipants] = useState<
    ChatParticipant[]
  >([]);

  const [conversation, setConversation] = useState<
    ChatConversation | null
  >(null);

  const [loading, setLoading] = useState(
    Boolean(normalizedConversationId)
    && getStoredMessages(normalizedConversationId).length === 0,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const initialMetadata = normalizedConversationId
    ? getChatMessagesCacheMetadata(
        normalizedConversationId,
      )
    : {
        hasMore: false,
        nextBeforeSequence: null,
      };

  const [hasMore, setHasMore] = useState(
    initialMetadata.hasMore,
  );

  const [nextBeforeSequence, setNextBeforeSequence] = useState<
    number | null
  >(
    initialMetadata.nextBeforeSequence,
  );

  const [error, setError] = useState<string | null>(null);

  const postingIdentityId = (
    conversation?.posting_identity_id
    || conversation?.created_by_identity_id
    || null
  );

  const requestIdRef = useRef(0);
  const hydrationRequestIdRef = useRef(0);

  const resolvePrivateIdentityId = useCallback(async (
    token: AuthCredentials,
  ) => {
    await bootstrapChat(token);

    const response = await getChatIdentities(token);

    const identity = response.identities.find(
      (item) => (
        item.identity_type === 'profile'
        && item.is_active
      ),
    );

    if (!identity) {
      throw new Error(
        'No fue posible crear tu identidad privada de Chat.',
      );
    }

    setPrivateIdentityId(identity.id);

    return identity.id;
  }, []);

  const synchronizeMessages = useCallback((
    nextMessages: ChatMessage[],
    metadata: {
      nextBeforeSequence?: number | null;
      hasMore?: boolean;
      lastSyncedAt?: string | null;
    } = {},
  ) => {
    if (!normalizedConversationId) {
      return;
    }

    const sorted = sortMessages(nextMessages);

    setChatMessages(
      normalizedConversationId,
      sorted,
      metadata,
    );

    setRawMessages(sorted);

    if (metadata.hasMore !== undefined) {
      setHasMore(metadata.hasMore);
    }

    if (metadata.nextBeforeSequence !== undefined) {
      setNextBeforeSequence(
        metadata.nextBeforeSequence,
      );
    }
  }, [
    normalizedConversationId,
  ]);

  const hydrateCachedMessages = useCallback(async (
    activeUserId: string,
  ) => {
    if (!normalizedConversationId) {
      return [];
    }

    const hydrationRequestId = (
      hydrationRequestIdRef.current + 1
    );

    hydrationRequestIdRef.current = hydrationRequestId;

    const cachedMessages = await hydrateChatMessages(
      activeUserId,
      normalizedConversationId,
    );

    if (
      hydrationRequestId
      !== hydrationRequestIdRef.current
    ) {
      return [];
    }

    const cacheMetadata = getChatMessagesCacheMetadata(
      normalizedConversationId,
    );

    setCurrentUserId(activeUserId);
    setRawMessages(cachedMessages);
    setHasMore(cacheMetadata.hasMore);
    setNextBeforeSequence(
      cacheMetadata.nextBeforeSequence,
    );

    return cachedMessages;
  }, [
    normalizedConversationId,
  ]);

  const loadConversation = useCallback(async () => {
    if (!normalizedConversationId) {
      return null;
    }

    try {
      const {
        currentUserId: activeUserId,
        token,
      } = await getChatAuthContext();

      const response = await retryChatRequest(
        () => getChatConversation(
          token,
          normalizedConversationId,
        ),
      );

      setCurrentUserId(activeUserId);
      setConversation(response.conversation);
      upsertChatConversation(response.conversation);

      return response.conversation;
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'No fue posible cargar el chat.',
        ),
      );

      throw loadError;
    }
  }, [
    normalizedConversationId,
  ]);

  const loadParticipants = useCallback(async () => {
    if (!normalizedConversationId) {
      return [];
    }

    const { token } = await getChatAuthContext();

    const response = await retryChatRequest(
      () => getChatParticipants(
        token,
        normalizedConversationId,
      ),
    );

    setParticipants(response.participants);

    return response.participants;
  }, [
    normalizedConversationId,
  ]);

  const loadMessages = useCallback(async (
    options: {
      refresh?: boolean;
      beforeSequence?: number;
    } = {},
  ) => {
    if (!normalizedConversationId) {
      return [];
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const isLoadingHistory = (
      typeof options.beforeSequence === 'number'
    );

    if (options.refresh) {
      setRefreshing(true);
    } else if (!isLoadingHistory) {
      setLoading(
        getStoredMessages(
          normalizedConversationId,
        ).length === 0,
      );
    }

    setError(null);

    try {
      const {
        currentUserId: activeUserId,
        token,
      } = await getChatAuthContext();

      const cachedMessages = await hydrateCachedMessages(
        activeUserId,
      );

      if (requestId !== requestIdRef.current) {
        return [];
      }

      const response = await retryChatRequest(
        () => getChatMessages(
          token,
          normalizedConversationId,
          {
            limit: DEFAULT_LIMIT,
            beforeSequence: options.beforeSequence,
          },
        ),
      );

      if (requestId !== requestIdRef.current) {
        return [];
      }

      const messagesBeforeRequest = (
        getStoredMessages(normalizedConversationId)
      );

      const currentMessages = (
        isLoadingHistory
          ? messagesBeforeRequest
          : cachedMessages
      );

      const mergedMessages = mergeMessages(
        currentMessages,
        response.messages,
      );

      const hasOlderMessages = (
        response.next_before_sequence !== null
      );

      synchronizeMessages(
        mergedMessages,
        {
          nextBeforeSequence: (
            response.next_before_sequence
          ),
          hasMore: hasOlderMessages,
          lastSyncedAt: new Date().toISOString(),
        },
      );

      setCurrentUserId(activeUserId);

      return mergedMessages.map((message) => (
        mapChatMessageToModel(
          message,
          activeUserId,
          {
            conversationIsAi,
          },
        )
      ));
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          getErrorMessage(
            loadError,
            'No fue posible cargar los mensajes.',
          ),
        );
      }

      throw loadError;
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    conversationIsAi,
    hydrateCachedMessages,
    normalizedConversationId,
    synchronizeMessages,
  ]);

  useEffect(() => {
    if (!autoLoad || !normalizedConversationId) {
      return;
    }

    let cancelled = false;

    const initializeConversation = async () => {
      try {
        const {
          currentUserId: activeUserId,
        } = await getChatAuthContext();

        if (cancelled) {
          return;
        }

        await hydrateCachedMessages(activeUserId);

        if (cancelled) {
          return;
        }

        const [
          loadedConversation,
        ] = await Promise.all([
          loadConversation(),
          loadParticipants(),
          loadMessages(),
        ]);

        if (
          loadedConversation?.conversation_type === 'group'
          && (
            loadedConversation.posting_identity_id
            || loadedConversation.created_by_identity_id
          )
        ) {
          const { token } = await getChatAuthContext();

          await resolvePrivateIdentityId(token);
        }
      } catch {
        // El hook conserva el error para mostrarlo en pantalla.
      }
    };

    void initializeConversation();

    return () => {
      cancelled = true;
      requestIdRef.current += 1;
      hydrationRequestIdRef.current += 1;
    };
  }, [
    autoLoad,
    hydrateCachedMessages,
    loadConversation,
    loadMessages,
    loadParticipants,
    normalizedConversationId,
  ]);

  useEffect(() => {
    setRawMessages(
      normalizedConversationId
        ? getStoredMessages(normalizedConversationId)
        : [],
    );

    const metadata = normalizedConversationId
      ? getChatMessagesCacheMetadata(
          normalizedConversationId,
        )
      : {
          hasMore: false,
          nextBeforeSequence: null,
        };

    setHasMore(metadata.hasMore);
    setNextBeforeSequence(
      metadata.nextBeforeSequence,
    );
    setError(null);
  }, [
    normalizedConversationId,
  ]);

  const loadMore = useCallback(async () => {
    if (
      !normalizedConversationId
      || loading
      || refreshing
      || loadingMore
      || !hasMore
      || nextBeforeSequence === null
    ) {
      return;
    }

    try {
      setLoadingMore(true);

      await loadMessages({
        beforeSequence: nextBeforeSequence,
      });
    } finally {
      setLoadingMore(false);
    }
  }, [
    hasMore,
    loadMessages,
    loading,
    loadingMore,
    nextBeforeSequence,
    normalizedConversationId,
    refreshing,
  ]);

  const sendMessage = useCallback(async (
    payload: {
      content: string;
      messageType?: ChatMessageType;
      replyToId?: string | null;
      fileIds?: string[];
    },
  ) => {
    if (!normalizedConversationId) {
      throw new Error(
        'No fue posible identificar el chat.',
      );
    }

    const body = payload.content.trim();

    if (!body) {
      throw new Error(
        'Escribe un mensaje antes de enviarlo.',
      );
    }

    setSending(true);
    setError(null);

    try {
      const {
        currentUserId: activeUserId,
        token,
      } = await getChatAuthContext();

      await hydrateCachedMessages(activeUserId);

      const senderIdentityId = (
        privateIdentityId
        || await resolvePrivateIdentityId(token)
      );

      const allowedPostingIdentityId = (
        conversation?.posting_identity_id
        || conversation?.created_by_identity_id
        || null
      );

      if (
        conversation?.conversation_type === 'group'
        && allowedPostingIdentityId
        && senderIdentityId !== allowedPostingIdentityId
      ) {
        throw new Error(
          'No tienes permiso para enviar mensajes en este grupo.',
        );
      }

      const response = await sendChatMessage(
        token,
        normalizedConversationId,
        {
          sender_identity_id: senderIdentityId,
          body,
          message_type: 'text',
        },
      );

      setCurrentUserId(activeUserId);

      upsertChatMessage(
        normalizedConversationId,
        response.message,
      );

      updateChatConversationLastMessage(
        normalizedConversationId,
        response.message,
      );

      setRawMessages(
        getStoredMessages(normalizedConversationId),
      );

      return mapChatMessageToModel(
        response.message,
        activeUserId,
        {
          conversationIsAi,
        },
      );
    } catch (sendError) {
      const message = getErrorMessage(
        sendError,
        'No fue posible enviar el mensaje.',
      );

      setError(message);

      throw new Error(message);
    } finally {
      setSending(false);
    }
  }, [
    conversation,
    conversationIsAi,
    hydrateCachedMessages,
    normalizedConversationId,
    privateIdentityId,
    resolvePrivateIdentityId,
  ]);

  const unsupportedMessageAction = useCallback(
    async () => {
      throw new Error(
        'Esta acción todavía no está conectada al API actual de Chat.',
      );
    },
    [],
  );

  const messages = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    return rawMessages.map((message) => (
      mapChatMessageToModel(
        message,
        currentUserId,
        {
          conversationIsAi,
        },
      )
    ));
  }, [
    conversationIsAi,
    currentUserId,
    rawMessages,
  ]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    participants,
    conversation,
    currentUserId,
    privateIdentityId,
    postingIdentityId,
    loading,
    refreshing,
    sending,
    loadingMore,
    hasMore,
    error,
    loadMessages,
    loadMore,
    loadConversation,
    loadParticipants,
    sendMessage,
    editMessage: (
      unsupportedMessageAction as UseChatMessagesResult[
        'editMessage'
      ]
    ),
    deleteMessage: (
      unsupportedMessageAction as UseChatMessagesResult[
        'deleteMessage'
      ]
    ),
    togglePinnedMessage: (
      unsupportedMessageAction as UseChatMessagesResult[
        'togglePinnedMessage'
      ]
    ),
    addParticipants: (
      unsupportedMessageAction as UseChatMessagesResult[
        'addParticipants'
      ]
    ),
    removeParticipant: (
      unsupportedMessageAction as UseChatMessagesResult[
        'removeParticipant'
      ]
    ),
    clearError,
  };
}
