import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useSegments } from 'expo-router';

import { getPrivateChatIdentityId } from '../../hooks/useChat';
import { useChatIdentityPresence } from '../../hooks/useChatIdentityPresence';

export default function PrivateChatPresenceController() {
  const segments = useSegments();
  const isInMainArea = segments[0] === '(main)';
  const [identityId, setIdentityId] = useState<string | null>(null);

  useEffect(() => {
    if (!isInMainArea) {
      setIdentityId(null);
      return;
    }

    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const resolveIdentity = async () => {
      if (cancelled || AppState.currentState !== 'active') {
        return;
      }

      try {
        const resolved = await getPrivateChatIdentityId();
        if (!cancelled) {
          setIdentityId(resolved);
        }
      } catch {
        if (!cancelled) {
          retry = setTimeout(() => {
            void resolveIdentity();
          }, 45000);
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active' && !identityId) {
          void resolveIdentity();
        }
      },
    );

    void resolveIdentity();

    return () => {
      cancelled = true;
      subscription.remove();
      if (retry) {
        clearTimeout(retry);
      }
      setIdentityId(null);
    };
  }, [isInMainArea]);

  useChatIdentityPresence(identityId, isInMainArea);
  return null;
}
