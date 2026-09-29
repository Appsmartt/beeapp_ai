import {
  createClient,
  type RealtimeChannel,
} from '@supabase/supabase-js';
import {
  getChatIdentities,
  getChatInbox,
  getChatMessage,
  getChatMessages as fetchChatMessages,
  getChatParticipants,
  markChatConversationDelivered,
} from '@beeapp/api-client';

import {
  getValidAuthSession,
  getSessionCredentials,
} from './authSession';
import {
  applyChatReactionPreview,
  getActiveChatStoreIdentityId,
  getChatConversations,
  getChatMessages,
  setChatConversations,
  setChatMessages,
  updateChatConversationLastMessage,
  updateDirectChatReceipt,
  upsertChatConversation,
  upsertChatMessage,
} from '../stores/chatStore';
import {
  getChatMessageReceiptStatus,
} from './chatReceiptStatus';

const supabaseUrl = String(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
).trim();

const supabaseAnonKey = String(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
).trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase Realtime requiere EXPO_PUBLIC_SUPABASE_URL '
    + 'y EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);

type ChatSyncBroadcast = {
  event_id?: unknown;
  event_sequence?: unknown;
  type?: unknown;
  conversation_id?: unknown;
  message_id?: unknown;
  created_at?: unknown;
  payload?: unknown;
};

let activeChannel: RealtimeChannel | null = null;
let activeUserId: string | null = null;
let startPromise: Promise<void> | null = null;
let lastChatRealtimeRetryAt = 0;
const CHAT_REALTIME_RETRY_COOLDOWN_MS = 15000;

type ChatRealtimeStatus = 'connecting' | 'connected' | 'degraded';
let chatRealtimeStatus: ChatRealtimeStatus = 'connecting';
const chatRealtimeStatusListeners = new Set<(status: ChatRealtimeStatus) => void>();

export function subscribeChatRealtimeStatus(
  listener: (status: ChatRealtimeStatus) => void,
): () => void {
  chatRealtimeStatusListeners.add(listener);
  listener(chatRealtimeStatus);
  return () => {
    chatRealtimeStatusListeners.delete(listener);
  };
}

function setChatRealtimeStatus(status: ChatRealtimeStatus): void {
  if (chatRealtimeStatus === status) return;
  chatRealtimeStatus = status;
  chatRealtimeStatusListeners.forEach((listener) => listener(status));
}

const inFlightMessageIds = new Set<string>();

const MESSAGE_FETCH_RETRY_DELAYS_MS = [
  0,
  120,
  280,
  600,
  1000,
] as const;

function normalizeString(
  value: unknown,
): string {
  return String(value || '').trim();
}

function wait(
  milliseconds: number,
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isMessageNotFoundError(
  error: unknown,
): boolean {
  return (
    error instanceof Error
    && error.message.trim().toLowerCase()
      === 'message was not found.'
  );
}

function getBroadcastValue(
  value: unknown,
): ChatSyncBroadcast | null {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    return null;
  }

  return value as ChatSyncBroadcast;
}

