import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  addChatParticipants,
  createDirectChatConversation,
  createGroupChatConversation,
  deleteChatConversation,
  deleteChatMessage,
  getChatConversation,
  getChatConversations,
  getChatMessages,
  getChatParticipants,
  pinChatMessage,
  removeChatParticipant,
  searchChatUsers,
  sendChatMessage,
  unpinChatMessage,
  updateChatConversation,
  updateChatMessage,
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
  isChatConversationProtected,
  removeChatConversation,
  removeChatMessage,
  setChatConversationProtected,
  setChatConversations,
  setChatMessages,
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
    const leftPinned = Boolean(left.is_pinned);
    const rightPinned = Boolean(right.is_pinned);

    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

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

  return {
    currentUserId: session.user.id,
    token: token as AuthCredentials,
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
    includeArchived = false,
  }: UseChatConversationsOptions = {},
): UseChatConversationsResult {
  const [rawConversations, setRawConversations] = useState<
    ChatConversation[]
  >(
    getStoredConversations(),
  );

  const [currentUserId, setCurrentUserId] = useState('');
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

  const loadConversations = useCallback(async (
    options: {
      refresh?: boolean;
      archived?: boolean;
    } = {},
  ) => {
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
        currentUserId: nextCurrentUserId,
        token,
      } = await getChatAuthContext();

      const archived = options.archived ?? includeArchived;

      const response = await getChatConversations(
        token,
        {
          archived,
          limit: 100,
          offset: 0,
        },
      );

      if (requestId !== requestIdRef.current) {
        return [];
      }

      setCurrentUserId(nextCurrentUserId);
      synchronizeConversations(response.conversations);

      return response.conversations.map((conversation) => (
        mapConversationToListItem(
          conversation,
          nextCurrentUserId,
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
    includeArchived,
    synchronizeConversations,
  ]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    void loadConversations().catch(() => {
      // El mensaje de error ya se mantiene en el estado local.
    });
  }, [
    autoLoad,
    loadConversations,
  ]);

  const createDirectConversation = useCallback(async (
    userId: string,
  ) => {
    const {
      currentUserId: activeUserId,
      token,
    } = await getChatAuthContext();

    const response = await createDirectChatConversation(
      token,
      {
        user_id: userId,
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
    synchronizeConversations,
  ]);

  const createGroupConversation = useCallback(async (
    payload: {
      name: string;
      description?: string;
      participantIds: string[];
    },
  ) => {
    const {
      currentUserId: activeUserId,
      token,
    } = await getChatAuthContext();

    const response = await createGroupChatConversation(
      token,
      {
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        participant_ids: payload.participantIds,
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
    synchronizeConversations,
  ]);

  const updateConversation = useCallback(async (
    conversationId: string,
    payload: {
      name?: string;
      description?: string | null;
      isMuted?: boolean;
      isArchived?: boolean;
      isPinned?: boolean;
    },
  ) => {
    const {
      currentUserId: activeUserId,
      token,
    } = await getChatAuthContext();

    const response = await updateChatConversation(
      token,
      conversationId,
      {
        name: payload.name,
        description: payload.description,
        is_muted: payload.isMuted,
        is_archived: payload.isArchived,
        is_pinned: payload.isPinned,
      },
    );

    setCurrentUserId(activeUserId);
    upsertChatConversation(response.conversation);

    synchronizeConversations(getStoredConversations());

    return mapConversationToListItem(
      response.conversation,
      activeUserId,
      isChatConversationProtected(conversationId),
    );
  }, [
    synchronizeConversations,
  ]);

  const deleteConversation = useCallback(async (
    conversationId: string,
  ) => {
    const { token } = await getChatAuthContext();

    await deleteChatConversation(
      token,
      conversationId,
    );

    removeChatConversation(conversationId);
    synchronizeConversations(getStoredConversations());
  }, [
    synchronizeConversations,
  ]);

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

  const searchUsers = useCallback(async (
    query: string,
  ) => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return [];
    }

    const { token } = await getChatAuthContext();

    const response = await searchChatUsers(
      token,
      normalizedQuery,
      20,
    );

    return response.users.map(mapChatSearchUser);
  }, []);

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
    createGroupConversation,
    updateConversation,
    deleteConversation,
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
  const [nextOffset, setNextOffset] = useState<
    number | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

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

      const offset = options.offset || 0;

      const response = await getChatMessages(
        token,
        conversationId,
        {
          limit: DEFAULT_LIMIT,
          offset,
        },
      );

      if (requestId !== requestIdRef.current) {
        return [];
      }

      setCurrentUserId(activeUserId);

      const currentMessages = (
        offset > 0
          ? getStoredMessages(conversationId)
          : []
      );

      const mergedMessages = [
        ...currentMessages,
        ...response.messages,
      ].filter((message, index, allMessages) => (
        allMessages.findIndex(
          (candidate) => candidate.id === message.id,
        ) === index
      ));

      synchronizeMessages(mergedMessages);

      setHasMore(
        Boolean(response.has_more),
      );

      setNextOffset(
        response.next_offset
        ?? (
          response.has_more
            ? offset + response.messages.length
            : null
        ),
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
      // El estado error ya se actualizó desde las acciones fallidas.
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
      || nextOffset === null
    ) {
      return;
    }

    try {
      setLoadingMore(true);
      await loadMessages({
        offset: nextOffset,
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
    nextOffset,
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

    const content = payload.content.trim();

    if (
      !content
      && (!payload.fileIds || payload.fileIds.length === 0)
    ) {
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

      const response = await sendChatMessage(
        token,
        conversationId,
        {
          content,
          message_type: payload.messageType || 'text',
          reply_to_id: payload.replyToId || null,
          file_ids: payload.fileIds || [],
        },
      );

      setCurrentUserId(activeUserId);
      upsertChatMessage(
        conversationId,
        response.message,
      );
      setRawMessages(getStoredMessages(conversationId));

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
  ]);

  const editMessage = useCallback(async (
    messageId: string,
    content: string,
  ) => {
    if (!conversationId) {
      throw new Error(
        'No fue posible identificar el chat.',
      );
    }

    const normalizedContent = content.trim();

    if (!normalizedContent) {
      throw new Error(
        'El mensaje no puede quedar vacío.',
      );
    }

    const {
      currentUserId: activeUserId,
      token,
    } = await getChatAuthContext();

    const response = await updateChatMessage(
      token,
      conversationId,
      messageId,
      {
        content: normalizedContent,
      },
    );

    setCurrentUserId(activeUserId);
    upsertChatMessage(
      conversationId,
      response.message,
    );
    setRawMessages(getStoredMessages(conversationId));

    return mapChatMessageToModel(
      response.message,
      activeUserId,
      {
        conversationIsAi,
      },
    );
  }, [
    conversationId,
    conversationIsAi,
  ]);

  const deleteMessage = useCallback(async (
    messageId: string,
  ) => {
    if (!conversationId) {
      throw new Error(
        'No fue posible identificar el chat.',
      );
    }

    const { token } = await getChatAuthContext();

    await deleteChatMessage(
      token,
      conversationId,
      messageId,
    );

    removeChatMessage(
      conversationId,
      messageId,
    );

    setRawMessages(getStoredMessages(conversationId));
  }, [
    conversationId,
  ]);

  const togglePinnedMessage = useCallback(async (
    messageId: string,
    isPinned: boolean,
  ) => {
    if (!conversationId) {
      throw new Error(
        'No fue posible identificar el chat.',
      );
    }

    const {
      currentUserId: activeUserId,
      token,
    } = await getChatAuthContext();

    const response = isPinned
      ? await unpinChatMessage(
          token,
          conversationId,
          messageId,
        )
      : await pinChatMessage(
          token,
          conversationId,
          messageId,
        );

    setCurrentUserId(activeUserId);
    upsertChatMessage(
      conversationId,
      response.message,
    );
    setRawMessages(getStoredMessages(conversationId));

    return mapChatMessageToModel(
      response.message,
      activeUserId,
      {
        conversationIsAi,
      },
    );
  }, [
    conversationId,
    conversationIsAi,
  ]);

  const addParticipants = useCallback(async (
    userIds: string[],
  ) => {
    if (!conversationId) {
      throw new Error(
        'No fue posible identificar el grupo.',
      );
    }

    const { token } = await getChatAuthContext();

    const response = await addChatParticipants(
      token,
      conversationId,
      {
        user_ids: userIds,
      },
    );

    setParticipants(response.participants);

    return response.participants;
  }, [
    conversationId,
  ]);

  const removeParticipant = useCallback(async (
    userId: string,
  ) => {
    if (!conversationId) {
      throw new Error(
        'No fue posible identificar el grupo.',
      );
    }

    const { token } = await getChatAuthContext();

    await removeChatParticipant(
      token,
      conversationId,
      userId,
    );

    setParticipants((currentParticipants) => (
      currentParticipants.filter(
        (participant) => participant.user_id !== userId,
      )
    ));
  }, [
    conversationId,
  ]);

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
    editMessage,
    deleteMessage,
    togglePinnedMessage,
    addParticipants,
    removeParticipant,
    clearError,
  };
}
