import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  bootstrapChat,
  clearChatConversation,
  createChatGroup,
  createDirectChatConversation,
  getChatConversation,
  getChatIdentities,
  getChatInbox,
  getChatMessage,
  getChatMessages,
  getChatParticipants,
  inviteToChatGroup,
  leaveChatGroup,
  markChatConversationRead,
  removeChatGroupParticipant,
  searchChatRecipients,
  sendChatMessage,
  updateChatGroup,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  ChatConversation,
  ChatGroupPostingPolicy,
  ChatMessage,
  ChatMessageType,
  ChatParticipant,
} from '@beeapp/shared-types';

import {
  getValidAuthSession,
  getValidSessionCredentials,
} from '../services/authSession';
import { startChatRealtime } from '../services/chatRealtime';
import {
  mapChatMessageToModel,
  mapChatSearchUser,
  mapConversationToListItem,
  type ChatListItemModel,
  type ChatMessageModel,
  type ChatUserOption,
} from '../services/chatService';
import {
  getLatestIncomingChatMessage,
} from '../services/chatMessageReceipts';
import {
  getChatMessageReceiptStatus,
} from '../services/chatReceiptStatus';
import {
  uploadChatAttachmentMessage,
  type UploadableChatAttachment,
} from '../services/chatAttachmentService';
import {
  getChatConversations as getStoredConversations,
  getChatMessages as getStoredMessages,
  getChatMessagesCacheMetadata,
  getProtectedConversationIds,
  resetChatConversationMessages,
  isChatConversationArchived,
  isChatConversationProtected,
  removeChatConversation,
  setChatConversationArchived,
  setChatConversationProtected,
  setChatConversations,
  setChatMessages,
  subscribeChatStore,
  upsertChatConversation,
  updateChatConversationLastMessage,
  upsertChatMessage,
} from '../stores/chatStore';

const DEFAULT_LIMIT = 50;
const HISTORY_PAGE_LIMIT = 20;
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