async function reconcileIncomingChatInbox(
  credentials: ReturnType<typeof getSessionCredentials>,
  conversationId: string,
  messageId: string,
): Promise<void> {
  const { identities } = await getChatIdentities(credentials);
  const activeIdentities = identities.filter(
    (identity) => (
      identity.is_active
      && identity.id === getActiveChatStoreIdentityId()
    ),
  );

  await Promise.all(activeIdentities.map(async (identity) => {
    try {
      const { conversations } = await getChatInbox(
        credentials,
        identity.id,
        { limit: 10 },
      );
      const incoming = conversations.find(
        (item) => (
          item.id === conversationId
          && item.last_message?.id === messageId
        ),
      );
      if (!incoming) return;
      if (getActiveChatStoreIdentityId() !== identity.id) return;

      const current = getChatConversations().find(
        (item) => item.id === conversationId,
      );
      if (current?.last_message?.id !== messageId) {
        const currentSequence = current?.last_message?.sequence_number;
        const incomingSequence = incoming.last_message?.sequence_number;
        const currentTime = Date.parse(
          current?.last_message_at
          || current?.last_message?.created_at
          || '',
        );
        const incomingTime = Date.parse(
          incoming.last_message_at
          || incoming.last_message?.created_at
          || '',
        );
        if (
          (
            typeof currentSequence === 'number'
            && typeof incomingSequence === 'number'
            && currentSequence > incomingSequence
          )
          || (
            Number.isFinite(currentTime)
            && Number.isFinite(incomingTime)
            && currentTime > incomingTime
          )
        ) return;
      }

      const completeParticipants = (
        current?.participants?.filter(
          (participant) => (
            Boolean(participant.joined_at)
            && !participant.id.startsWith('own:')
          ),
        ) || []
      );
      upsertChatConversation({
        ...current,
        ...incoming,
        is_pinned: incoming.is_pinned ?? current?.is_pinned,
        participants: completeParticipants.length
          ? completeParticipants
          : incoming.participants,
      });

      // The inbox owns the unread count. A same-message store merge can
      // otherwise keep the count from the earlier preview update.
      const stored = getChatConversations().find(
        (item) => item.id === conversationId,
      );
      const alreadyReadLatestMessage = Boolean(
        stored?.unread_count === 0
        && stored.own_participant?.last_read_message_id === messageId,
      );
      if (
        stored?.last_message?.id === messageId
        && !alreadyReadLatestMessage
        && stored.unread_count !== incoming.unread_count
      ) {
        setChatConversations(getChatConversations().map((item) => (
          item.id === conversationId
            ? {
                ...item,
                unread_count: incoming.unread_count,
                own_participant: item.own_participant
                  ? {
                      ...item.own_participant,
                      unread_count: incoming.unread_count,
                    }
                  : item.own_participant,
              }
            : item
        )));
      }
    } catch {
      // Un fallo de inbox no debe impedir recibir el mensaje.
    }
  }));
}

async function applyMessageCreatedBroadcast(
  event: ChatSyncBroadcast,
): Promise<void> {
  const eventType = normalizeString(event.type);

  if (eventType !== 'message.created') {
    return;
  }

  const conversationId = normalizeString(
    event.conversation_id,
  );

  const messageId = normalizeString(event.message_id);

  if (!conversationId || !messageId) {
    return;
  }

  if (inFlightMessageIds.has(messageId)) {
    return;
  }

  inFlightMessageIds.add(messageId);

  try {
    const authSession = await getValidAuthSession();

    if (!authSession) {
      return;
    }

    let message = null;

    for (
      let attempt = 0;
      attempt < MESSAGE_FETCH_RETRY_DELAYS_MS.length;
      attempt += 1
    ) {
      const delay = MESSAGE_FETCH_RETRY_DELAYS_MS[attempt];

      if (delay > 0) {
        await wait(delay);
      }

      try {
        const response = await getChatMessage(
          getSessionCredentials(authSession),
          messageId,
        );

        message = response.message;
        break;
      } catch (error) {
        const isLastAttempt = (
          attempt
          === MESSAGE_FETCH_RETRY_DELAYS_MS.length - 1
        );

        if (
          !isMessageNotFoundError(error)
          || isLastAttempt
        ) {
          throw error;
        }

      }
    }

    if (!message) {
      return;
    }

    if (
      normalizeString(message.conversation_id)
      !== conversationId
    ) {
      return;
    }

    const alreadyStored = getChatMessages(conversationId).some(
      (item) => item.id === messageId,
    );
    const conversation = getChatConversations().find(
      (item) => item.id === conversationId,
    );
    const activeIdentityId = getActiveChatStoreIdentityId();
    const lastSequence = conversation?.last_message?.sequence_number;
    const incomingSequence = message.sequence_number;
    const isNewerMessage = (
      typeof lastSequence === 'number'
      && typeof incomingSequence === 'number'
        ? incomingSequence > lastSequence
        : !conversation?.last_message
          || Date.parse(message.created_at) > Date.parse(
            conversation.last_message.created_at,
          )
    );

    upsertChatMessage(
      conversationId,
      message,
    );

    if (conversation) {
      const isIncomingForActiveIdentity = Boolean(
        activeIdentityId
        && conversation.own_participant?.identity_id === activeIdentityId
        && (
          message.sender_identity_id
            ? message.sender_identity_id !== activeIdentityId
            : message.sender_id !== authSession.user.id
        ),
      );
      updateChatConversationLastMessage(
        conversationId,
        message,
        !alreadyStored
          && isNewerMessage
          && isIncomingForActiveIdentity,
      );
    }

    try {
      const credentials = getSessionCredentials(authSession);
      const [identitiesResponse, participantsResponse] = (
        await Promise.all([
          getChatIdentities(credentials),
          getChatParticipants(credentials, conversationId),
        ])
      );
      const ownedIds = new Set(
        identitiesResponse.identities
          .filter((identity) => identity.is_active)
          .map((identity) => identity.id),
      );
      const recipients = participantsResponse.participants.filter(
        (participant) => (
          ownedIds.has(participant.identity_id)
          && participant.left_at === null
          && participant.removed_at === null
          && participant.identity_id
            !== message.sender_identity_id
          && (
            !message.sender_identity_id
              ? message.sender_id !== authSession.user.id
              : true
          )
        ),
      );

      await Promise.all(
        recipients.map(async (participant) => {
          try {
            await markChatConversationDelivered(
              credentials,
              conversationId,
              {
                identity_id: participant.identity_id,
                last_delivered_message_id: message.id,
              },
            );
          } catch {
            // Un acuse fallido no impide recibir el mensaje.
          }
        }),
      );
    } catch {
      // La resolución de identidad no bloquea mensajes recibidos.
    }

    await reconcileIncomingChatInbox(
      getSessionCredentials(authSession),
      conversationId,
      messageId,
    );
  } catch {
  } finally {
    inFlightMessageIds.delete(messageId);
  }
}


