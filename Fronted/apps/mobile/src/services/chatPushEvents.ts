import type {
  ChatConversationRealtimePatch,
  ChatMessage,
  ChatPushNotificationData,
  ChatRealtimeEvent,
  ChatRealtimeEventType,
} from '@beeapp/shared-types';

const CHAT_EVENT_TYPES = new Set<ChatRealtimeEventType>([
  'chat.message.created',
  'chat.message.updated',
  'chat.message.deleted',
  'chat.conversation.updated',
  'chat.participant.added',
  'chat.participant.removed',
  'chat.participant.left',
  'chat.read.updated',
]);

function asRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (
    value
    && typeof value === 'object'
    && !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return null;
}

function asNonEmptyString(
  value: unknown,
): string | null {
  const normalized = String(value || '').trim();

  return normalized || null;
}

function asPositiveNumber(
  value: unknown,
): number | undefined {
  const numericValue = Number(value);

  return (
    Number.isFinite(numericValue)
    && numericValue > 0
  )
    ? numericValue
    : undefined;
}

function toChatMessage(
  value: unknown,
  conversationId: string,
): ChatMessage | null {
  const source = asRecord(value);

  if (!source) {
    return null;
  }

  const id = asNonEmptyString(source.id);
  const createdAt = asNonEmptyString(source.created_at);

  if (!id || !createdAt) {
    return null;
  }

  const rawAttachments = Array.isArray(source.attachments)
    ? source.attachments
    : [];

  return {
    id,
    conversation_id: (
      asNonEmptyString(source.conversation_id)
      || conversationId
    ),
    sender_id: asNonEmptyString(source.sender_id),
    sequence_number: asPositiveNumber(
      source.sequence_number,
    ),
    message_type: (
      source.message_type === 'image'
      || source.message_type === 'file'
      || source.message_type === 'audio'
      || source.message_type === 'system'
        ? source.message_type
        : 'text'
    ),
    content: String(source.content || ''),
    status: (
      source.status === 'delivered'
      || source.status === 'read'
      || source.status === 'failed'
        ? source.status
        : 'sent'
    ),
    created_at: createdAt,
    updated_at: asNonEmptyString(source.updated_at)
      || undefined,
    edited_at: asNonEmptyString(source.edited_at),
    deleted_at: asNonEmptyString(source.deleted_at),
    destroyed_at: asNonEmptyString(source.destroyed_at),
    reply_to_id: asNonEmptyString(source.reply_to_id),
    reply_to: source.reply_to
      ? source.reply_to as ChatMessage['reply_to']
      : null,
    attachments: rawAttachments as ChatMessage['attachments'],
    sender: source.sender
      ? source.sender as ChatMessage['sender']
      : null,
    is_pinned: Boolean(source.is_pinned),
    pinned_at: asNonEmptyString(source.pinned_at),
    is_sent_by_ai: Boolean(source.is_sent_by_ai),
  };
}

function toConversationPatch(
  value: unknown,
  conversationId: string,
): ChatConversationRealtimePatch | null {
  const source = asRecord(value);

  if (!source) {
    return null;
  }

  const id = (
    asNonEmptyString(source.id)
    || conversationId
  );

  if (!id) {
    return null;
  }

  const unreadCount = Number(source.unread_count);

  return {
    id,
    last_message_at: (
      asNonEmptyString(source.last_message_at)
      || null
    ),
    unread_count: Number.isFinite(unreadCount)
      ? Math.max(0, unreadCount)
      : undefined,
    updated_at: asNonEmptyString(source.updated_at)
      || undefined,
  };
}

export function parseChatPushEvent(
  data: Record<string, unknown>,
): ChatRealtimeEvent | null {
  const source = data as ChatPushNotificationData;

  const module = asNonEmptyString(source.module);
  const type = (
    asNonEmptyString(source.event_type)
    || asNonEmptyString(source.type)
  );

  if (
    module !== 'chat'
    || !type
    || !CHAT_EVENT_TYPES.has(type as ChatRealtimeEventType)
  ) {
    return null;
  }

  const conversationId = asNonEmptyString(
    source.conversation_id,
  );

  if (!conversationId) {
    return null;
  }

  const eventType = type as ChatRealtimeEventType;
  const occurredAt = (
    asNonEmptyString(source.occurred_at)
    || new Date().toISOString()
  );

  const eventId = (
    asNonEmptyString(source.event_id)
    || [
      eventType,
      conversationId,
      asNonEmptyString(source.message_id) || '',
      occurredAt,
    ].join(':')
  );

  const message = toChatMessage(
    source.message,
    conversationId,
  );

  const conversationPatch = toConversationPatch(
    source.conversation_patch,
    conversationId,
  );

  if (
    eventType === 'chat.message.created'
    || eventType === 'chat.message.updated'
  ) {
    if (!message) {
      return null;
    }

    return {
      event_id: eventId,
      event_type: eventType,
      version: 1,
      occurred_at: occurredAt,
      payload: {
        conversation_id: conversationId,
        message,
        conversation_patch: conversationPatch,
      },
    };
  }

  if (eventType === 'chat.message.deleted') {
    const messageId = asNonEmptyString(source.message_id);

    if (!messageId) {
      return null;
    }

    return {
      event_id: eventId,
      event_type: eventType,
      version: 1,
      occurred_at: occurredAt,
      payload: {
        conversation_id: conversationId,
        message_id: messageId,
        deleted_at: occurredAt,
        conversation_patch: conversationPatch,
      },
    };
  }

  return null;
}

export function getChatPushConversationId(
  data: Record<string, unknown>,
): string | null {
  const parsedEvent = parseChatPushEvent(data);

  if (parsedEvent) {
    const payload = parsedEvent.payload;

    if ('conversation_id' in payload) {
      return payload.conversation_id;
    }
  }

  const source = data as ChatPushNotificationData;

  if (
    asNonEmptyString(source.module) !== 'chat'
    && asNonEmptyString(source.type) !== 'chat_message'
  ) {
    return null;
  }

  return asNonEmptyString(source.conversation_id);
}
