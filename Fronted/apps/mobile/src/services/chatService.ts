import type {
  ChatConversation,
  ChatMessage,
  ChatMessageStatus,
  ChatMessageType,
  ChatParticipant,
  ChatProfileSummary,
  ChatSearchUser,
} from '@beeapp/shared-types';

export type ChatListStatus =
  | 'sent'
  | 'delivered'
  | 'read';

export interface ChatListItemModel {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isGroup: boolean;
  status: ChatListStatus;
  online: boolean;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  isProtected: boolean;
  isAI: boolean;
  verified: boolean;
  avatarUrl: string | null;
  participantCount: number;
  participants: ChatParticipant[];
  raw: ChatConversation;
}

export interface ChatMessageModel {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderName?: string;
  senderVerified?: boolean;
  isUser: boolean;
  isAI: boolean;
  sentByAi: boolean;
  type: 'text' | 'image' | 'file' | 'audio';
  text?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioDuration?: string;
  status: ChatListStatus;
  time: string;
  createdAt: string;
  replyTo?: {
    id: string;
    sender: string;
    text: string;
  };
  isPinned: boolean;
  isEdited: boolean;
  isDestroyed: boolean;
  attachments: NonNullable<ChatMessage['attachments']>;
  raw: ChatMessage;
}

export interface ChatUserOption {
  id: string;
  name: string;
  email: string | null;
  occupation: string | null;
  location: string | null;
  initials: string;
  verified: boolean;
  online: boolean;
  avatarUrl: string | null;
}

function fullName(
  profile: ChatProfileSummary | ChatSearchUser | null | undefined,
): string {
  const value = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return value || 'Usuario Buddy';
}

export function getInitials(
  value: string,
): string {
  const initials = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  return initials || '?';
}

export function formatChatTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();

  const isToday = (
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  );

  if (isToday) {
    return date.toLocaleTimeString(
      'es-CO',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  }

  const yesterday = new Date(now);

  yesterday.setDate(now.getDate() - 1);

  const isYesterday = (
    date.getFullYear() === yesterday.getFullYear()
    && date.getMonth() === yesterday.getMonth()
    && date.getDate() === yesterday.getDate()
  );

  if (isYesterday) {
    return 'Ayer';
  }

  return date.toLocaleDateString(
    'es-CO',
    {
      day: '2-digit',
      month: 'short',
    },
  );
}

function toUiMessageType(
  messageType: ChatMessageType,
): ChatMessageModel['type'] {
  if (messageType === 'image') {
    return 'image';
  }

  if (messageType === 'file') {
    return 'file';
  }

  if (messageType === 'audio') {
    return 'audio';
  }

  return 'text';
}

function toUiStatus(
  status: ChatMessageStatus,
): ChatListStatus {
  if (status === 'read') {
    return 'read';
  }

  if (status === 'delivered') {
    return 'delivered';
  }

  return 'sent';
}