function mergeConversation(
  current: ChatConversation,
  incoming: ChatConversation,
): ChatConversation {
  const currentDate = new Date(
    current.last_message_at
    || current.updated_at
    || current.created_at,
  ).getTime();

  const incomingDate = new Date(
    incoming.last_message_at
    || incoming.updated_at
    || incoming.created_at,
  ).getTime();

  const newest = incomingDate >= currentDate
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
    own_participant: (
      newest.own_participant
      || oldest.own_participant
      || null
    ),
    permissions: (
      newest.permissions
      || oldest.permissions
      || null
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

export async function openCommercialDirectConversation(
  commercialProfileId: string,
): Promise<{
  conversationId: string;
  displayName: string;
}> {
  const normalizedCommercialProfileId = String(
    commercialProfileId || '',
  ).trim();

  if (!normalizedCommercialProfileId) {
    throw new Error(
      'No fue posible identificar el negocio para abrir el chat.',
    );
  }

  const {
    loadPublicCommercialProfile,
    openPublicCommercialProfileChat,
  } = await import('../services/commercialService');

  const [
    profileResponse,
    chatResponse,
  ] = await Promise.all([
    loadPublicCommercialProfile(normalizedCommercialProfileId),
    openPublicCommercialProfileChat(normalizedCommercialProfileId),
  ]);

  return {
    conversationId: chatResponse.conversation_id,
    displayName: (
      profileResponse.profile.display_name
      || 'Negocio'
    ),
  };
}

export async function getPrivateChatIdentityId(): Promise<string> {
  const {
    token,
  } = await getChatAuthContext();

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

  return identity.id;
}

export interface UseChatConversationsOptions {
  autoLoad?: boolean;
  includeArchived?: boolean;
  identityId?: string | null;
}

export interface UseChatConversationsResult {
  conversations: ChatListItemModel[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  activeIdentityId: string | null;
  loadConversations: (
    options?: {
      refresh?: boolean;
      archived?: boolean;
      network?: boolean;
    },
  ) => Promise<ChatListItemModel[]>;
  createDirectConversation: (
    recipientIdentityId: string,
  ) => Promise<ChatListItemModel>;
  createGroupConversation: (
    payload: {
      name: string;
      description?: string | null;
      postingPolicy: ChatGroupPostingPolicy;
      participantIds?: string[];
    },
  ) => Promise<{
    conversation: ChatListItemModel;
    invitedCount: number;
    inviteFailures: Array<{
      identityId: string;
      detail: string;
    }>;
  }>;
  updateConversation: (
    conversationId: string,
    payload: {
      name?: string;
      description?: string | null;
      postingPolicy?: ChatGroupPostingPolicy;
      imageFileId?: string | null;
      isMuted?: boolean;
      isArchived?: boolean;
      isPinned?: boolean;
    },
  ) => Promise<ChatListItemModel>;
  deleteConversation: (
    conversationId: string,
  ) => Promise<void>;
  archiveConversation: (
    conversationId: string,
  ) => Promise<void>;
  restoreConversation: (
    conversationId: string,
  ) => Promise<void>;
  isArchived: (
    conversationId: string,
  ) => boolean;
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
    identityId: requestedIdentityId = null,
  }: UseChatConversationsOptions = {},
): UseChatConversationsResult {
  const normalizedRequestedIdentityId = String(
    requestedIdentityId || '',
  ).trim() || null;
  const [rawConversations, setRawConversations] = useState<
    ChatConversation[]
  >(
    getStoredConversations(),
  );

  const [currentUserId, setCurrentUserId] = useState('');
  const [activeIdentityId, setActiveIdentityId] = useState<
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
    const existingById = new Map(
      getStoredConversations().map((item) => [item.id, item]),
    );
    const merged = nextConversations.map((incoming) => {
      const current = existingById.get(incoming.id);
      if (!current) {
        return incoming;
      }

      const combined = mergeConversation(current, incoming);
      const hasFullParticipants = (
        current.participants?.some((participant) => (
          !participant.id.startsWith('own:')
          && Boolean(participant.joined_at)
        )) ?? false
      );
      return {
        ...combined,
        participants: hasFullParticipants
          ? current.participants
          : combined.participants,
        own_participant: (
          incoming.own_participant?.id.startsWith('own:')
          && current.own_participant
          && !current.own_participant.id.startsWith('own:')
            ? current.own_participant
            : combined.own_participant
        ),
      };
    });
    const sorted = sortConversations(merged);

    setChatConversations(sorted);
    setRawConversations(getStoredConversations());
  }, []);

  const resolveActiveIdentityId = useCallback(async (
    token: AuthCredentials,
  ) => {
    if (normalizedRequestedIdentityId) {
      setActiveIdentityId(normalizedRequestedIdentityId);
      return normalizedRequestedIdentityId;
    }

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

    setActiveIdentityId(identity.id);

    return identity.id;
  }, [normalizedRequestedIdentityId]);

  const loadConversations = useCallback(async (
    options: {
      refresh?: boolean;
      archived?: boolean;
      network?: boolean;
    } = {},
  ) => {
    const requestedNetwork = options.network !== false;

    /*
     * Solo las solicitudes remotas compiten entre sí. La lectura de
     * caché debe poder terminar y pintar la UI aunque simultáneamente
     * iniciemos una reconciliación desde red.
     */
    const requestId = requestedNetwork
      ? requestIdRef.current + 1
      : requestIdRef.current;

    if (requestedNetwork) {
      requestIdRef.current = requestId;
    }
    const hasMemoryCache = getStoredConversations().length > 0;

    if (options.refresh && requestedNetwork) {
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

      const identityId = (
        activeIdentityId
        || await resolveActiveIdentityId(token)
      );


      if (
        requestedNetwork
        && requestId !== requestIdRef.current
      ) {
        return [];
      }

      setCurrentUserId(activeUserId);


      const response = await getChatInbox(
        token,
        identityId,
        {
          limit: 100,
        },
      );

      if (
        requestId !== requestIdRef.current
      ) {
        return [];
      }

      setCurrentUserId(activeUserId);
      synchronizeConversations(response.conversations);

      /*
       * Los mensajes no se precargan al login ni al refrescar el inbox.
       * Cada conversación muestra primero su caché local al abrirse y
       * consulta la red solo cuando necesita sincronizarse.
       */

      return getStoredConversations().map((conversation) => (
        mapConversationToListItem(
          {
            ...conversation,
            is_archived: isChatConversationArchived(
              conversation.id,
            ),
          },
          activeUserId,
          isChatConversationProtected(conversation.id),
        )
      ));
    } catch (loadError) {
      if (
        !requestedNetwork
        || requestId === requestIdRef.current
      ) {
        setError(
          getErrorMessage(
            loadError,
            'No fue posible cargar tus chats.',
          ),
        );
      }

      throw loadError;
    } finally {
      if (
        !requestedNetwork
        || requestId === requestIdRef.current
      ) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    activeIdentityId,
    resolveActiveIdentityId,
    synchronizeConversations,
  ]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }


    void loadConversations({
      network: true,
    }).catch(() => {
      // El hook conserva el error para mostrarlo en pantalla.
    });

  }, [
    autoLoad,
    loadConversations,
  ]);

  useEffect(() => {
    return subscribeChatStore((change) => {
      if (
        change.type === 'conversations'
        || change.type === 'conversation-removed'
        || change.type === 'reset'
      ) {
        setRawConversations([
          ...getStoredConversations(),
        ]);
      }
    });
  }, []);

  const createDirectConversation = useCallback(async (
    recipientIdentityId: string,
  ) => {
    const {
      currentUserId: activeUserId,
      token,
    } = await getChatAuthContext();

    const senderIdentityId = (
      activeIdentityId
      || await resolveActiveIdentityId(token)
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
    activeIdentityId,
    resolveActiveIdentityId,
    synchronizeConversations,
  ]);

  const createGroupConversation = useCallback(async (
    payload: {
      name: string;
      description?: string | null;
      postingPolicy: ChatGroupPostingPolicy;
      participantIds?: string[];
    },
  ) => {
    const normalizedName = payload.name.trim();

    if (!normalizedName) {
      throw new Error(
        'El nombre del grupo es obligatorio.',
      );
    }

    const {
      currentUserId: activeUserId,
      token,
    } = await getChatAuthContext();

    const creatorIdentityId = (
      activeIdentityId
      || await resolveActiveIdentityId(token)
    );

    const created = await createChatGroup(
      token,
      {
        creator_identity_id: creatorIdentityId,
        name: normalizedName,
        posting_policy: payload.postingPolicy,
        description: payload.description?.trim() || null,
      },
    );

    setCurrentUserId(activeUserId);
    upsertChatConversation(created.conversation);
    synchronizeConversations(getStoredConversations());

    const uniqueParticipantIds = Array.from(
      new Set(
        (payload.participantIds || [])
          .map((identityId) => identityId.trim())
          .filter(
            (identityId) => (
              Boolean(identityId)
              && identityId !== creatorIdentityId
            ),
          ),
      ),
    );

    const inviteResults = await Promise.allSettled(
      uniqueParticipantIds.map((identityId) => (
        inviteToChatGroup(
          token,
          created.conversation.id,
          {
            actor_identity_id: creatorIdentityId,
            invited_identity_id: identityId,
          },
        )
      )),
    );

    const inviteFailures = inviteResults
      .map((result, index) => ({
        result,
        identityId: uniqueParticipantIds[index],
      }))
      .filter((
        item,
      ): item is {
        result: PromiseRejectedResult;
        identityId: string;
      } => item.result.status === 'rejected')
      .map((item) => ({
        identityId: item.identityId,
        detail: getErrorMessage(
          item.result.reason,
          'No fue posible enviar la invitación.',
        ),
      }));

    return {
      conversation: mapConversationToListItem(
        created.conversation,
        activeUserId,
        isChatConversationProtected(created.conversation.id),
      ),
      invitedCount: (
        uniqueParticipantIds.length
        - inviteFailures.length
      ),
      inviteFailures,
    };
  }, [
    activeIdentityId,
    resolveActiveIdentityId,
    synchronizeConversations,
  ]);

  const updateConversation = useCallback(async (
    conversationId: string,
    payload: {
      name?: string;
      description?: string | null;
      postingPolicy?: ChatGroupPostingPolicy;
      imageFileId?: string | null;
      isMuted?: boolean;
      isArchived?: boolean;
      isPinned?: boolean;
    },
  ) => {
    const normalizedConversationId = conversationId.trim();

    if (!normalizedConversationId) {
      throw new Error(
        'No fue posible identificar el chat.',
      );
    }

    if (
      payload.isMuted !== undefined
      || payload.isPinned !== undefined
    ) {
      throw new Error(
        'Esta preferencia todavía no está disponible en el backend de Chat.',
      );
    }

    if (payload.isArchived !== undefined) {
      setChatConversationArchived(
        normalizedConversationId,
        payload.isArchived,
      );

      setRawConversations([
        ...getStoredConversations(),
      ]);

      const currentConversation = getStoredConversations().find(
        (conversation) => (
          conversation.id === normalizedConversationId
        ),
      );

      if (!currentConversation) {
        throw new Error(
          'No fue posible encontrar el chat para actualizarlo.',
        );
      }

      return mapConversationToListItem(
        {
          ...currentConversation,
          is_archived: payload.isArchived,
        },
        currentUserId,
        isChatConversationProtected(
          normalizedConversationId,
        ),
      );
    }

    const {
      currentUserId: activeUserId,
      token,
    } = await getChatAuthContext();

    const actorIdentityId = (
      activeIdentityId
      || await resolveActiveIdentityId(token)
    );

    const response = await updateChatGroup(
      token,
      normalizedConversationId,
      {
        actor_identity_id: actorIdentityId,
        ...(payload.name !== undefined
          ? {
              name: payload.name,
            }
          : {}),
        ...(payload.description !== undefined
          ? {
              description: payload.description,
            }
          : {}),
        ...(payload.postingPolicy !== undefined
          ? {
              posting_policy: payload.postingPolicy,
            }
          : {}),
        ...(payload.imageFileId !== undefined
          ? {
              image_file_id: payload.imageFileId,
            }
          : {}),
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
    activeIdentityId,
    resolveActiveIdentityId,
    synchronizeConversations,
  ]);

  const deleteConversation = useCallback(async (
    conversationId: string,
  ) => {
    const normalizedConversationId = conversationId.trim();

    if (!normalizedConversationId) {
      throw new Error(
        'No fue posible identificar el chat.',
      );
    }

    const { token } = await getChatAuthContext();

    const identityId = (
      activeIdentityId
      || await resolveActiveIdentityId(token)
    );

    await clearChatConversation(
      token,
      normalizedConversationId,
      {
        identity_id: identityId,
      },
    );

    removeChatConversation(normalizedConversationId);
    setRawConversations(getStoredConversations());
  }, [
    activeIdentityId,
    resolveActiveIdentityId,
  ]);

  const archiveConversation = useCallback(async (
    conversationId: string,
  ) => {
    const normalizedConversationId = conversationId.trim();

    if (!normalizedConversationId) {
      throw new Error(
        'No fue posible identificar el chat.',
      );
    }

    const exists = getStoredConversations().some(
      (conversation) => (
        conversation.id === normalizedConversationId
      ),
    );

    if (!exists) {
      throw new Error(
        'No fue posible encontrar el chat para archivarlo.',
      );
    }

    setChatConversationArchived(
      normalizedConversationId,
      true,
    );

    setRawConversations([
      ...getStoredConversations(),
    ]);
  }, []);

  const restoreConversation = useCallback(async (
    conversationId: string,
  ) => {
    const normalizedConversationId = conversationId.trim();

    if (!normalizedConversationId) {
      throw new Error(
        'No fue posible identificar el chat.',
      );
    }

    setChatConversationArchived(
      normalizedConversationId,
      false,
    );

    setRawConversations([
      ...getStoredConversations(),
    ]);
  }, []);

  const isArchived = useCallback((
    conversationId: string,
  ) => isChatConversationArchived(conversationId), []);

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

  const conversations = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    const protectedIds = getProtectedConversationIds();

    return rawConversations.map((conversation) => (
      mapConversationToListItem(
        {
          ...conversation,
          is_archived: isChatConversationArchived(
            conversation.id,
          ),
        },
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
    activeIdentityId,
    loadConversations,
    createDirectConversation,
    createGroupConversation,
    updateConversation,
    deleteConversation,
    archiveConversation,
    restoreConversation,
    isArchived,
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
  identityId?: string | null;
}

export interface UseChatMessagesResult {
  messages: ChatMessageModel[];
  participants: ChatParticipant[];
  conversation: ChatConversation | null;
  currentUserId: string;
  activeIdentityId: string | null;
  postingIdentityId: string | null;
  loading: boolean;
  refreshing: boolean;
  sending: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  initialLoadingPhase: 'conversation' | 'messages' | 'ready';
  error: string | null;
  loadMessages: (
    options?: {
      refresh?: boolean;
      beforeSequence?: number;
      network?: boolean;
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
      attachmentFileId?: string | null;
    },
  ) => Promise<ChatMessageModel>;
  sendAttachmentMessage: (
    payload: {
      attachment: UploadableChatAttachment;
      content?: string;
      replyToId?: string | null;
    },
  ) => Promise<ChatMessageModel>;
  editMessage: (
    messageId: string,
    content: string,
  ) => Promise<ChatMessageModel>;
  togglePinnedMessage: (
    messageId: string,
    isPinned: boolean,
  ) => Promise<ChatMessageModel>;
  addParticipants: (
    identityIds: string[],
  ) => Promise<ChatParticipant[]>;
  removeParticipant: (
    identityId: string,
  ) => Promise<void>;
  leaveGroup: () => Promise<void>;
  clearError: () => void;
}

export function useChatMessages(
  {
    conversationId,
    conversationIsAi = false,
    autoLoad = true,
    identityId: requestedIdentityId = null,
  }: UseChatMessagesOptions,
): UseChatMessagesResult {
  const normalizedRequestedIdentityId = String(
    requestedIdentityId || '',
  ).trim() || null;
  const normalizedConversationId = String(
    conversationId || '',
  ).trim();

  const [currentUserId, setCurrentUserId] = useState('');
  const [activeIdentityId, setActiveIdentityId] = useState<
    string | null
  >(null);

  const [rawMessages, setRawMessages] = useState<
    ChatMessage[]
  >([]);

  const [participants, setParticipants] = useState<
    ChatParticipant[]
  >([]);

  const [conversation, setConversation] = useState<
    ChatConversation | null
  >(null);

  const [loading, setLoading] = useState(
    Boolean(normalizedConversationId),
  );

  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoadingPhase, setInitialLoadingPhase] = useState<
    'conversation' | 'messages' | 'ready'
  >(normalizedConversationId ? 'conversation' : 'ready');

  const initialMetadata = {
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
  const openedChatConversationRef = useRef<string | null>(null);
  const activeMessageIdentityRef = useRef<string | null>(null);

  const resolveActiveIdentityId = useCallback(async (
    token: AuthCredentials,
  ) => {
    if (normalizedRequestedIdentityId) {
      activeMessageIdentityRef.current = normalizedRequestedIdentityId;
      setActiveIdentityId(normalizedRequestedIdentityId);
      return normalizedRequestedIdentityId;
    }

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

    activeMessageIdentityRef.current = identity.id;
    setActiveIdentityId(identity.id);

    return identity.id;
  }, [normalizedRequestedIdentityId]);

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


  const applyConversation = useCallback((
    nextConversation: ChatConversation,
  ) => {
    setConversation((current) => (
      current
        ? mergeConversation(current, nextConversation)
        : nextConversation
    ));

    upsertChatConversation(nextConversation);
  }, []);

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
      applyConversation(response.conversation);

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
    applyConversation,
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

  const markLatestMessageAsRead = useCallback(async (
    token: AuthCredentials,
    identityId: string,
    messagesToMark: ChatMessage[],
    recipientUserId: string,
  ) => {
    if (!normalizedConversationId || !messagesToMark.length) {
      return;
    }

    const latestMessage = getLatestIncomingChatMessage(
      messagesToMark,
      identityId,
      recipientUserId,
    );

    if (!latestMessage) {
      return;
    }

    try {
      await markChatConversationRead(
        token,
        normalizedConversationId,
        {
          identity_id: identityId,
          last_read_message_id: latestMessage.id,
        },
      );
    } catch {
      // Marcar lectura no debe impedir ver ni enviar mensajes.
    }
  }, [
    normalizedConversationId,
  ]);

  const loadMessages = useCallback(async (
    options: {
      refresh?: boolean;
      beforeSequence?: number;
      network?: boolean;
    } = {},
  ) => {
    if (!normalizedConversationId) {
      return [];
    }

    const isLoadingHistory = (
      typeof options.beforeSequence === 'number'
    );

    const shouldUseNetwork = (
      options.network !== false
      || isLoadingHistory
    );

    /*
     * La hidratación local no invalida ni es invalidada por la red.
     * Solo las peticiones HTTP de mensajes compiten entre sí.
     */
    const requestId = shouldUseNetwork
      ? requestIdRef.current + 1
      : requestIdRef.current;

    if (shouldUseNetwork) {
      requestIdRef.current = requestId;
    }

    if (options.refresh && shouldUseNetwork) {
      setRefreshing(true);
    } else if (!isLoadingHistory) {
      /*
       * Solo mostramos loading si no existe ni caché en memoria ni
       * mensajes ya renderizados para esta conversación.
       */
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


      if (
        shouldUseNetwork
        && requestId !== requestIdRef.current
      ) {
        return [];
      }


      const response = await retryChatRequest(
        () => getChatMessages(
          token,
          normalizedConversationId,
          {
            limit: isLoadingHistory
              ? HISTORY_PAGE_LIMIT
              : DEFAULT_LIMIT,
            beforeSequence: options.beforeSequence,
          },
        ),
      );

      if (requestId !== requestIdRef.current) {
        return [];
      }

      /*
       * Siempre fusionamos contra el store actual. Entre la hidratación
       * y esta respuesta puede haber llegado una push o un mensaje local.
       */
      const currentMessages = getStoredMessages(
        normalizedConversationId,
      );

      const mergedMessages = mergeMessages(
        currentMessages,
        response.messages,
      );

      const previousMetadata = getChatMessagesCacheMetadata(
        normalizedConversationId,
      );
      const keepHistoryCursor = (
        !isLoadingHistory
        && currentMessages.length > DEFAULT_LIMIT
        && previousMetadata.nextBeforeSequence !== null
      );
      const pageLimit = isLoadingHistory
        ? HISTORY_PAGE_LIMIT
        : DEFAULT_LIMIT;
      const hasOlderMessages = (
        response.messages.length === pageLimit
        && response.next_before_sequence !== null
      );

      synchronizeMessages(
        mergedMessages,
        {
          nextBeforeSequence: keepHistoryCursor
            ? previousMetadata.nextBeforeSequence
            : response.next_before_sequence,
          hasMore: keepHistoryCursor
            ? previousMetadata.hasMore
            : hasOlderMessages,
          lastSyncedAt: new Date().toISOString(),
        },
      );

      setCurrentUserId(activeUserId);

      if (!isLoadingHistory) {
        const identityId = (
          activeMessageIdentityRef.current
          || await resolveActiveIdentityId(token)
        );

        void markLatestMessageAsRead(
          token,
          identityId,
          mergedMessages,
          activeUserId,
        );
      }

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
      if (
        !shouldUseNetwork
        || requestId === requestIdRef.current
      ) {
        setError(
          getErrorMessage(
            loadError,
            'No fue posible cargar los mensajes.',
          ),
        );
      }

      throw loadError;
    } finally {
      if (
        !shouldUseNetwork
        || requestId === requestIdRef.current
      ) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    conversationIsAi,
    markLatestMessageAsRead,
    normalizedConversationId,
    resolveActiveIdentityId,
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
          token,
        } = await getChatAuthContext();

        if (cancelled) {
          return;
        }

        void startChatRealtime().catch(() => {
          // Un fallo de Realtime no impide cargar el historial del chat.
        });

        await resolveActiveIdentityId(token);

        if (cancelled) {
          return;
        }

        resetChatConversationMessages(normalizedConversationId);
        openedChatConversationRef.current = normalizedConversationId;
        setRawMessages([]);
        setHasMore(false);
        setNextBeforeSequence(null);

        await Promise.all([
          loadConversation(),
          loadParticipants(),
        ]);

        if (cancelled) {
          return;
        }

        setInitialLoadingPhase('messages');

        /*
         * Cada entrada descarga la primera página sin reutilizar
         * mensajes de una apertura anterior.
         */
        await loadMessages({
          network: true,
        });
      } catch {
        // El hook conserva el error y permite reintentar.
      } finally {
        if (!cancelled) {
          setInitialLoadingPhase('ready');
        }
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
    loadConversation,
    loadMessages,
    loadParticipants,
    normalizedConversationId,
    resolveActiveIdentityId,
  ]);

  useEffect(() => {
    if (!normalizedConversationId) {
      return undefined;
    }

    return subscribeChatStore((change) => {
      if (
        change.type === 'reset'
        || (
          change.type === 'conversation-removed'
          && change.conversationId
          === normalizedConversationId
        )
      ) {
        setRawMessages([]);
        return;
      }

      if (
        change.type === 'messages'
        && change.conversationId === normalizedConversationId
      ) {
        const cacheMetadata = getChatMessagesCacheMetadata(
          normalizedConversationId,
        );

        setRawMessages([
          ...getStoredMessages(normalizedConversationId),
        ]);
        setHasMore(cacheMetadata.hasMore);
        setNextBeforeSequence(
          cacheMetadata.nextBeforeSequence,
        );
      }

      if (change.type === 'conversations') {
        const nextConversation = getStoredConversations().find(
          (item) => item.id === normalizedConversationId,
        );

        if (nextConversation) {
          setConversation((current) => (
            current
              ? mergeConversation(current, nextConversation)
              : nextConversation
          ));

          const completeParticipants = (
            nextConversation.participants || []
          ).filter((participant) => (
            Boolean(participant.joined_at)
            && !participant.id.startsWith('own:')
          ));

          if (completeParticipants.length) {
            setParticipants(completeParticipants);
          }
        }
      }
    });
  }, [
    normalizedConversationId,
  ]);

  useEffect(() => {
    setRawMessages([]);
    setHasMore(false);
    setNextBeforeSequence(null);
    setError(null);

    return () => {
      if (
        openedChatConversationRef.current
        === normalizedConversationId
      ) {
        resetChatConversationMessages(normalizedConversationId);
      }
      openedChatConversationRef.current = null;
    };
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
      attachmentFileId?: string | null;
    },
  ) => {
    if (!normalizedConversationId) {
      throw new Error(
        'No fue posible identificar el chat.',
      );
    }

    const body = payload.content.trim();

    const attachmentFileId = String(
      payload.attachmentFileId || '',
    ).trim() || null;

    const messageType = (
      payload.messageType === 'image'
      || payload.messageType === 'audio'
        ? payload.messageType
        : payload.messageType === 'file'
          ? 'document'
          : 'text'
    );

    if (!body && !attachmentFileId) {
      throw new Error(
        'Escribe un mensaje o adjunta un archivo antes de enviarlo.',
      );
    }

    if (
      conversation?.conversation_type === 'group'
      && conversation.permissions
      && !conversation.permissions.can_send_messages
    ) {
      throw new Error(
        'No tienes permiso para enviar mensajes en este grupo.',
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
        activeIdentityId
        || await resolveActiveIdentityId(token)
      );

      const response = await sendChatMessage(
        token,
        normalizedConversationId,
        {
          sender_identity_id: senderIdentityId,
          body,
          message_type: messageType,
          attachment_file_id: attachmentFileId,
          reference_type: payload.replyToId
            ? 'chat_message'
            : null,
          reference_id: payload.replyToId?.trim() || null,
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
    normalizedConversationId,
    activeIdentityId,
    resolveActiveIdentityId,
  ]);

  const sendAttachmentMessage = useCallback(async (
    payload: {
      attachment: UploadableChatAttachment;
      content?: string;
      replyToId?: string | null;
    },
  ) => {
    if (!normalizedConversationId) {
      throw new Error(
        'No fue posible identificar el chat.',
      );
    }

    if (
      conversation?.conversation_type === 'group'
      && conversation.permissions
      && !conversation.permissions.can_send_messages
    ) {
      throw new Error(
        'No tienes permiso para enviar mensajes en este grupo.',
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
        activeIdentityId
        || await resolveActiveIdentityId(token)
      );

      const uploadedMessage = await uploadChatAttachmentMessage(
        token,
        normalizedConversationId,
        senderIdentityId,
        payload.attachment,
        {
          body: payload.content?.trim() || null,
        },
      );

      setCurrentUserId(activeUserId);

      upsertChatMessage(
        normalizedConversationId,
        uploadedMessage,
      );

      updateChatConversationLastMessage(
        normalizedConversationId,
        uploadedMessage,
      );

      setRawMessages(
        getStoredMessages(normalizedConversationId),
      );

      return mapChatMessageToModel(
        uploadedMessage,
        activeUserId,
        {
          conversationIsAi,
        },
      );
    } catch (attachmentError) {
      const message = getErrorMessage(
        attachmentError,
        'No fue posible enviar el adjunto.',
      );

      setError(message);

      throw new Error(message);
    } finally {
      setSending(false);
    }
  }, [
    conversation,
    conversationIsAi,
    normalizedConversationId,
    activeIdentityId,
    resolveActiveIdentityId,
  ]);

  const addParticipants = useCallback(async (
    identityIds: string[],
  ) => {
    if (!normalizedConversationId) {
      throw new Error(
        'No fue posible identificar el grupo.',
      );
    }

    if (conversation?.conversation_type !== 'group') {
      throw new Error(
        'Solo puedes invitar participantes a un grupo.',
      );
    }

    if (!conversation.permissions?.can_invite_members) {
      throw new Error(
        'No tienes permiso para invitar participantes a este grupo.',
      );
    }

    const normalizedIdentityIds = Array.from(
      new Set(
        identityIds
          .map((identityId) => identityId.trim())
          .filter(Boolean),
      ),
    );

    if (!normalizedIdentityIds.length) {
      return participants;
    }

    const { token } = await getChatAuthContext();

    const actorIdentityId = (
      activeIdentityId
      || await resolveActiveIdentityId(token)
    );

    const results = await Promise.allSettled(
      normalizedIdentityIds.map((identityId) => (
        inviteToChatGroup(
          token,
          normalizedConversationId,
          {
            actor_identity_id: actorIdentityId,
            invited_identity_id: identityId,
          },
        )
      )),
    );

    const rejected = results.find(
      (result) => result.status === 'rejected',
    );

    if (rejected?.status === 'rejected') {
      throw new Error(
        getErrorMessage(
          rejected.reason,
          'No fue posible enviar una o más invitaciones.',
        ),
      );
    }

    const refreshedConversation = await loadConversation();
    const refreshedParticipants = await loadParticipants();

    if (refreshedConversation) {
      applyConversation(refreshedConversation);
    }

    return refreshedParticipants;
  }, [
    applyConversation,
    conversation?.conversation_type,
    conversation?.permissions?.can_invite_members,
    loadConversation,
    loadParticipants,
    normalizedConversationId,
    participants,
    activeIdentityId,
    resolveActiveIdentityId,
  ]);

  const removeParticipant = useCallback(async (
    identityId: string,
  ) => {
    if (!normalizedConversationId) {
      throw new Error(
        'No fue posible identificar el grupo.',
      );
    }

    if (conversation?.conversation_type !== 'group') {
      throw new Error(
        'Solo puedes quitar participantes de un grupo.',
      );
    }

    if (!conversation.permissions?.can_remove_members) {
      throw new Error(
        'No tienes permiso para quitar participantes de este grupo.',
      );
    }

    const normalizedIdentityId = identityId.trim();

    if (!normalizedIdentityId) {
      throw new Error(
        'No fue posible identificar el participante.',
      );
    }

    const { token } = await getChatAuthContext();

    const actorIdentityId = (
      activeIdentityId
      || await resolveActiveIdentityId(token)
    );

    await removeChatGroupParticipant(
      token,
      normalizedConversationId,
      normalizedIdentityId,
      {
        actor_identity_id: actorIdentityId,
      },
    );

    const refreshedConversation = await loadConversation();
    await loadParticipants();

    if (refreshedConversation) {
      applyConversation(refreshedConversation);
    }
  }, [
    applyConversation,
    conversation?.conversation_type,
    conversation?.permissions?.can_remove_members,
    loadConversation,
    loadParticipants,
    normalizedConversationId,
    activeIdentityId,
    resolveActiveIdentityId,
  ]);

  const leaveGroup = useCallback(async () => {
    if (!normalizedConversationId) {
      throw new Error(
        'No fue posible identificar el grupo.',
      );
    }

    if (conversation?.conversation_type !== 'group') {
      throw new Error(
        'Esta conversación no es un grupo.',
      );
    }

    if (!conversation.permissions?.can_leave_group) {
      throw new Error(
        'No puedes salir de este grupo. '
        + 'El owner debe transferir la propiedad o desactivar el grupo.',
      );
    }

    const { token } = await getChatAuthContext();

    const identityId = (
      activeIdentityId
      || await resolveActiveIdentityId(token)
    );

    await leaveChatGroup(
      token,
      normalizedConversationId,
      {
        identity_id: identityId,
      },
    );

    removeChatConversation(normalizedConversationId);
  }, [
    conversation?.conversation_type,
    conversation?.permissions?.can_leave_group,
    normalizedConversationId,
    activeIdentityId,
    resolveActiveIdentityId,
  ]);

  const unsupportedMessageAction = useCallback(
    async () => {
      throw new Error(
        'Esta acción todavía no está conectada al API actual de Chat.',
      );
    },
    [],
  );

  const [remoteCursorSequences, setRemoteCursorSequences] =
    useState<Record<string, number>>({});
  const attemptedCursorIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    attemptedCursorIdsRef.current.clear();
    setRemoteCursorSequences({});
  }, [normalizedConversationId]);

  useEffect(() => {
    const loadedIds = new Set(
      rawMessages.map((message) => message.id),
    );
    const cursorIds = new Set<string>();
    participants.forEach((participant) => {
      if (participant.last_read_message_id) {
        cursorIds.add(participant.last_read_message_id);
      }
      if (participant.last_delivered_message_id) {
        cursorIds.add(participant.last_delivered_message_id);
      }
    });
    const missingIds = [...cursorIds].filter((id) => (
      !loadedIds.has(id)
      && remoteCursorSequences[id] === undefined
      && !attemptedCursorIdsRef.current.has(id)
    ));

    if (!missingIds.length) {
      return;
    }

    missingIds.forEach((id) => {
      attemptedCursorIdsRef.current.add(id);
    });
    let cancelled = false;
    void (async () => {
      try {
        const { token } = await getChatAuthContext();
        const resolved = await Promise.all(
          missingIds.map(async (id) => {
            try {
              const { message } = await getChatMessage(token, id);
              return [id, message.sequence_number] as const;
            } catch {
              return null;
            }
          }),
        );
        if (!cancelled) {
          setRemoteCursorSequences((current) => {
            const next = { ...current };
            resolved.forEach((entry) => {
              if (entry && typeof entry[1] === 'number') {
                next[entry[0]] = entry[1];
              }
            });
            return next;
          });
        }
      } catch {
        // No se infiere un acuse sin secuencia comprobada.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [participants, rawMessages, remoteCursorSequences]);

  const messages = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    const cursorSequences: Record<string, number> = {
      ...remoteCursorSequences,
    };
    rawMessages.forEach((message) => {
      if (typeof message.sequence_number === 'number') {
        cursorSequences[message.id] = message.sequence_number;
      }
    });

    return rawMessages.map((message) => {
      const model = mapChatMessageToModel(
        message,
        currentUserId,
        { conversationIsAi },
      );

      if (!model.isUser || conversationIsAi) {
        return model;
      }

      return {
        ...model,
        status: getChatMessageReceiptStatus(
          message,
          participants,
          message.sender_identity_id || activeIdentityId || '',
          cursorSequences,
        ),
      };
    });
  }, [
    activeIdentityId,
    conversationIsAi,
    currentUserId,
    participants,
    rawMessages,
    remoteCursorSequences,
  ]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    participants,
    conversation,
    currentUserId,
    activeIdentityId,
    postingIdentityId,
    loading,
    refreshing,
    sending,
    loadingMore,
    hasMore,
    initialLoadingPhase,
    error,
    loadMessages,
    loadMore,
    loadConversation,
    loadParticipants,
    sendMessage,
    sendAttachmentMessage,
    editMessage: (
      unsupportedMessageAction as UseChatMessagesResult[
        'editMessage'
      ]
    ),
    togglePinnedMessage: (
      unsupportedMessageAction as UseChatMessagesResult[
        'togglePinnedMessage'
      ]
    ),
    addParticipants,
    removeParticipant,
    leaveGroup,
    clearError,
  };
}
