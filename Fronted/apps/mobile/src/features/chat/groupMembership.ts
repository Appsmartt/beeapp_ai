import type {
  ChatParticipant,
} from '@beeapp/shared-types';

export function isConfirmedGroupMember(
  participant: ChatParticipant,
): boolean {
  if (participant.left_at || participant.removed_at) {
    return false;
  }

  const joinedAt = participant.joined_at?.trim();

  if (!joinedAt) {
    return false;
  }

  return Number.isFinite(Date.parse(joinedAt));
}

export function filterConfirmedGroupMembers(
  participants: ChatParticipant[],
): ChatParticipant[] {
  return participants.filter(isConfirmedGroupMember);
}
