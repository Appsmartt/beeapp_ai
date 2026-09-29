import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { retryBackgroundLoad } from '../utils/retryBackgroundLoad';
import {
  bootstrapChat,
  clearChatConversation,
  createChatGroup,
  createDirectChatConversation,
  deactivateChatGroup,
  getChatConversation,
  getChatIdentities,
  getChatInbox,
  getChatUnpinnedInboxByType,
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
  updateChatConversationPinned,
  updateChatConversationNotifications,
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
import {
  startChatRealtime,
  subscribeChatRealtimeStatus,
} from '../services/chatRealtime';
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
  cacheChatConversationAvatars,
  removeSupersededChatAvatar,
} from '../services/chatAvatarCache';
import {
  readCachedPrivateChatIdentityId,
  saveCachedPrivateChatIdentityId,
} from '../services/chatInboxCache';
import {
  getChatMessageReceiptStatus,
} from '../services/chatReceiptStatus';
import {
  uploadChatAttachmentMessage,
  type UploadableChatAttachment,
} from '../services/chatAttachmentService';
import {
  getActiveChatStoreIdentityId,
  getChatConversations as getStoredConversations,
  hydrateChatConversations,
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
    const leftDate = Date.parse(
      left.last_message_at || left.updated_at || left.created_at,
    ) || 0;
    const rightDate = Date.parse(
      right.last_message_at || right.updated_at || right.created_at,
    ) || 0;

    return rightDate - leftDate || right.id.localeCompare(left.id);
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
    image_file_id: newest.image_file_id || oldest.image_file_id || null,
    avatar_url: newest.avatar_url || oldest.avatar_url || null,
    cached_avatar_url: (
      newest.cached_avatar_url || oldest.cached_avatar_url || null
    ),
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
    reaction_preview: (() => {
      const previews = [current.reaction_preview, incoming.reaction_preview]
        .filter((item): item is NonNullable<ChatConversation['reaction_preview']> => Boolean(item));
      const preview = previews.sort((a, b) => b.event_sequence - a.event_sequence)[0];
      const messageAt = Date.parse(
        newest.last_message_at || newest.last_message?.created_at || '',
      );
      return preview && (!Number.isFinite(messageAt)
        || Date.parse(preview.created_at) > messageAt) ? preview : null;
    })(),
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
  paginateInbox?: boolean;
  retryInboxLoads?: boolean;
}

export interface UseChatConversationsResult {
  conversations: ChatListItemModel[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  activeIdentityId: string | null;
  loadingMore: boolean;
  hasMoreConversations: Record<'direct' | 'group', boolean>;
  loadMoreConversations: (
    conversationType: 'direct' | 'group',
  ) => Promise<void>;
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
    paginateInbox = false,
    retryInboxLoads = false,
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
  const inboxPagesRef = useRef<{
    direct: {
      sortAt: string | null;
      id: string | null;
      hasMore: boolean;
    };
    group: {
      sortAt: string | null;
      id: string | null;
      hasMore: boolean;
    };
  }>({
    direct: { sortAt: null, id: null, hasMore: false },
    group: { sortAt: null, id: null, hasMore: false },
  });
  const paginationIdentityRef = useRef<string | null>(null);
  const inboxStartedAtRef = useRef<number>(0);
  const loadingMoreRef = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreConversations, setHasMoreConversations] = useState({
    direct: false,
    group: false,
  });
  const [visibleConversationIds, setVisibleConversationIds] = useState<
    Set<string> | null
  >(null);

  useEffect(() => {
    if (!paginateInbox) return;
    requestIdRef.current += 1;
    inboxPagesRef.current = {
      direct: { sortAt: null, id: null, hasMore: false },
      group: { sortAt: null, id: null, hasMore: false },
    };
    paginationIdentityRef.current = null;
    setHasMoreConversations({ direct: false, group: false });
    setVisibleConversationIds(new Set());
  }, [normalizedRequestedIdentityId, paginateInbox]);

