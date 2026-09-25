import type { AuthCredentials } from '@beeapp/shared-types';

import { api } from './client';

export interface ChatIdentityPresence {
  identity_id: string;
  is_online: boolean;
  expires_at: string | null;
}

function requirePresenceAuth(
  auth: AuthCredentials,
): AuthCredentials {
  if (auth.scheme !== 'Bearer' || !auth.token?.trim()) {
    throw new Error('Chat presence requires Bearer authentication.');
  }

  return auth;
}

export function setChatIdentityPresence(
  auth: AuthCredentials,
  identityId: string,
  online: boolean,
): Promise<{ online: boolean }> {
  return api.post<{ online: boolean }>(
    '/chat/presence/state/',
    {
      identity_id: identityId,
      online,
    },
    {
      auth: requirePresenceAuth(auth),
    },
  );
}

export function getChatInboxPresence(
  auth: AuthCredentials,
  viewerIdentityId: string,
  targetIdentityIds: string[],
): Promise<{ presences: ChatIdentityPresence[] }> {
  if (targetIdentityIds.length > 100) {
    throw new Error('Too many chat presence identities.');
  }

  return api.post<{ presences: ChatIdentityPresence[] }>(
    '/chat/presence/snapshot/',
    {
      viewer_identity_id: viewerIdentityId,
      target_identity_ids: targetIdentityIds,
    },
    {
      auth: requirePresenceAuth(auth),
    },
  );
}
