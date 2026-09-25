import { useEffect } from 'react';
import { AppState } from 'react-native';

import {
  setChatIdentityPresence,
} from '@beeapp/api-client';

import {
  getValidSessionCredentials,
} from '../services/authSession';

const PRESENCE_HEARTBEAT_MS = 45000;

export function useChatIdentityPresence(
  identityId: string | null,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled || !identityId) {
      return;
    }

    let mounted = true;
    let starting = false;
    let activityVersion = 0;
    let attemptedOnline = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let pending: Promise<void> = Promise.resolve();

    const enqueue = (online: boolean): Promise<void> => {
      pending = pending.catch(() => undefined).then(async () => {
        const auth = await getValidSessionCredentials();
        if (!auth) {
          return;
        }

        await setChatIdentityPresence(
          auth,
          identityId,
          online,
        );
      });

      return pending;
    };

    const clearHeartbeat = () => {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    };

    const deactivate = () => {
      activityVersion += 1;
      clearHeartbeat();
      if (attemptedOnline) {
        void enqueue(false).catch(() => undefined);
      }
    };

    const activate = async () => {
      if (
        !mounted
        || starting
        || heartbeat
        || AppState.currentState !== 'active'
      ) {
        return;
      }

      starting = true;
      const startedVersion = activityVersion;
      attemptedOnline = true;

      try {
        await enqueue(true);

        if (
          !mounted
          || AppState.currentState !== 'active'
          || activityVersion !== startedVersion
        ) {
          void enqueue(false).catch(() => undefined);
          return;
        }

        heartbeat = setInterval(() => {
          if (mounted && AppState.currentState === 'active') {
            void enqueue(true).catch(() => undefined);
          }
        }, PRESENCE_HEARTBEAT_MS);
      } catch {
        if (mounted && AppState.currentState === 'active') {
          heartbeat = setInterval(() => {
            void enqueue(true).catch(() => undefined);
          }, PRESENCE_HEARTBEAT_MS);
        }
      } finally {
        starting = false;
        if (
          mounted
          && AppState.currentState === 'active'
          && activityVersion !== startedVersion
          && !heartbeat
        ) {
          void activate();
        }
      }
    };

    void activate();

    const subscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState === 'active') {
          void activate();
        } else {
          deactivate();
        }
      },
    );

    return () => {
      mounted = false;
      subscription.remove();
      deactivate();
    };
  }, [identityId, enabled]);
}