  const synchronizeConversations = useCallback((
    nextConversations: ChatConversation[],
  ) => {
    const existingById = new Map(
      getStoredConversations().map((item) => [item.id, item]),
    );
    const reconciledById = new Map<string, ChatConversation>();
    for (const incoming of nextConversations) {
      const current = (
        reconciledById.get(incoming.id)
        || existingById.get(incoming.id)
      );
      if (!current) {
        reconciledById.set(incoming.id, incoming);
        continue;
      }

      const combined = mergeConversation(current, incoming);
      const isInboxRow = Boolean(
        incoming.own_participant?.id.startsWith('own:'),
      );
      const photoRemoved = (
        isInboxRow && incoming.image_file_id === null
      );
      const hasFullParticipants = (
        current.participants?.some((participant) => (
          !participant.id.startsWith('own:')
          && Boolean(participant.joined_at)
        )) ?? false
      );
      reconciledById.set(incoming.id, {
        ...combined,
        name: incoming.name,
        image_file_id: isInboxRow
          ? incoming.image_file_id
          : current.image_file_id || incoming.image_file_id,
        avatar_url: photoRemoved
          ? null
          : incoming.avatar_url || current.avatar_url || null,
        cached_avatar_url: photoRemoved
          ? null
          : current.cached_avatar_url || combined.cached_avatar_url || null,
        other_display_name: incoming.other_display_name,
        direct_profile: photoRemoved
          ? (
              (incoming.direct_profile || combined.direct_profile)
                ? {
                    ...(incoming.direct_profile || combined.direct_profile)!,
                    avatar_url: null,
                  }
                : null
            )
          : incoming.direct_profile || combined.direct_profile,
        participants: photoRemoved
          ? (hasFullParticipants
              ? current.participants
              : combined.participants
            )?.map((participant) => (
              participant.identity_id === incoming.other_identity_id
                && participant.user
                ? {
                    ...participant,
                    user: { ...participant.user, avatar_url: null },
                  }
                : participant
            ))
          : hasFullParticipants
            ? current.participants
            : combined.participants,
        own_participant: (
          incoming.own_participant?.id.startsWith('own:')
          && current.own_participant
          && !current.own_participant.id.startsWith('own:')
            ? current.own_participant
            : combined.own_participant
        ),
      });
    }
    const sorted = sortConversations([...reconciledById.values()]);

    setChatConversations(sorted);
    setRawConversations(getStoredConversations());
  }, []);

  const resolveActiveIdentityId = useCallback(async (
    token: AuthCredentials,
    userId?: string,
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
    if (userId) {
      await saveCachedPrivateChatIdentityId(userId, identity.id);
    }

    return identity.id;
  }, [normalizedRequestedIdentityId]);

  const applyPinnedInboxPreferences = useCallback((
    incoming: ChatConversation[],
  ) => {
    const preferences = new Map(
      incoming.map((item) => [
        item.id,
        {
          isPinned: Boolean(item.is_pinned),
          isMuted: Boolean(item.is_muted),
          notificationsEnabled: (
            item.own_participant?.notifications_enabled
            ?? !item.is_muted
          ),
        },
      ]),
    );
    if (!preferences.size) return;
    setChatConversations(getStoredConversations().map(
      (item) => {
        const preference = preferences.get(item.id);
        if (!preference) return item;
        return {
          ...item,
          is_pinned: preference.isPinned,
          is_muted: preference.isMuted,
          own_participant: item.own_participant
            ? {
                ...item.own_participant,
                notifications_enabled: preference.notificationsEnabled,
              }
            : item.own_participant,
        };
      },
    ));
    setRawConversations([...getStoredConversations()]);
  }, []);

