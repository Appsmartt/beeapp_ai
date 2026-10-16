import type { Href } from 'expo-router';
import type {
  StatusFollowDiscoverItem,
  StatusFollowTarget,
} from '@beeapp/shared-types';

import {
  buddyServicesPublicProfileRoute,
} from '../buddyservices/commercialRoutes';

export type UnifiedPerson = {
  key: string;
  actorType: 'profile' | 'commercial_profile';
  profileId: string | null;
  commercialProfileId: string | null;
  identityId: string | null;
  displayName: string;
  avatarFileId: string | null;
  avatarUrl: string | null;
  followId: string | null;
  followState: 'pending' | 'accepted' | 'rejected' | null;
  isAvailable: boolean;
  verified: boolean;
  occupation: string | null;
  location: string | null;
};

export type FollowConfirmation = {
  person: UnifiedPerson;
  action: 'cancel_pending' | 'unfollow';
};

export function getActorKey(
  actorType: 'profile' | 'commercial_profile',
  profileId: string | null,
  commercialProfileId: string | null,
): string | null {
  if (actorType === 'profile' && profileId) {
    return `profile:${profileId}`;
  }

  if (
    actorType === 'commercial_profile'
    && commercialProfileId
  ) {
    return `commercial_profile:${commercialProfileId}`;
  }

  return null;
}

export function getDiscoveredPersonProfileHref(
  person: UnifiedPerson,
): Href | null {
  if (
    person.actorType === 'commercial_profile'
    && person.commercialProfileId
  ) {
    return buddyServicesPublicProfileRoute(
      person.commercialProfileId,
    );
  }

  if (person.identityId) {
    return {
      pathname: '/(main)/contacts/detail',
      params: {
        id: person.identityId,
        displayName: person.displayName,
        ...(person.avatarUrl
          ? { avatarUrl: person.avatarUrl }
          : {}),
      },
    };
  }

  return null;
}

export function canOpenDiscoveredPersonProfile(
  person: UnifiedPerson,
): boolean {
  return getDiscoveredPersonProfileHref(person) !== null;
}

export function getStatusFollowTargetProfileHref(
  target: StatusFollowTarget,
  resolvedAvatarUrl?: string | null,
): Href | null {
  if (
    target.actor_type === 'commercial_profile'
    && target.commercial_profile_id
  ) {
    return buddyServicesPublicProfileRoute(
      target.commercial_profile_id,
    );
  }

  const contactId = target.profile_id?.trim() || null;

  if (contactId) {
    const avatarUrl = (
      resolvedAvatarUrl?.trim()
      || target.avatar_url?.trim()
      || null
    );

    return {
      pathname: '/(main)/contacts/detail',
      params: {
        id: contactId,
        displayName: target.display_name,
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    };
  }

  if (target.commercial_profile_id) {
    return buddyServicesPublicProfileRoute(
      target.commercial_profile_id,
    );
  }

  return null;
}

export function canOpenStatusFollowTargetProfile(
  target: StatusFollowTarget,
): boolean {
  return getStatusFollowTargetProfileHref(target) !== null;
}

export function getFollowLabel(
  followState: UnifiedPerson['followState'],
): string {
  if (followState === 'accepted') {
    return 'Siguiendo';
  }

  if (followState === 'pending') {
    return 'Esperando aprobación';
  }

  return 'Seguir';
}

export function getFollowConfirmation(
  person: UnifiedPerson,
): FollowConfirmation | null {
  if (!person.followId) {
    return null;
  }

  if (person.followState === 'accepted') {
    return {
      person,
      action: 'unfollow',
    };
  }

  if (person.followState === 'pending') {
    return {
      person,
      action: 'cancel_pending',
    };
  }

  return null;
}

export function mapSocialTarget(
  target: StatusFollowDiscoverItem,
): UnifiedPerson | null {
  const key = getActorKey(
    target.actor_type,
    target.profile_id,
    target.commercial_profile_id,
  );

  if (!key) {
    return null;
  }

  return {
    key,
    actorType: target.actor_type,
    profileId: target.profile_id,
    commercialProfileId: target.commercial_profile_id,
    identityId: target.identity_id,
    displayName: target.display_name,
    avatarFileId: target.avatar_file_id,
    avatarUrl: target.avatar_url,
    followId: target.follow_id,
    followState: target.follow_state,
    isAvailable: true,
    verified: false,
    occupation: null,
    location: null,
  };
}
