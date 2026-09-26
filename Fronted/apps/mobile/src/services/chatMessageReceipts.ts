import type {
  ChatMessage,
} from '@beeapp/shared-types';

export function getLatestIncomingChatMessage(
  messages: ChatMessage[],
  recipientIdentityId: string,
  recipientUserId: string,
): ChatMessage | null {
  const identityId = recipientIdentityId.trim();
  const userId = recipientUserId.trim();

  if (!identityId || !userId) {
    return null;
  }

  return messages.reduce<ChatMessage | null>(
    (latest, message) => {
      if (!message.id || message.message_type === 'system') {
        return latest;
      }

      if (message.sender_identity_id) {
        if (message.sender_identity_id === identityId) {
          return latest;
        }
      } else if (
        !message.sender_id
        || message.sender_id === userId
      ) {
        return latest;
      }

      if (!latest) {
        return message;
      }

      const messageSequence = message.sequence_number;
      const latestSequence = latest.sequence_number;

      if (
        typeof messageSequence === 'number'
        && typeof latestSequence === 'number'
      ) {
        return messageSequence > latestSequence
          ? message
          : latest;
      }

      return message.created_at > latest.created_at
        ? message
        : latest;
    },
    null,
  );
}