  const loadConversationsOnce = useCallback(async (
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
      if (paginateInbox) inboxStartedAtRef.current = Date.now();
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

      if (
        paginateInbox
        && requestedNetwork
        && !normalizedRequestedIdentityId
        && !activeIdentityId
      ) {
        const cachedIdentityId = await readCachedPrivateChatIdentityId(
          activeUserId,
        );
        if (requestId !== requestIdRef.current) return [];
        if (cachedIdentityId) {
          await hydrateChatConversations(activeUserId, cachedIdentityId);
          if (requestId !== requestIdRef.current) return [];
          setCurrentUserId(activeUserId);
          setActiveIdentityId(cachedIdentityId);
          setVisibleConversationIds(new Set(
            getStoredConversations().map((row) => row.id),
          ));
        }
      }

      const identityId = (
        normalizedRequestedIdentityId
        && normalizedRequestedIdentityId !== activeIdentityId
          ? await resolveActiveIdentityId(token, activeUserId)
          : (
              activeIdentityId
              || await resolveActiveIdentityId(token, activeUserId)
            )
      );


      if (
        requestedNetwork
        && requestId !== requestIdRef.current
      ) {
        return [];
      }

      let cachedIds: string[] = [];
      if (paginateInbox && requestedNetwork) {
        await hydrateChatConversations(
          activeUserId,
          identityId,
        );
        if (requestId !== requestIdRef.current) return [];

        cachedIds = getStoredConversations()
          .filter((conversation) => (
            conversation.own_participant?.identity_id === identityId
            && (
              conversation.conversation_type === 'direct'
              || conversation.conversation_type === 'group'
            )
          ))
          .map((conversation) => conversation.id);

        if (cachedIds.length) {
          setVisibleConversationIds(new Set(cachedIds));
        }
      }

      setCurrentUserId(activeUserId);

      let loadedConversations: ChatConversation[];
      const beforeInbox = new Map(getStoredConversations()
        .map((row) => [row.id, row]));
      if (paginateInbox) {
        const loadInitialTypedPage = async (
          type: 'direct' | 'group',
        ) => {
          const first = await getChatUnpinnedInboxByType(
            token, identityId, type, { limit: 10 },
          );
          if (
            !first.has_more
            || !first.next_before_sort_at
            || !first.next_before_id
          ) return first;

          const second = await getChatUnpinnedInboxByType(
            token, identityId, type, {
              limit: 10,
              beforeSortAt: first.next_before_sort_at,
              beforeId: first.next_before_id,
            },
          );
          return {
            ...second,
            conversations: [
              ...first.conversations,
              ...second.conversations,
            ],
          };
        };
        const [directPage, groupPage, pinnedPage] = await Promise.all([
          loadInitialTypedPage('direct'),
          loadInitialTypedPage('group'),
          getChatInbox(token, identityId, { limit: 10 }),
        ]);
        if (requestId !== requestIdRef.current) return [];
        const pinned = pinnedPage.pinned_conversations;
        const pinnedIds = new Set(pinned.map((row) => row.id));
        const unpinned = [
          ...directPage.conversations,
          ...groupPage.conversations,
        ].filter((row) => !pinnedIds.has(row.id));

        inboxPagesRef.current = {
          direct: {
            sortAt: directPage.next_before_sort_at,
            id: directPage.next_before_id,
            hasMore: directPage.has_more,
          },
          group: {
            sortAt: groupPage.next_before_sort_at,
            id: groupPage.next_before_id,
            hasMore: groupPage.has_more,
          },
        };
        paginationIdentityRef.current = identityId;
        loadedConversations = [...pinned, ...unpinned];
        setVisibleConversationIds(new Set([
          ...cachedIds,
          ...loadedConversations.map((row) => row.id),
        ]));
        setHasMoreConversations({
          direct: directPage.has_more,
          group: groupPage.has_more,
        });
      } else {
        const response = await getChatInbox(
          token,
          identityId,
          { limit: 100 },
        );
        if (requestId !== requestIdRef.current) return [];
        loadedConversations = response.conversations;
      }

      setCurrentUserId(activeUserId);
      const currentById = new Map(getStoredConversations()
        .map((row) => [row.id, row]));
      loadedConversations = loadedConversations.map((row) => {
        const current = currentById.get(row.id);
        const previous = beforeInbox.get(row.id);
        if (!current || !previous) return row;
        const readChanged = (
          current.unread_count !== previous.unread_count
          || current.own_participant?.last_read_message_id
            !== previous.own_participant?.last_read_message_id
        );
        const messageChanged = (
          current.last_message?.id !== previous.last_message?.id
          || current.last_message?.status !== previous.last_message?.status
          || current.last_message?.content !== previous.last_message?.content
        );
        if (!readChanged && !messageChanged) return row;
        return {
          ...row,
          unread_count: readChanged ? current.unread_count : row.unread_count,
          own_participant: readChanged
            ? current.own_participant : row.own_participant,
          last_message: messageChanged
            && current.last_message?.id === row.last_message?.id
              ? current.last_message : row.last_message,
        };
      });
      const serverPinnedIds = paginateInbox
        ? new Set(loadedConversations
            .filter((row) => row.is_pinned)
            .map((row) => row.id))
        : null;
      const previousAvatarUris = new Map(getStoredConversations()
        .map((row) => [row.id, row.cached_avatar_url]));
      synchronizeConversations([
        ...getStoredConversations().filter((row) => (
          !serverPinnedIds
          || row.own_participant?.identity_id !== identityId
          || !row.is_pinned
          || serverPinnedIds.has(row.id)
        )),
        ...loadedConversations,
      ]);
      if (paginateInbox) {
        applyPinnedInboxPreferences(loadedConversations);
        const removedPhotoUris = loadedConversations
          .filter((row) => row.image_file_id === null)
          .map((row) => previousAvatarUris.get(row.id))
          .filter((uri): uri is string => Boolean(uri));
        if (removedPhotoUris.length) {
          setTimeout(() => {
            void Promise.allSettled(removedPhotoUris.map((uri) => (
              removeSupersededChatAvatar(
                activeUserId,
                uri,
                getStoredConversations().some((row) => (
                  row.cached_avatar_url === uri
                )) ? uri : null,
              )
            )));
          }, 1000);
        }

        void cacheChatConversationAvatars(
          activeUserId,
          loadedConversations,
        ).then((cached) => {
          if (
            requestId !== requestIdRef.current
            || getActiveChatStoreIdentityId() !== identityId
          ) return;

          const avatars = new Map(cached
            .filter((row) => row.cached_avatar_url)
            .map((row) => [row.id, row]));
          let changed = false;
          const supersededUris: string[] = [];
          const updated = getStoredConversations().map((row) => {
            const avatar = avatars.get(row.id);
            if (
              !avatar
              || row.own_participant?.identity_id !== identityId
              || row.image_file_id !== avatar.image_file_id
              || row.cached_avatar_url === avatar.cached_avatar_url
            ) return row;
            changed = true;
            if (row.cached_avatar_url) {
              supersededUris.push(row.cached_avatar_url);
            }
            return { ...row, cached_avatar_url: avatar.cached_avatar_url };
          });
          if (changed) {
            setChatConversations(updated);
            setTimeout(() => {
              void Promise.allSettled(supersededUris.map((uri) => (
                removeSupersededChatAvatar(
                  activeUserId,
                  uri,
                  getStoredConversations().some((row) => (
                    row.cached_avatar_url === uri
                  )) ? uri : null,
                )
              )));
            }, 1000);
          }
        }).catch(() => {
          // Avatar caching must not block inbox loading.
        });
      }

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
        if (!retryInboxLoads || !requestedNetwork) {
          setError(
            getErrorMessage(
              loadError,
              'No fue posible cargar tus chats.',
            ),
          );
        }
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
    applyPinnedInboxPreferences,
    normalizedRequestedIdentityId,
    paginateInbox,
    resolveActiveIdentityId,
    synchronizeConversations,
    retryInboxLoads,
  ]);

