import {
  createClient,
  type RealtimeChannel,
} from '@supabase/supabase-js';
import {
  getChatMessage,
} from '@beeapp/api-client';

import {
  getValidAuthSession,
  getSessionCredentials,
} from './authSession';
import {
  getChatConversations,
  updateChatConversationLastMessage,
  upsertChatMessage,
} from '../stores/chatStore';

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

        console.log(
          '[chat realtime][message not visible yet]',
          {
            conversationId,
            messageId,
            attempt: attempt + 1,
          },
        );
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

    upsertChatMessage(
      conversationId,
      message,
    );

    const conversation = getChatConversations().find(
      (item) => item.id === conversationId,
    );

    if (conversation) {
      updateChatConversationLastMessage(
        conversationId,
        message,
      );
    }

    console.log(
      '[chat realtime][message applied]',
      {
        conversationId,
        messageId,
      },
    );
  } catch (error) {
    console.warn(
      '[chat realtime][message fetch failed]',
      {
        conversationId,
        messageId,
        error: (
          error instanceof Error
            ? error.message
            : String(error)
        ),
      },
    );
  } finally {
    inFlightMessageIds.delete(messageId);
  }
}

async function handleChatBroadcast(
  rawPayload: unknown,
): Promise<void> {
  const event = getBroadcastValue(rawPayload);

  if (!event) {
    console.warn(
      '[chat realtime][invalid broadcast]',
      rawPayload,
    );
    return;
  }

  console.log(
    '[chat realtime][broadcast]',
    {
      eventId: normalizeString(event.event_id),
      eventType: normalizeString(event.type),
      conversationId: normalizeString(event.conversation_id),
      messageId: normalizeString(event.message_id),
    },
  );

  await applyMessageCreatedBroadcast(event);
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

  if (
    activeChannel
    && activeUserId === userId
  ) {
    return;
  }

  if (startPromise) {
    return startPromise;
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
      )
      .subscribe((status, error) => {
        console.log(
          '[chat realtime][subscription]',
          {
            topic,
            status,
            error: error?.message || null,
          },
        );
      });

    activeChannel = channel;
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
