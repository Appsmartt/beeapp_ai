import {
  updateNetworkVisibility,
} from '@beeapp/api-client';
import type { AuthCredentials } from '@beeapp/shared-types';

type NetworkVisibilityProfile = {
  network_visibility?: string | null;
  is_public?: boolean | null;
};

export function isProfileVisibleInNetwork(
  profile: NetworkVisibilityProfile | null | undefined,
): boolean {
  if (!profile) {
    return true;
  }

  const visibility = String(profile.network_visibility || '')
    .trim()
    .toLowerCase();

  if (
    visibility === 'private'
    || visibility === 'privado'
    || visibility === 'contacts'
    || visibility === 'solo_equipo'
    || visibility === 'team'
  ) {
    return false;
  }

  return profile.is_public !== false;
}

export function saveNetworkVisibility(
  auth: AuthCredentials,
  visible: boolean,
) {
  return updateNetworkVisibility(auth, visible);
}