export function applyChatMessageIdPush(
  data: Record<string, unknown>,
): void {
  const module = normalizeString(data.module);
  const type = normalizeString(data.event_type || data.type);
  const conversationId = normalizeString(data.conversation_id);
  const messageId = normalizeString(data.message_id);

  if (
    module !== 'chat'
    || (
      type
      && type !== 'chat.message.created'
      && type !== 'chat_message'
    )
    || !conversationId
    || !messageId
  ) {
    return;
  }

  void applyMessageCreatedBroadcast({
    type: 'message.created',
    conversation_id: conversationId,
    message_id: messageId,
  });
}

async function applyMessageReceiptBroadcast(
  event: ChatSyncBroadcast,
): Promise<void> {
  if (normalizeString(event.type) !== 'participant.upsert') {
    return;
  }

  const payload = (
    event.payload
    && typeof event.payload === 'object'
    && !Array.isArray(event.payload)
      ? event.payload as Record<string, unknown>
      : null
  );

  if (payload?.reason !== 'message_receipt') {
    return;
  }

  const conversationId = normalizeString(
    event.conversation_id,
  );
  const conversation = getChatConversations().find(
    (item) => item.id === conversationId,
  );

  if (!conversation) {
    return;
  }

  try {
    const session = await getValidAuthSession();
    if (!session) {
      return;
    }

    const credentials = getSessionCredentials(session);
    const { participants } = await getChatParticipants(
      credentials,
      conversationId,
    );
    const current = getChatConversations().find(
      (item) => item.id === conversationId,
    );
    if (!current) {
      return;
    }

    const lastMessage = current.last_message;
    const ownIdentityId = current.own_participant?.identity_id;
    const isOwnLastMessage = Boolean(
      lastMessage
      && ownIdentityId
      && lastMessage.sender_identity_id === ownIdentityId
    );

    if (current.conversation_type === 'direct') {
      updateDirectChatReceipt(conversationId, participants);
    }
    if (!isOwnLastMessage || !lastMessage || !ownIdentityId) {
      if (current.conversation_type !== 'direct') {
        upsertChatConversation({
          ...current,
          participants,
        });
      }
      return;
    }

    const storedMessages = getChatMessages(conversationId);
    const sequenceById: Record<string, number> = {};
    storedMessages.forEach((message) => {
      if (
        typeof message.sequence_number === 'number'
        && Number.isFinite(message.sequence_number)
      ) {
        sequenceById[message.id] = message.sequence_number;
      }
    });

    let receiptMessage = (
      storedMessages.find((message) => (
        message.id === lastMessage.id
      ))
      || lastMessage
    );
    if (
      typeof receiptMessage.sequence_number !== 'number'
      || !Number.isFinite(receiptMessage.sequence_number)
    ) {
      const response = await getChatMessage(
        credentials,
        lastMessage.id,
      );
      if (response.message.conversation_id !== conversationId) {
        return;
      }
      receiptMessage = response.message;
    }
    if (
      typeof receiptMessage.sequence_number === 'number'
      && Number.isFinite(receiptMessage.sequence_number)
    ) {
      sequenceById[receiptMessage.id] =
        receiptMessage.sequence_number;
    }

    const cursorIds = new Set<string>();
    participants.forEach((participant) => {
      if (
        participant.identity_id === ownIdentityId
        || participant.left_at != null
        || participant.removed_at != null
      ) {
        return;
      }
      if (participant.last_read_message_id) {
        cursorIds.add(participant.last_read_message_id);
      }
      if (participant.last_delivered_message_id) {
        cursorIds.add(participant.last_delivered_message_id);
      }
    });
    await Promise.all(
      [...cursorIds]
        .filter((id) => sequenceById[id] === undefined)
        .map(async (id) => {
          try {
            const { message } = await getChatMessage(
              credentials,
              id,
            );
            if (
              message.conversation_id === conversationId
              && typeof message.sequence_number === 'number'
              && Number.isFinite(message.sequence_number)
            ) {
              sequenceById[id] = message.sequence_number;
            }
          } catch {
            // Sin secuencia verificada no se infiere un acuse.
          }
        }),
    );

    const latest = getChatConversations().find(
      (item) => item.id === conversationId,
    );
    if (!latest) {
      return;
    }
    if (latest.last_message?.id !== lastMessage.id) {
      upsertChatConversation({
        ...latest,
        participants,
      });
      return;
    }

    const receiptStatus = getChatMessageReceiptStatus(
      receiptMessage,
      participants,
      ownIdentityId,
      sequenceById,
    );
    const status = (
      latest.conversation_type === 'group'
      && receiptStatus === 'sent'
      && typeof receiptMessage.sequence_number === 'number'
      && Number.isFinite(receiptMessage.sequence_number)
        ? 'delivered'
        : receiptStatus
    );
    const updatedLastMessage = {
      ...latest.last_message,
      sequence_number: receiptMessage.sequence_number,
      status,
    };
    if (latest.conversation_type === 'direct') {
      updateDirectChatReceipt(
        conversationId,
        participants,
        updatedLastMessage,
      );
    } else {
      upsertChatConversation({
        ...latest,
        participants,
        last_message: updatedLastMessage,
      });
    }
  } catch {
    // Un recibo no debe impedir procesar mensajes posteriores.
  }
}