  const loadMoreConversations = useCallback(async (
    conversationType: 'direct' | 'group',
  ) => {
    const pageState = inboxPagesRef.current[conversationType];
    if (
      !paginateInbox
      || loadingMoreRef.current
      || !pageState.hasMore
      || !pageState.sortAt
      || !pageState.id
      || !paginationIdentityRef.current
    ) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const requestId = requestIdRef.current;
    const identityId = paginationIdentityRef.current;

    try {
      const fetchPage = async () => {
        const { token } = await getChatAuthContext();
        if (requestId !== requestIdRef.current) {
          throw new Error('Chat inbox request superseded.');
        }
        return getChatUnpinnedInboxByType(
          token,
          identityId,
          conversationType,
          {
            limit: 5,
            beforeSortAt: pageState.sortAt,
            beforeId: pageState.id,
          },
        );
      };
      const page = retryInboxLoads
        ? await retryBackgroundLoad(
            fetchPage,
            () => requestId === requestIdRef.current,
          )
        : await fetchPage();
      if (requestId !== requestIdRef.current) return;

      inboxPagesRef.current[conversationType] = {
        sortAt: page.next_before_sort_at,
        id: page.next_before_id,
        hasMore: page.has_more,
      };
      setHasMoreConversations((current) => ({
        ...current,
        [conversationType]: page.has_more,
      }));
      setVisibleConversationIds((current) => new Set([
        ...(current || []),
        ...page.conversations.map((row) => row.id),
      ]));
      if (page.conversations.length) {
        synchronizeConversations([
          ...getStoredConversations(),
          ...page.conversations,
        ]);
        applyPinnedInboxPreferences(page.conversations);
      }
    } catch (failure) {
      if (requestId === requestIdRef.current) {
        setError(getErrorMessage(
          failure,
          'No fue posible cargar más chats.',
        ));
      }
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [
    applyPinnedInboxPreferences,
    paginateInbox,
    synchronizeConversations,
    retryInboxLoads,
  ]);

  const loadConversations = useCallback(async (
    options: {
      refresh?: boolean;
      archived?: boolean;
      network?: boolean;
    } = {},
  ): Promise<ChatListItemModel[]> => {
    if (!retryInboxLoads || options.network === false) {
      return loadConversationsOnce(options);
    }

    let attemptRequestId = requestIdRef.current;
    try {
      return await retryBackgroundLoad(async () => {
        const pending = loadConversationsOnce(options);
        attemptRequestId = requestIdRef.current;
        const rows = await pending;
        if (attemptRequestId !== requestIdRef.current) {
          throw new Error('Chat inbox request superseded.');
        }
        return rows;
      }, () => attemptRequestId === requestIdRef.current);
    } catch (failure) {
      if (attemptRequestId === requestIdRef.current) {
        setError(getErrorMessage(
          failure,
          'No fue posible cargar tus chats.',
        ));
      }
      throw failure;
    }
  }, [loadConversationsOnce, retryInboxLoads]);

  const autoLoadConversationsRef = useRef(loadConversations);
  autoLoadConversationsRef.current = loadConversations;

  useEffect(() => {
    if (!autoLoad) return;

    void autoLoadConversationsRef.current({
      network: true,
    }).catch(() => {
      // The hook keeps the error available for the inbox.
    });
  }, [
    autoLoad,
    normalizedRequestedIdentityId,
    paginateInbox,
  ]);

  useEffect(() => {
    if (!autoLoad || !paginateInbox || !activeIdentityId) return;

    let cancelled = false;
    let inFlight = false;
    let recoveryTimer: ReturnType<typeof setInterval> | null = null;

    const recoverDegradedChatList = async () => {
      if (cancelled || inFlight || AppState.currentState !== 'active') return;
      inFlight = true;
      try {
        await startChatRealtime();
        if (!cancelled) {
          await loadConversations({ network: true });
        }
      } catch {
        // Retry connection and inbox recovery on the next bounded attempt.
      } finally {
        inFlight = false;
      }
    };

    const unsubscribe = subscribeChatRealtimeStatus((status) => {
      if (recoveryTimer) {
        clearInterval(recoveryTimer);
        recoveryTimer = null;
      }
      if (status === 'degraded' && !cancelled) {
        void recoverDegradedChatList();
        recoveryTimer = setInterval(() => {
          void recoverDegradedChatList();
        }, 15000);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      if (recoveryTimer) clearInterval(recoveryTimer);
    };
  }, [activeIdentityId, autoLoad, loadConversations, paginateInbox]);

  useEffect(() => {
    return subscribeChatStore((change) => {
      if (
        change.type === 'conversations'
        || change.type === 'conversation-removed'
        || change.type === 'reset'
      ) {
        const stored = [...getStoredConversations()];
        setRawConversations(stored);
        if (paginateInbox && paginationIdentityRef.current) {
          const freshIds = stored.filter((conversation) => (
            conversation.own_participant?.identity_id
              === paginationIdentityRef.current
            && Date.parse(
              conversation.last_message_at || '',
            ) >= inboxStartedAtRef.current
          )).map((conversation) => conversation.id);
          if (freshIds.length) {
            setVisibleConversationIds((current) => (
              current === null
                ? current
                : new Set([...current, ...freshIds])
            ));
          }
        }
      }
    });
  }, [paginateInbox]);

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
    if (paginateInbox) {
      setVisibleConversationIds((current) => new Set([
        ...(current || []),
        response.conversation.id,
      ]));
    }
    upsertChatConversation(response.conversation);

    synchronizeConversations(getStoredConversations());

    return mapConversationToListItem(
      response.conversation,
      activeUserId,
      isChatConversationProtected(response.conversation.id),
    );
  }, [
    activeIdentityId,
    paginateInbox,
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
    if (paginateInbox) {
      setVisibleConversationIds((current) => new Set([
        ...(current || []),
        created.conversation.id,
      ]));
    }
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
    paginateInbox,
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

    if (payload.isMuted !== undefined) {
      const {
        currentUserId: activeUserId,
        token,
      } = await getChatAuthContext();
      const identityId = (
        normalizedRequestedIdentityId
        && normalizedRequestedIdentityId !== activeIdentityId
          ? await resolveActiveIdentityId(token)
          : (
              activeIdentityId
              || await resolveActiveIdentityId(token)
            )
      );
      const response = await updateChatConversationNotifications(
        token,
        normalizedConversationId,
        {
          identity_id: identityId,
          notifications_enabled: !payload.isMuted,
        },
      );
      const current = getStoredConversations().find(
        (item) => item.id === normalizedConversationId,
      );
      const updated: ChatConversation = {
        ...(current || response.conversation),
        is_muted: payload.isMuted,
        own_participant: response.conversation.own_participant,
        participants: current?.participants?.map((participant) => (
          participant.identity_id === identityId
            ? {
                ...participant,
                notifications_enabled: !payload.isMuted,
              }
            : participant
        )) || response.conversation.participants,
      };
      setCurrentUserId(activeUserId);
      setChatConversations([
        ...getStoredConversations().filter(
          (item) => item.id !== normalizedConversationId,
        ),
        updated,
      ]);
      setRawConversations([...getStoredConversations()]);
      return mapConversationToListItem(
        updated,
        activeUserId,
        isChatConversationProtected(normalizedConversationId),
      );
    }

    if (payload.isPinned !== undefined) {
      const {
        currentUserId: activeUserId,
        token,
      } = await getChatAuthContext();
      const identityId = (
        normalizedRequestedIdentityId
        && normalizedRequestedIdentityId !== activeIdentityId
          ? await resolveActiveIdentityId(token)
          : (
              activeIdentityId
              || await resolveActiveIdentityId(token)
            )
      );
      const response = await updateChatConversationPinned(
        token,
        normalizedConversationId,
        {
          identity_id: identityId,
          is_pinned: payload.isPinned,
        },
      );
      const current = getStoredConversations().find(
        (item) => item.id === normalizedConversationId,
      );
      const updated = {
        ...(current || response.conversation),
        is_pinned: payload.isPinned,
        own_participant: response.conversation.own_participant,
      };
      setCurrentUserId(activeUserId);
      const stored = getStoredConversations();
      setChatConversations([
        ...stored.filter(
          (item) => item.id !== normalizedConversationId,
        ),
        updated,
      ]);
      setRawConversations([...getStoredConversations()]);
      return mapConversationToListItem(
        updated,
        activeUserId,
        isChatConversationProtected(normalizedConversationId),
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
    normalizedRequestedIdentityId,
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

    const storedConversation = getStoredConversations().find(
      (item) => item.id === normalizedConversationId,
    );
    const detail = storedConversation?.conversation_type === 'direct'
      ? null
      : await getChatConversation(
          token,
          normalizedConversationId,
        );

    if (detail?.conversation.conversation_type === 'group') {
      const group = detail.conversation;
      const membership = group.own_participant;

      if (
        !membership
        || membership.identity_id !== identityId
        || !group.permissions?.is_active_participant
      ) {
        throw new Error(
          'No tienes una participación activa en este grupo.',
        );
      }

      const result = await getChatParticipants(
        token,
        normalizedConversationId,
      );
      const activeParticipants = result.participants.filter(
        (participant) => (
          !participant.left_at && !participant.removed_at
        ),
      );
      const otherParticipants = activeParticipants.filter(
        (participant) => participant.identity_id !== identityId,
      );

      if (membership.role === 'owner') {
        if (!group.permissions.can_deactivate_group) {
          throw new Error(
            'No tienes permiso para eliminar este grupo.',
          );
        }
        if (otherParticipants.length > 0) {
          throw new Error(
            'Primero cambia el owner por otro integrante del grupo.',
          );
        }
        await deactivateChatGroup(
          token,
          normalizedConversationId,
          { owner_identity_id: identityId },
        );
      } else {
        if (!group.permissions.can_leave_group) {
          throw new Error(
            'No tienes permiso para salir de este grupo.',
          );
        }
        await leaveChatGroup(
          token,
          normalizedConversationId,
          { identity_id: identityId },
        );
      }
    } else {
      await clearChatConversation(
        token,
        normalizedConversationId,
        { identity_id: identityId },
      );
    }

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

    const conversation = getStoredConversations().find(
      (item) => item.id === normalizedConversationId,
    );

    if (!conversation) {
      throw new Error(
        'No fue posible encontrar el chat para archivarlo.',
      );
    }

    if (conversation.own_participant?.notifications_enabled !== false) {
      await updateConversation(normalizedConversationId, {
        isMuted: true,
      });
    }

    setChatConversationArchived(
      normalizedConversationId,
      true,
    );

    setRawConversations([
      ...getStoredConversations(),
    ]);
  }, [updateConversation]);

  const restoreConversation = useCallback(async (
    conversationId: string,
  ) => {
    const normalizedConversationId = conversationId.trim();

    if (!normalizedConversationId) {
      throw new Error(
        'No fue posible identificar el chat.',
      );
    }

    const conversation = getStoredConversations().find(
      (item) => item.id === normalizedConversationId,
    );

    if (!conversation) {
      throw new Error(
        'No fue posible encontrar el chat para restaurarlo.',
      );
    }

    if (conversation.own_participant?.notifications_enabled !== true) {
      await updateConversation(normalizedConversationId, {
        isMuted: false,
      });
    }

    setChatConversationArchived(
      normalizedConversationId,
      false,
    );

    setRawConversations([
      ...getStoredConversations(),
    ]);
  }, [updateConversation]);

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

    return rawConversations
      .filter((conversation) => (
        !paginateInbox
        || conversation.conversation_type === 'ai'
        || (
          activeIdentityId !== null
          && conversation.own_participant?.identity_id
            === activeIdentityId
          && (
            visibleConversationIds === null
            || visibleConversationIds.has(conversation.id)
            || conversation.is_pinned
            || isChatConversationArchived(conversation.id)
          )
        )
      ))
      .map((conversation) => (
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
    activeIdentityId,
    currentUserId,
    paginateInbox,
    rawConversations,
    visibleConversationIds,
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
    loadingMore,
    hasMoreConversations,
    loadMoreConversations,
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
  loadReferencedMessage: (messageId: string) => Promise<boolean>;
  loadConversation: () => Promise<ChatConversation | null>;
  loadParticipants: () => Promise<ChatParticipant[]>;
  sendMessage: (
    payload: {
      content: string;
      messageType?: ChatMessageType;
      replyToId?: string | null;
      attachmentFileId?: string | null;
      metadata?: Record<string, unknown>;
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
    if (
      !autoLoad
      || !normalizedConversationId
      || initialLoadingPhase !== 'ready'
    ) return;

    let cancelled = false;
    let inFlight = false;
    let recoveryTimer: ReturnType<typeof setInterval> | null = null;

    const recoverOpenConversation = async () => {
      if (cancelled || inFlight || AppState.currentState !== 'active') return;
      inFlight = true;
      try {
        await Promise.all([
          loadMessages({ network: true }),
          ...(
            conversation?.conversation_type === 'direct'
            || conversation?.conversation_type === 'group'
              ? [loadParticipants()]
              : []
          ),
        ]);
      } catch {
        // El siguiente intento recuperará los cursores del chat abierto.
      } finally {
        inFlight = false;
      }
    };

    const unsubscribe = subscribeChatRealtimeStatus((status) => {
      if (recoveryTimer) {
        clearInterval(recoveryTimer);
        recoveryTimer = null;
      }
      if (status === 'degraded' && !cancelled) {
        void recoverOpenConversation();
        recoveryTimer = setInterval(() => {
          void recoverOpenConversation();
        }, 15000);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      if (recoveryTimer) clearInterval(recoveryTimer);
    };
  }, [
    autoLoad,
    conversation?.conversation_type,
    initialLoadingPhase,
    loadMessages,
    loadParticipants,
    normalizedConversationId,
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

  const loadReferencedMessage = useCallback(async (
    messageId: string,
  ): Promise<boolean> => {
    const targetId = messageId.trim();

    if (!normalizedConversationId || !targetId) {
      return false;
    }

    if (getStoredMessages(normalizedConversationId).some(
      (message) => message.id === targetId
    )) {
      return true;
    }

    const { currentUserId: activeUserId, token } =
      await getChatAuthContext();
    const { message } = await getChatMessage(token, targetId);

    if (
      message.id !== targetId
      || message.conversation_id !== normalizedConversationId
    ) {
      return false;
    }

    upsertChatMessage(normalizedConversationId, message);
    setCurrentUserId(activeUserId);
    setRawMessages(getStoredMessages(normalizedConversationId));
    return true;
  }, [normalizedConversationId]);

  const sendMessage = useCallback(async (
    payload: {
      content: string;
      messageType?: ChatMessageType;
      replyToId?: string | null;
      attachmentFileId?: string | null;
      metadata?: Record<string, unknown>;
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
      || payload.messageType === 'location'
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
          metadata: payload.metadata,
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
              if (
                conversation?.conversation_type === 'group'
                && message.conversation_id !== normalizedConversationId
              ) {
                return null;
              }
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
  }, [
    conversation?.conversation_type,
    normalizedConversationId,
    participants,
    rawMessages,
    remoteCursorSequences,
  ]);

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

      const receiptStatus = getChatMessageReceiptStatus(
        message,
        participants,
        message.sender_identity_id || activeIdentityId || '',
        cursorSequences,
      );
      return {
        ...model,
        status: (
          (
            conversation?.conversation_type === 'direct'
            || conversation?.conversation_type === 'group'
          )
          && receiptStatus === 'sent'
          && message.id
          && typeof message.sequence_number === 'number'
          && Number.isFinite(message.sequence_number)
            ? 'delivered'
            : receiptStatus
        ),
      };
    });
  }, [
    activeIdentityId,
    conversation?.conversation_type,
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
    loadReferencedMessage,
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