function formatBytes(
  value: number | null | undefined,
): string | undefined {
  if (
    value === null
    || value === undefined
    || !Number.isFinite(value)
    || value < 0
  ) {
    return undefined;
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAudioDuration(
  seconds: number | null | undefined,
): string | undefined {
  if (
    seconds === null
    || seconds === undefined
    || !Number.isFinite(seconds)
    || seconds < 0
  ) {
    return undefined;
  }

  const wholeSeconds = Math.round(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getDirectProfile(
  conversation: ChatConversation,
  currentUserId: string,
): ChatProfileSummary | null {
  const directParticipant = conversation.participants?.find(
    (participant) => (
      participant.user?.id !== currentUserId
      && participant.user_id !== currentUserId
    ),
  );

  if (directParticipant?.user) {
    return directParticipant.user;
  }

  return conversation.direct_profile || null;
}

export function mapConversationToListItem(
  conversation: ChatConversation,
  currentUserId: string,
  isProtected = false,
): ChatListItemModel {
  const isGroup = conversation.conversation_type === 'group';
  const isAI = (
    conversation.conversation_type === 'ai'
    || Boolean(conversation.is_ai)
  );

  const directProfile = getDirectProfile(
    conversation,
    currentUserId,
  );

  const displayName = (
    conversation.name?.trim()
    || (isAI ? 'Bee' : fullName(directProfile))
  );

  const lastMessage = conversation.last_message;
  const lastMessageContent = (
    lastMessage?.content?.trim()
    || (
      lastMessage?.message_type === 'image'
        ? '📷 Imagen'
        : lastMessage?.message_type === 'audio'
          ? '🎙️ Nota de voz'
          : lastMessage?.message_type === 'file'
            ? '📎 Archivo'
            : 'Aún no hay mensajes'
    )
  );

  const lastMessageSenderName = lastMessage?.sender
    ? fullName(lastMessage.sender)
    : '';

  const lastMessageIsCurrentUser = Boolean(
    lastMessage?.sender_id
    && lastMessage.sender_id === currentUserId,
  );

  const lastMessageText = (
    isGroup
    && lastMessage?.id
    && lastMessageSenderName
      ? (
          `${lastMessageIsCurrentUser ? 'Tú' : lastMessageSenderName}: `
          + lastMessageContent
        )
      : lastMessageContent
  );

  return {
    id: conversation.id,
    name: displayName,
    lastMessage: lastMessageText,
    time: formatChatTime(
      conversation.last_message_at
      || lastMessage?.created_at
      || conversation.updated_at,
    ),
    unreadCount: conversation.unread_count || 0,
    isGroup,
    status: toUiStatus(
      lastMessage?.status || 'sent',
    ),
    online: Boolean(directProfile?.is_online),
    isPinned: Boolean(conversation.is_pinned),
    isMuted: Boolean(conversation.is_muted),
    isArchived: Boolean(conversation.is_archived),
    isProtected,
    isAI,
    verified: Boolean(directProfile?.is_verified),
    avatarUrl: (
      conversation.avatar_url
      || directProfile?.avatar_url
      || null
    ),
    participantCount: conversation.participants?.length || 0,
    participants: conversation.participants || [],
    raw: conversation,
  };
}

export function mapChatMessageToModel(
  message: ChatMessage,
  currentUserId: string,
  options: {
    conversationIsAi?: boolean;
  } = {},
): ChatMessageModel {
  const attachments = message.attachments || [];
  const firstAttachment = attachments[0];

  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    senderName: message.sender
      ? fullName(message.sender)
      : undefined,
    senderVerified: Boolean(message.sender?.is_verified),
    isUser: (
      Boolean(message.sender_id)
      && message.sender_id === currentUserId
    ),
    isAI: Boolean(options.conversationIsAi),
    sentByAi: Boolean(message.is_sent_by_ai),
    type: toUiMessageType(message.message_type),
    text: message.content || undefined,
    mediaUrl: (
      firstAttachment?.url
      || firstAttachment?.thumbnail_url
      || undefined
    ),
    fileName: firstAttachment?.name,
    fileSize: formatBytes(firstAttachment?.size_bytes),
    audioDuration: formatAudioDuration(
      firstAttachment?.duration_seconds,
    ),
    status: toUiStatus(message.status),
    time: formatChatTime(message.created_at),
    createdAt: message.created_at,
    replyTo: message.reply_to
      ? {
          id: message.reply_to.id,
          sender: message.reply_to.sender_name,
          text: message.reply_to.content,
        }
      : undefined,
    isPinned: Boolean(message.is_pinned),
    isEdited: Boolean(message.edited_at),
    isDestroyed: Boolean(
      message.destroyed_at
      || message.deleted_at,
    ),
    attachments,
    raw: message,
  };
}

export function mapChatSearchUser(
  user: ChatSearchUser,
): ChatUserOption {
  const name = fullName(user);

  return {
    id: user.id,
    name,
    email: user.email,
    occupation: user.occupation || null,
    location: user.location || null,
    initials: getInitials(name),
    verified: Boolean(user.is_verified),
    online: Boolean(user.is_online),
    avatarUrl: user.avatar_url || null,
  };
}