const reactionRefreshes = new Set<string>();
const pendingReactionRefreshes = new Set<string>();

async function applyReactionBroadcast(event: ChatSyncBroadcast): Promise<void> {
  const conversationId = normalizeString(event.conversation_id);
  const messageId = normalizeString(event.message_id);
  if (!conversationId || !messageId) return;
  if (reactionRefreshes.has(messageId)) {
    pendingReactionRefreshes.add(messageId);
    return;
  }
  if (!getChatMessages(conversationId).some((item) => item.id === messageId)) return;
  reactionRefreshes.add(messageId);
  try {
    do {
      pendingReactionRefreshes.delete(messageId);
      const session = await getValidAuthSession();
      if (!session) return;
      const { message } = await getChatMessage(
        getSessionCredentials(session), messageId,
      );
      if (message.conversation_id === conversationId
        && getChatMessages(conversationId).some((item) => item.id === messageId)) {
        upsertChatMessage(conversationId, message);
      }
    } while (pendingReactionRefreshes.has(messageId));
  } catch {
    // Reaction refresh failures must not block chat broadcasts.
  } finally {
    reactionRefreshes.delete(messageId);
    pendingReactionRefreshes.delete(messageId);
  }
}

async function handleChatBroadcast(
  rawPayload: unknown,
): Promise<void> {
  const event = getBroadcastValue(rawPayload);

  if (!event) {
    return;
  }


  if (event.type === 'reaction.created' || event.type === 'reaction.deleted') {
    if (__DEV__) console.info('[reaction-preview] broadcast', {
      type: event.type,
      hasConversation: Boolean(normalizeString(event.conversation_id)),
      hasMessage: Boolean(normalizeString(event.message_id)),
      hasPayload: Boolean(event.payload),
      hasDate: Boolean(normalizeString(event.created_at)),
      sequenceValid: Number.isSafeInteger(Number(event.event_sequence)),
    });
    const payload = event.payload;
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const details = payload as Record<string, unknown>;
      const eventSequence = Number(event.event_sequence);
      if (Number.isSafeInteger(eventSequence)) {
        applyChatReactionPreview({
          type: event.type,
          conversationId: normalizeString(event.conversation_id),
          messageId: normalizeString(event.message_id),
          identityId: normalizeString(details.identity_id),
          emoji: normalizeString(details.emoji),
          createdAt: normalizeString(event.created_at),
          eventSequence,
        });
      }
    }
    await applyReactionBroadcast(event);
    return;
  }

  if (normalizeString(event.type) === 'participant.upsert') {
    await applyMessageReceiptBroadcast(event);
    return;
  }

  await applyMessageCreatedBroadcast(event);
}

