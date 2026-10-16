import type { AssistantCard } from '@beeapp/shared-types';

/** Id del chat del asistente (paridad con móvil y gateway). */
export const ASSISTANT_CHAT_ID = 'assistant';
/** @deprecated Usar ASSISTANT_CHAT_ID */
export const AI_CHAT_ID = ASSISTANT_CHAT_ID;
export const AI_ASSISTANT_NAME = 'Buddy AI';

export interface GroupMember {
  id: string;
  name: string;
  role: 'admin' | 'member';
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
}

export interface ChatMessage {
  id: string;
  senderName?: string;
  senderVerified?: boolean;
  isUser: boolean;
  type: 'text' | 'image' | 'file' | 'audio';
  text?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioDuration?: string;
  status: 'sent' | 'delivered' | 'read';
  time: string;
  replyTo?: {
    sender: string;
    text: string;
  };
  showCatalog?: boolean;
  sentByAi?: boolean;
  isPinned?: boolean;
  isEdited?: boolean;
  isDestroyed?: boolean;
  assistantCards?: AssistantCard[];
}
