import { useEffect, useState } from 'react';

import {
  bootstrapChat,
  getChatIdentities,
} from '@beeapp/api-client';

import {
  useChatIdentityPresence,
} from '../../hooks/useChatIdentityPresence';
import {
  getValidSessionCredentials,
} from '../../services/authSession';

type Props = {
  businessId: string;
  focused: boolean;
};

export default function CommercialChatPresenceController({
  businessId,
  focused,
}: Props) {
  const [resolved, setResolved] = useState<{
    businessId: string;
    identityId: string;
  } | null>(null);

  useEffect(() => {
    if (!focused) {
      setResolved(null);
      return;
    }

    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const resolveIdentity = async () => {
      try {
        const auth = await getValidSessionCredentials();
        if (!auth) {
          return;
        }

        await bootstrapChat(auth);
        const response = await getChatIdentities(auth);
        const identity = response.identities.find(
          (item) => (
            item.identity_type === 'commercial_profile'
            && item.commercial_profile_id === businessId
            && item.is_active
          ),
        );

        if (!identity) {
          throw new Error('Commercial chat identity unavailable.');
        }

        if (!cancelled) {
          setResolved({
            businessId,
            identityId: identity.id,
          });
        }
      } catch {
        if (!cancelled) {
          retry = setTimeout(() => {
            void resolveIdentity();
          }, 45000);
        }
      }
    };

    void resolveIdentity();

    return () => {
      cancelled = true;
      if (retry) {
        clearTimeout(retry);
      }
    };
  }, [businessId, focused]);

  useChatIdentityPresence(
    resolved?.businessId === businessId
      ? resolved.identityId
      : null,
    focused,
  );

  return null;
}
