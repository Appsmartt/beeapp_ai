import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import {
  getChatInboxPresence,
} from '@beeapp/api-client';

import type {
  ChatListItemModel,
} from '../services/chatService';
import {
  getValidAuthSession,
  getSessionCredentials,
} from '../services/authSession';
import {
  startChatPresenceRealtime,
  subscribeChatPresence,
  subscribeChatPresenceReconnect,
} from '../services/chatPresenceRealtime';

let realtimeRetryUserId: string | null = null;
let realtimeRetryAfter = 0;

export function useChatListPresence(
  viewerIdentityId: string | null,
  chats: ChatListItemModel[],
): Record<string, boolean> {
  const [onlineByIdentity, setOnlineByIdentity] = useState<
    Record<string, boolean>
  >({});

  const targetKey = useMemo(() => (
    Array.from(new Set(
      chats
        .filter((chat) => (
          !chat.isGroup
          && !chat.isAI
          && chat.raw.conversation_type === 'direct'
        ))
        .map((chat) => chat.raw.other_identity_id)
        .filter((id): id is string => Boolean(id)),
    )).sort().join(',')
  ), [chats]);

  useEffect(() => {
    setOnlineByIdentity({});

    if (!viewerIdentityId || !targetKey) {
      return;
    }

    let cancelled = false;
    let polling: ReturnType<typeof setInterval> | null = null;
    let requestNumber = 0;
    let eventsDuringSnapshot: Record<string, boolean> = {};
    let snapshotPending = true;

    const targets = targetKey.split(',');
    const targetSet = new Set(targets);

    const onEvent = (event: {
      identity_id: string;
      online: boolean;
    }) => {
      if (cancelled || !targetSet.has(event.identity_id)) {
        return;
      }

      if (snapshotPending) {
        eventsDuringSnapshot[event.identity_id] = event.online;
        return;
      }

      setOnlineByIdentity((previous) => ({
        ...previous,
        [event.identity_id]: event.online,
      }));
    };

    const refresh = async () => {
      const currentRequest = ++requestNumber;
      snapshotPending = true;

      try {
        const session = await getValidAuthSession();
        if (!session || cancelled) {
          throw new Error('Chat presence session unavailable.');
        }

        if (realtimeRetryUserId !== session.user.id) {
          realtimeRetryUserId = session.user.id;
          realtimeRetryAfter = 0;
        }
        if (Date.now() >= realtimeRetryAfter) {
          realtimeRetryAfter = Date.now() + 60000;
          void startChatPresenceRealtime(
            session.user.id,
            session.session.access_token,
          ).then(() => {
            realtimeRetryAfter = 0;
          }).catch(() => undefined);
        }

        const response = await getChatInboxPresence(
          getSessionCredentials(session),
          viewerIdentityId,
          targets,
        );

        if (cancelled || currentRequest !== requestNumber) {
          return;
        }

        const next: Record<string, boolean> = {};
        for (const presence of response.presences) {
          if (targetSet.has(presence.identity_id)) {
            next[presence.identity_id] = presence.is_online;
          }
        }

        Object.assign(next, eventsDuringSnapshot);
        eventsDuringSnapshot = {};
        snapshotPending = false;
        setOnlineByIdentity(next);
      } catch {
        if (cancelled || currentRequest !== requestNumber) {
          return;
        }

        snapshotPending = false;
        setOnlineByIdentity({});
      }
    };

    const unsubscribeEvents = subscribeChatPresence(onEvent);
    const unsubscribeReconnect = subscribeChatPresenceReconnect(() => {
      void refresh();
    });

    const appSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') {
          void refresh();
        } else {
          setOnlineByIdentity({});
        }
      },
    );

    void refresh();
    polling = setInterval(() => {
      if (AppState.currentState === 'active') {
        void refresh();
      }
    }, 30000);

    return () => {
      cancelled = true;
      requestNumber += 1;
      unsubscribeEvents();
      unsubscribeReconnect();
      appSubscription.remove();
      if (polling) {
        clearInterval(polling);
      }
    };
  }, [viewerIdentityId, targetKey]);

  return onlineByIdentity;
}