async function reconcileCachedChatsAfterSubscribe(): Promise<void> {
  const session = await getValidAuthSession();
  if (!session) return;

  const credentials = getSessionCredentials(session);
  const { identities } = await getChatIdentities(credentials);
  await Promise.all(identities.filter(
    (identity) => (
      identity.is_active
      && identity.id === getActiveChatStoreIdentityId()
    ),
  ).map(async (identity) => {
    try {
      const { conversations } = await getChatInbox(
        credentials, identity.id, { limit: 10 },
      );
      for (const incoming of conversations) {
        if (getActiveChatStoreIdentityId() !== identity.id) break;
        const current = getChatConversations().find(
          (item) => item.id === incoming.id,
        );
        const currentTime = Date.parse(current?.last_message_at || '');
        const incomingTime = Date.parse(incoming.last_message_at || '');
        if (
          current
          && Number.isFinite(currentTime)
          && Number.isFinite(incomingTime)
          && currentTime > incomingTime
        ) continue;

        const cachedMessages = getChatMessages(incoming.id);
        upsertChatConversation({
          ...current,
          ...incoming,
          is_pinned: incoming.is_pinned ?? current?.is_pinned,
          participants: current?.participants?.some(
            (participant) => Boolean(participant.joined_at),
          ) ? current.participants : incoming.participants,
        });
        if (!cachedMessages.length) continue;

        try {
          const [page, participantResponse] = await Promise.all([
            fetchChatMessages(credentials, incoming.id, { limit: 50 }),
            getChatParticipants(credentials, incoming.id),
          ]);
          const byId = new Map(
            cachedMessages.map((message) => [message.id, message]),
          );
          page.messages.forEach((message) => {
            byId.set(message.id, message);
          });
          setChatMessages(incoming.id, [...byId.values()]);
          const latest = getChatConversations().find(
            (item) => item.id === incoming.id,
          );
          if (latest) {
            upsertChatConversation({
              ...latest,
              participants: participantResponse.participants,
            });
          }
        } catch {
          // La recuperación no bloquea los eventos posteriores.
        }
      }
    } catch {
      // Una identidad no bloquea las demás.
    }
  }));
}

export async function startChatRealtime(): Promise<void> {
  const authSession = await getValidAuthSession();

  if (!authSession) {
    await stopChatRealtime();
    return;
  }

  const userId = normalizeString(authSession.user.id);
  const accessToken = normalizeString(
    authSession.session.access_token,
  );

  if (!userId || !accessToken) {
    await stopChatRealtime();
    return;
  }

  if (startPromise) {
    return startPromise;
  }

  if (activeChannel && activeUserId === userId) {
    if (activeChannel.state === 'joined') {
      return;
    }
    if (activeChannel.state === 'joining') {
      return;
    }
    if (
      Date.now() - lastChatRealtimeRetryAt
      < CHAT_REALTIME_RETRY_COOLDOWN_MS
    ) {
      return;
    }
    lastChatRealtimeRetryAt = Date.now();
  }

  startPromise = (async () => {
    await stopChatRealtime();

    activeUserId = userId;

    supabase.realtime.setAuth(accessToken);

    const topic = `chat:user:${userId}`;

    const channel = supabase
      .channel(
        topic,
        {
          config: {
            private: true,
          },
        },
      )
      .on(
        'broadcast',
        {
          event: 'chat.sync',
        },
        (message) => {
          void handleChatBroadcast(message.payload);
        },
      );

    activeChannel = channel;
    channel.subscribe((status) => {
        if (activeChannel !== channel) return;
        if (status === 'SUBSCRIBED') {
          setChatRealtimeStatus('connected');
          void reconcileCachedChatsAfterSubscribe().catch(() => {
            // La conexión sigue activa aunque falle la recuperación.
          });
        }
        if (
          status === 'CHANNEL_ERROR'
          || status === 'TIMED_OUT'
          || status === 'CLOSED'
        ) {
          setChatRealtimeStatus('degraded');
        }
      });
  })();

  try {
    await startPromise;
  } finally {
    startPromise = null;
  }
}

export async function stopChatRealtime(): Promise<void> {
  const channel = activeChannel;

  activeChannel = null;
  activeUserId = null;
  inFlightMessageIds.clear();

  if (channel) {
    await supabase.removeChannel(channel);
  }
}
