import {
  createClient,
  type RealtimeChannel,
} from '@supabase/supabase-js';

export type ChatPresenceEvent = {
  identity_id: string;
  online: boolean;
  expires_at: string | null;
};

type PresenceListener = (event: ChatPresenceEvent) => void;

const supabaseUrl = String(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
).trim();
const supabaseKey = String(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
).trim();

const presenceClient = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;

const listeners = new Set<PresenceListener>();
const reconnectListeners = new Set<() => void>();
let activeChannel: RealtimeChannel | null = null;
let activeUserId: string | null = null;
let startPromise: Promise<void> | null = null;

export function subscribeChatPresence(
  listener: PresenceListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeChatPresenceReconnect(
  listener: () => void,
): () => void {
  reconnectListeners.add(listener);
  return () => reconnectListeners.delete(listener);
}

export async function stopChatPresenceRealtime(): Promise<void> {
  const channel = activeChannel;
  activeChannel = null;
  activeUserId = null;

  if (channel && presenceClient) {
    await presenceClient.removeChannel(channel);
  }
}

export async function startChatPresenceRealtime(
  userId: string,
  accessToken: string,
): Promise<void> {
  if (!presenceClient || !userId.trim() || !accessToken.trim()) {
    throw new Error('Chat presence Realtime is unavailable.');
  }

  presenceClient.realtime.setAuth(accessToken);

  if (activeChannel && activeUserId === userId) {
    if (startPromise) {
      await startPromise;
    }
    return;
  }

  if (startPromise) {
    await startPromise.catch(() => undefined);
    if (activeChannel && activeUserId === userId) {
      return;
    }
  }

  await stopChatPresenceRealtime();

  const channel = presenceClient
    .channel(`presence:user:${userId}`, {
      config: { private: true },
    })
    .on(
      'broadcast',
      { event: 'presence.changed' },
      (message) => {
        const payload = message.payload as Record<string, unknown>;
        const identityId = String(payload?.identity_id || '').trim();

        if (!identityId || typeof payload?.online !== 'boolean') {
          return;
        }

        const event: ChatPresenceEvent = {
          identity_id: identityId,
          online: payload.online,
          expires_at: typeof payload.expires_at === 'string'
            ? payload.expires_at
            : null,
        };

        listeners.forEach((listener) => listener(event));
      },
    );

  activeChannel = channel;
  activeUserId = userId;

  let hasSubscribed = false;

  startPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Chat presence subscription timed out.'));
    }, 10000);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        if (hasSubscribed) {
          reconnectListeners.forEach((listener) => listener());
        } else {
          hasSubscribed = true;
        }
        resolve();
      } else if (
        status === 'CHANNEL_ERROR'
        || status === 'TIMED_OUT'
      ) {
        clearTimeout(timeout);
        reject(new Error('Chat presence subscription failed.'));
      }
    });
  });

  try {
    await startPromise;
  } catch (error) {
    if (activeChannel === channel) {
      activeChannel = null;
      activeUserId = null;
    }
    await presenceClient.removeChannel(channel);
    throw error;
  } finally {
    startPromise = null;
  }
}
