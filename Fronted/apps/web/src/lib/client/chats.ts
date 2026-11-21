import type { AssistantCard } from '@beeapp/shared-types';

/** Id del chat del asistente (paridad con móvil y gateway). */
export const ASSISTANT_CHAT_ID = 'assistant';
/** @deprecated Usar ASSISTANT_CHAT_ID */
export const AI_CHAT_ID = ASSISTANT_CHAT_ID;
export const AI_ASSISTANT_NAME = 'Buddy AI';

export interface GroupMember {
  id: string;
  recipientIdentityId?: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  initials: string;
  color: string;
  isCurrentUser?: boolean;
}

export interface ChatCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface SellerChatProduct {
  name: string;
  businessName: string;
}

export interface ChatItem {
  id: string;
  name: string;
  avatarUrl?: string | null;
  description?: string | null;
  postingPolicy?: 'all_members' | 'admins_only';
  disappearingSeconds?: number | null;
  peerIdentityId?: string | null;
  lastSeenAt?: string | null;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isGroup: boolean;
  status: 'sent' | 'delivered' | 'read';
  online?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  verified?: boolean;
  isAI?: boolean;
  isProtected?: boolean;
  isArchived?: boolean;
  members?: GroupMember[];
  categoryIds?: string[];
  isSellerChat?: boolean;
  linkedProduct?: SellerChatProduct | null;
  postingIdentityId?: string;
  businessId?: string | null;
  commercialProfileId?: string | null;
}

export interface ChatMessage {
  id: string;
  senderName?: string;
  senderVerified?: boolean;
  isUser: boolean;
  type:
    | 'text'
    | 'image'
    | 'video'
    | 'file'
    | 'audio'
    | 'location'
    | 'contact'
    | 'status_reply'
    | 'call_notice';
  text?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioDuration?: string;
  status?: 'sent' | 'delivered' | 'read';
  time: string;
  createdAt?: string;
  dateLabel?: string;
  replyTo?: {
    id?: string;
    sender: string;
    text: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    label?: string;
  };
  contactCard?: {
    name: string;
    phone?: string;
    email?: string;
  };
  statusReply?: {
    statusId?: string;
    previewText?: string;
    mediaType?: string;
  };
  callNotice?: {
    callType: 'voice' | 'video';
    status: string;
    durationSeconds?: number | null;
  };
  showCatalog?: boolean;
  sentByAi?: boolean;
  isPinned?: boolean;
  isEdited?: boolean;
  isDestroyed?: boolean;
  assistantCards?: AssistantCard[];
  reactions?: Array<{ emoji: string; count: number; mine: boolean }>;
}
