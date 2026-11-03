import {
  getStatusFollowers,
  getStatusFollowing,
} from '@beeapp/api-client';
import type {
  StatusFollowListItem,
} from '@beeapp/shared-types';

import {
  colorFromSeed,
  getInitials,
  type CalendarUserOption,
} from './calendarService';
import {
  getValidSessionCredentials,
} from './authSession';

const MUTUAL_LIST_LIMIT = 100;

export type CalendarMutualInviteContacts = {
  contacts: CalendarUserOption[];
  mutualIds: Set<string>;
};

function mapFollowItemToCalendarOption(
  item: StatusFollowListItem,
): CalendarUserOption | null {
  const profileId = item.target.profile_id;

  if (!profileId) {
    return null;
  }

  const name = item.target.display_name.trim()
    || 'Usuario Buddy';

  return {
    id: profileId,
    name,
    email: null,
    phone: null,
    initials: getInitials(name),
    color: colorFromSeed(profileId),
  };
}

export async function loadCalendarMutualInviteContacts(): Promise<
  CalendarMutualInviteContacts
> {
  const auth = await getValidSessionCredentials();

  if (!auth) {
    return {
      contacts: [],
      mutualIds: new Set(),
    };
  }

  const [
    followingResponse,
    followersResponse,
  ] = await Promise.all([
    getStatusFollowing(auth, {
      actor_type: 'profile',
      limit: MUTUAL_LIST_LIMIT,
    }),
    getStatusFollowers(auth, {
      actor_type: 'profile',
      limit: MUTUAL_LIST_LIMIT,
    }),
  ]);

  const followingIds = new Set(
    followingResponse.items
      .filter((item) => item.state === 'accepted')
      .map((item) => item.target.profile_id)
      .filter((id): id is string => Boolean(id)),
  );

  const mutualItems = followersResponse.items.filter(
    (item) => (
      item.state === 'accepted'
      && item.target.profile_id
      && followingIds.has(item.target.profile_id)
    ),
  );

  const contacts: CalendarUserOption[] = [];
  const mutualIds = new Set<string>();
  const seenIds = new Set<string>();

  mutualItems.forEach((item) => {
    const option = mapFollowItemToCalendarOption(item);

    if (!option || seenIds.has(option.id)) {
      return;
    }

    seenIds.add(option.id);
    mutualIds.add(option.id);
    contacts.push(option);
  });

  contacts.sort((left, right) =>
    left.name.localeCompare(right.name, 'es'),
  );

  return {
    contacts,
    mutualIds,
  };
}

export function filterCalendarUsersByMutualFollow(
  users: CalendarUserOption[],
  mutualIds: Set<string>,
): CalendarUserOption[] {
  if (mutualIds.size === 0) {
    return [];
  }

  return users.filter((user) => mutualIds.has(user.id));
}
