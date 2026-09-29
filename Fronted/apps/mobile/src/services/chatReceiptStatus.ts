import type {
  ChatMessage,
  ChatParticipant,
} from '@beeapp/shared-types';

export type ChatReceiptStatus =
  | 'sent'
  | 'delivered'
  | 'read';

export function getChatMessageReceiptStatus(
  message: ChatMessage,
  participants: ChatParticipant[],
  senderIdentityId: string,
  cursorSequenceByMessageId: Record<string, number>,
): ChatReceiptStatus {
  const sequence = message.sequence_number;

  if (
    !senderIdentityId
    || typeof sequence !== 'number'
    || !Number.isFinite(sequence)
  ) {
    return 'sent';
  }

  const recipients = participants.filter((participant) => (
    participant.identity_id !== senderIdentityId
    && participant.left_at == null
    && participant.removed_at == null
    && (
      !participant.joined_at
      || !message.created_at
      || (
        Number.isFinite(Date.parse(participant.joined_at))
        && Number.isFinite(Date.parse(message.created_at))
        && Date.parse(participant.joined_at)
          <= Date.parse(message.created_at)
      )
    )
  ));

  if (recipients.length === 0) {
    return 'sent';
  }

  const cursorSequence = (
    cursorId: string | null | undefined
  ): number => (
    cursorId
      ? cursorSequenceByMessageId[cursorId] || 0
      : 0
  );

  if (
    recipients.every((recipient) => (
      cursorSequence(recipient.last_read_message_id)
      >= sequence
    ))
  ) {
    return 'read';
  }

  if (
    recipients.every((recipient) => (
      Math.max(
        cursorSequence(recipient.last_delivered_message_id),
        cursorSequence(recipient.last_read_message_id),
      ) >= sequence
    ))
  ) {
    return 'delivered';
  }

  return 'sent';
}
