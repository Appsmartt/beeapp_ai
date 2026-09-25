import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getChatInboxPresence } from '@beeapp/api-client';
import { getValidAuthSession, getSessionCredentials } from '../services/authSession';
import {
  startChatPresenceRealtime,
  subscribeChatPresence,
  subscribeChatPresenceReconnect,
} from '../services/chatPresenceRealtime';

export type ConversationPresence = {
  loading: boolean;
  online: boolean;
  lastSeenAt: string | null;
};

const INITIAL_PRESENCE: ConversationPresence = {
  loading: true,
  online: false,
  lastSeenAt: null,
};

export function useConversationPresence(
  viewerIdentityId: string | null,
  targetIdentityId: string | null,
  enabled: boolean,
): ConversationPresence {
  const [presence, setPresence] = useState<ConversationPresence>(INITIAL_PRESENCE);
  const [presenceKey, setPresenceKey] = useState<string | null>(null);
  const key = enabled && viewerIdentityId && targetIdentityId
    ? `${viewerIdentityId}:${targetIdentityId}`
    : null;

  useEffect(() => {
    setPresenceKey(key);
    setPresence(INITIAL_PRESENCE);
    if (!key || !viewerIdentityId || !targetIdentityId) {
      return;
    }

    let cancelled = false;
    let requestNumber = 0;
    let eventVersion = 0;
    let latestEvent: boolean | null = null;

    const refresh = async () => {
      const request = ++requestNumber;
      const startingEventVersion = eventVersion;
      try {
        const session = await getValidAuthSession();
        if (!session || cancelled) {
          throw new Error('Chat presence session unavailable.');
        }
        void startChatPresenceRealtime(
          session.user.id,
          session.session.access_token,
        ).catch(() => undefined);

        const response = await getChatInboxPresence(
          getSessionCredentials(session),
          viewerIdentityId,
          [targetIdentityId],
        );
        if (cancelled || request !== requestNumber) {
          return;
        }
        const item = response.presences.find(
          (row) => row.identity_id === targetIdentityId,
        );
        const eventIsNewer = startingEventVersion !== eventVersion;
        setPresence({
          loading: false,
          online: eventIsNewer && latestEvent !== null
            ? latestEvent
            : item?.is_online === true,
          lastSeenAt: item?.last_seen_at || null,
        });
        if (eventIsNewer && latestEvent === false) {
          void refresh();
        }
      } catch {
        if (!cancelled && request === requestNumber) {
          setPresence((current) => ({
            ...current,
            loading: false,
            online: latestEvent === true,
          }));
        }
      }
    };

    const unsubscribe = subscribeChatPresence((event) => {
      if (event.identity_id !== targetIdentityId || cancelled) {
        return;
      }
      eventVersion += 1;
      latestEvent = event.online;
      setPresence((current) => ({
        ...current,
        loading: false,
        online: event.online,
        lastSeenAt: null,
      }));
      if (!event.online) {
        void refresh();
      }
    });
    const unsubscribeReconnect = subscribeChatPresenceReconnect(() => {
      void refresh();
    });
    const appSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      } else {
        setPresence((current) => ({ ...current, online: false }));
      }
    });
    void refresh();
    const polling = setInterval(() => {
      if (AppState.currentState === 'active') {
        void refresh();
      }
    }, 30000);

    return () => {
      cancelled = true;
      requestNumber += 1;
      clearInterval(polling);
      unsubscribe();
      unsubscribeReconnect();
      appSubscription.remove();
    };
  }, [key, viewerIdentityId, targetIdentityId]);

  return key && presenceKey === key ? presence : INITIAL_PRESENCE;
}
