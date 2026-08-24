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
  getProtectedConversationIds,
  hydrateChatConversations,
  isChatConversationProtected,
  setChatConversationProtected,
  setChatConversations,
  setChatMessages,
  updateChatConversationLastMessage,
  upsertChatConversation,
  upsertChatMessage,
} from '../stores/chatStore';

const DEFAULT_LIMIT = 50;

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
  loading: boolean;
  refreshing: boolean;
  sending: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMessages: (
    options?: {
      refresh?: boolean;
      offset?: number;
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
  const [currentUserId, setCurrentUserId] = useState('');
  const [privateIdentityId, setPrivateIdentityId] = useState<
    string | null
  >(null);

  const [rawMessages, setRawMessages] = useState<
    ChatMessage[]
  >(
    conversationId
      ? getStoredMessages(conversationId)
      : [],
  );

  const [participants, setParticipants] = useState<
    ChatParticipant[]
  >([]);

  const [conversation, setConversation] = useState<
    ChatConversation | null
  >(null);

  const [loading, setLoading] = useState(
    Boolean(conversationId)
    && getStoredMessages(conversationId || '').length === 0,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBeforeSequence, setNextBeforeSequence] = useState<
    number | null
  >(null);

  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

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
  ) => {
    if (!conversationId) {
      return;
    }

    const sorted = [...nextMessages].sort((left, right) => (
      new Date(left.created_at).getTime()
      - new Date(right.created_at).getTime()
    ));

    setChatMessages(
      conversationId,
      sorted,
    );

    setRawMessages(sorted);
  }, [
    conversationId,
  ]);

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      return null;
    }

    try {
      const {
        currentUserId: activeUserId,
        token,
      } = await getChatAuthContext();

      const response = await getChatConversation(
        token,
        conversationId,
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
    conversationId,
  ]);

  const loadParticipants = useCallback(async () => {
    if (!conversationId) {
      return [];
    }

    const { token } = await getChatAuthContext();

    const response = await getChatParticipants(
      token,
      conversationId,
    );

    setParticipants(response.participants);

    return response.participants;
  }, [
    conversationId,
  ]);

  const loadMessages = useCallback(async (
    options: {
      refresh?: boolean;
      offset?: number;
    } = {},
  ) => {
    if (!conversationId) {
      return [];
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (options.refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const {
        currentUserId: activeUserId,
        token,
      } = await getChatAuthContext();

      const response = await getChatMessages(
        token,
        conversationId,
        {
          limit: DEFAULT_LIMIT,
          beforeSequence: options.offset || undefined,
        },
      );

      if (requestId !== requestIdRef.current) {
        return [];
      }

      const currentMessages = options.offset
        ? getStoredMessages(conversationId)
        : [];

      const mergedMessages = [
        ...currentMessages,
        ...response.messages,
      ].filter((message, index, allMessages) => (
        allMessages.findIndex(
          (candidate) => candidate.id === message.id,
        ) === index
      ));

      setCurrentUserId(activeUserId);
      synchronizeMessages(mergedMessages);

      setHasMore(
        response.next_before_sequence !== null,
      );

      setNextBeforeSequence(
        response.next_before_sequence,
      );

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
    conversationId,
    conversationIsAi,
    synchronizeMessages,
  ]);

  useEffect(() => {
    if (!autoLoad || !conversationId) {
      return;
    }

    void Promise.all([
      loadConversation(),
      loadParticipants(),
      loadMessages(),
    ]).catch(() => {
      // El hook conserva el error para mostrarlo en pantalla.
    });
  }, [
    autoLoad,
    conversationId,
    loadConversation,
    loadMessages,
    loadParticipants,
  ]);

  const loadMore = useCallback(async () => {
    if (
      !conversationId
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
        offset: nextBeforeSequence,
      });
    } finally {
      setLoadingMore(false);
    }
  }, [
    conversationId,
    hasMore,
    loadMessages,
    loading,
    loadingMore,
    nextBeforeSequence,
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
    if (!conversationId) {
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
        conversationId,
        {
          sender_identity_id: senderIdentityId,
          body,
          message_type: 'text',
        },
      );

      setCurrentUserId(activeUserId);
      upsertChatMessage(
        conversationId,
        response.message,
      );
      updateChatConversationLastMessage(
        conversationId,
        response.message,
      );

      setRawMessages(
        getStoredMessages(conversationId),
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
    conversationId,
    conversationIsAi,
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