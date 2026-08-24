import type {
  AuthCredentials,
  ChatConversation,
  ChatMessage,
  ChatParticipant,
  ChatSearchUser,
} from '@beeapp/shared-types';

import {
  api,
} from './client';

export interface ChatApiIdentity {
  id: string;
  identity_type: 'profile' | 'commercial_profile';
  profile_id: string | null;
  commercial_profile_id: string | null;
  display_name: string;
  avatar_file_id: string | null;
  is_active: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatApiIdentitySummary {
  id: string;
  identity_type: 'profile' | 'commercial_profile' | null;
  profile_id: string | null;
  commercial_profile_id: string | null;
  display_name: string;
  avatar_file_id: string | null;
  is_active: boolean;
  is_available: boolean;
}

export interface ChatApiParticipant {
  id: string;
  conversation_id: string;
  identity_id: string;
  role: 'owner' | 'admin' | 'member' | string;
  joined_at: string;
  left_at: string | null;
  removed_at: string | null;
  cleared_at: string | null;
  unread_count: number;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
  identity: ChatApiIdentitySummary;
}

export interface ChatApiInboxConversation {
  conversation_id: string;
  conversation_type: 'direct' | 'group';
  group_name: string | null;
  group_description: string | null;
  group_image_file_id: string | null;
  other_identity_id: string | null;
  other_identity_type: 'profile' | 'commercial_profile' | null;
  other_profile_id: string | null;
  other_commercial_profile_id: string | null;
  other_display_name: string | null;
  other_logo_file_id: string | null;
  last_message_id: string | null;
  last_message_type: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  last_message_sender_identity_id: string | null;
  unread_count: number;
  last_read_message_id: string | null;
  last_read_at: string | null;
  notifications_enabled: boolean;
  cleared_at: string | null;
}

export interface ChatApiConversation {
  id: string;
  conversation_type: 'direct' | 'group';
  direct_key: string | null;
  created_by_identity_id: string | null;
  posting_identity_id: string | null;
  name: string | null;
  description: string | null;
  image_file_id: string | null;
  last_message_id: string | null;
  last_message_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  participants?: ChatApiParticipant[];
}

export interface ChatApiAttachment {
  id: string;
  owner_id?: string;
  original_name?: string | null;
  display_name?: string | null;
  extension?: string | null;
  mime_type?: string | null;
  kind?: string | null;
  size_bytes?: number | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ChatApiMessage {
  id: string;
  conversation_id: string;
  sender_identity_id: string;
  sender_user_id: string | null;
  message_type: string;
  body: string | null;
  attachment_file_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  sequence_number: number;
  created_at: string;
  sender_identity?: ChatApiIdentitySummary | null;
  attachment?: ChatApiAttachment | null;
  reactions?: unknown[];
}

export interface ChatBootstrapResponse {
  identities: ChatApiIdentity[];
}

export interface ChatIdentitiesResponse {
  identities: ChatApiIdentity[];
}

export interface ChatInboxResponse {
  identity_id: string;
  conversations: ChatApiInboxConversation[];
  limit: number;
  next_before_last_message_at: string | null;
}

export interface ChatRecipientSearchResponse {
  query: string;
  limit: number;
  results: Array<{
    identity_id: string;
    identity_type: 'profile' | 'commercial_profile';
    profile_id: string | null;
    commercial_profile_id: string | null;
    display_name: string;
    avatar_file_id: string | null;
    is_available: boolean;
  }>;
}

export interface ChatApiMessagesResponse {
  conversation_id: string;
  messages: ChatApiMessage[];
  limit: number;
  next_before_sequence: number | null;
}

function buildQuery(
  params: Record<
    string,
    string | number | boolean | null | undefined
  >,
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined
      || value === null
      || value === ''
      || value === false
    ) {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();

  return query
    ? `?${query}`
    : '';
}

function requireBearerAuth(
  auth: AuthCredentials,
): AuthCredentials {
  if (
    auth.scheme !== 'Bearer'
    || !auth.token?.trim()
  ) {
    throw new Error(
      'Chat requiere una sesión iniciada con correo y contraseña. '
      + 'Cierra sesión e ingresa nuevamente con correo.',
    );
  }

  return auth;
}

function conversationPath(
  conversationId: string,
): string {
  return `/chat/conversations/${encodeURIComponent(
    conversationId,
  )}/`;
}

function splitIdentityDisplayName(
  displayName: string | null | undefined,
): {
  firstName: string;
  lastName: string;
} {
  const parts = String(displayName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: 'Usuario BeeApp',
      lastName: '',
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function toSharedParticipant(
  participant: ChatApiParticipant,
): ChatParticipant {
  const identity = participant.identity;

  const {
    firstName,
    lastName,
  } = splitIdentityDisplayName(
    identity?.display_name,
  );

  return {
    id: participant.id,
    conversation_id: participant.conversation_id,
    user_id: (
      identity?.profile_id
      || participant.identity_id
    ),
    role: (
      participant.role === 'owner'
      || participant.role === 'admin'
        ? participant.role
        : 'member'
    ),
    joined_at: participant.joined_at,
    left_at: participant.left_at,
    user: {
      id: identity?.profile_id || participant.identity_id,
      first_name: firstName,
      last_name: lastName,
      avatar_url: null,
      is_verified: false,
      is_online: false,
    },
  };
}

function toSharedMessage(
  message: ChatApiMessage,
): ChatMessage {
  const attachment = message.attachment;

  const {
    firstName,
    lastName,
  } = splitIdentityDisplayName(
    message.sender_identity?.display_name,
  );

  return {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_id: (
      message.sender_user_id
      || message.sender_identity?.profile_id
      || message.sender_identity_id
    ),
    message_type: (
      message.message_type === 'image'
      || message.message_type === 'audio'
        ? message.message_type
        : message.message_type === 'document'
        || message.message_type === 'video'
          ? 'file'
          : 'text'
    ),
    content: message.body || '',
    status: 'sent',
    created_at: message.created_at,
    attachments: attachment
      ? [
          {
            id: attachment.id,
            file_id: attachment.id,
            name: (
              attachment.display_name
              || attachment.original_name
              || 'Archivo adjunto'
            ),
            mime_type: attachment.mime_type || null,
            size_bytes: attachment.size_bytes || null,
            url: null,
            thumbnail_url: null,
            duration_seconds: null,
          },
        ]
      : [],
    sender: {
      id: (
        message.sender_user_id
        || message.sender_identity?.profile_id
        || message.sender_identity_id
      ),
      first_name: firstName,
      last_name: lastName,
      avatar_url: null,
      is_verified: false,
      is_online: false,
    },
    is_pinned: false,
    is_sent_by_ai: false,
  };
}

function toSharedConversation(
  conversation: ChatApiConversation,
): ChatConversation {
  const participants = (
    conversation.participants || []
  ).map(toSharedParticipant);

  return {
    id: conversation.id,
    conversation_type: conversation.conversation_type,
    name: conversation.name,
    description: conversation.description,
    avatar_url: null,
    created_by_id: (
      conversation.created_by_identity_id
      || null
    ),
    created_by_identity_id: conversation.created_by_identity_id,
    posting_identity_id: conversation.posting_identity_id,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    last_message_at: conversation.last_message_at,
    participants,
    unread_count: 0,
    is_pinned: false,
    is_muted: false,
    is_archived: false,
    is_protected: false,
    is_ai: false,
    direct_profile: null,
  };
}


function toSharedInboxConversation(
  conversation: ChatApiInboxConversation,
): ChatConversation {
  const {
    firstName,
    lastName,
  } = splitIdentityDisplayName(
    conversation.other_display_name,
  );

  const otherParticipant: ChatParticipant | null = (
    conversation.conversation_type === 'direct'
    && conversation.other_identity_id
      ? {
          id: conversation.other_identity_id,
          conversation_id: conversation.conversation_id,
          user_id: (
            conversation.other_profile_id
            || conversation.other_identity_id
          ),
          role: 'member',
          joined_at: '',
          left_at: null,
          user: {
            id: (
              conversation.other_profile_id
              || conversation.other_identity_id
            ),
            first_name: firstName,
            last_name: lastName,
            avatar_url: null,
            is_verified: false,
            is_online: false,
          },
        }
      : null
  );

  const lastMessage: ChatMessage | null = (
    conversation.last_message_id
      ? {
          id: conversation.last_message_id,
          conversation_id: conversation.conversation_id,
          sender_id: conversation.last_message_sender_identity_id,
          message_type: (
            conversation.last_message_type === 'image'
            || conversation.last_message_type === 'audio'
              ? conversation.last_message_type
              : conversation.last_message_type === 'document'
              || conversation.last_message_type === 'video'
                ? 'file'
                : 'text'
          ),
          content: conversation.last_message_preview || '',
          status: 'sent',
          created_at: conversation.last_message_at || '',
          attachments: [],
          sender: null,
          is_pinned: false,
          is_sent_by_ai: false,
        }
      : null
  );

  return {
    id: conversation.conversation_id,
    conversation_type: conversation.conversation_type,
    name: (
      conversation.conversation_type === 'group'
        ? conversation.group_name
        : null
    ),
    description: (
      conversation.conversation_type === 'group'
        ? conversation.group_description
        : null
    ),
    avatar_url: null,
    created_by_id: null,
    created_at: conversation.last_message_at || '',
    updated_at: conversation.last_message_at || '',
    last_message_at: conversation.last_message_at,
    last_message: lastMessage,
    participants: otherParticipant
      ? [otherParticipant]
      : [],
    unread_count: conversation.unread_count || 0,
    is_pinned: false,
    is_muted: !conversation.notifications_enabled,
    is_archived: false,
    is_protected: false,
    is_ai: false,
    direct_profile: otherParticipant?.user || null,
  };
}

export function bootstrapChat(
  auth: AuthCredentials,
): Promise<ChatBootstrapResponse> {
  return api.post<ChatBootstrapResponse>(
    '/chat/bootstrap/',
    {},
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export function getChatIdentities(
  auth: AuthCredentials,
): Promise<ChatIdentitiesResponse> {
  return api.get<ChatIdentitiesResponse>(
    '/chat/identities/?active_only=true',
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export async function getChatInbox(
  auth: AuthCredentials,
  identityId: string,
  options: {
    limit?: number;
    beforeLastMessageAt?: string | null;
  } = {},
): Promise<{
  identity_id: string;
  conversations: ChatConversation[];
  limit: number;
  next_before_last_message_at: string | null;
}> {
  const response = await api.get<ChatInboxResponse>(
    `/chat/inbox/${buildQuery({
      identity_id: identityId,
      limit: options.limit ?? 50,
      before_last_message_at: (
        options.beforeLastMessageAt
        || undefined
      ),
    })}`,
    {
      auth: requireBearerAuth(auth),
    },
  );


  return {
    ...response,
    conversations: response.conversations.map(
      toSharedInboxConversation,
    ),
  };
}

export async function searchChatRecipients(
  auth: AuthCredentials,
  query: string,
  limit = 20,
): Promise<{
  query: string;
  limit: number;
  users: ChatSearchUser[];
}> {
  const response = await api.get<ChatRecipientSearchResponse>(
    `/chat/recipients/search/${buildQuery({
      q: query.trim(),
      limit,
    })}`,
    {
      auth: requireBearerAuth(auth),
    },
  );

  return {
    query: response.query,
    limit: response.limit,
    users: response.results.map((recipient) => {
      const {
        firstName,
        lastName,
      } = splitIdentityDisplayName(
        recipient.display_name,
      );

      return {
        id: recipient.identity_id,
        first_name: firstName,
        last_name: lastName,
        email: null,
        occupation: null,
        location: null,
        avatar_url: null,
        is_verified: false,
        is_online: false,
      };
    }),
  };
}

export async function createDirectChatConversation(
  auth: AuthCredentials,
  payload: {
    sender_identity_id: string;
    recipient_identity_id: string;
  },
): Promise<{
  conversation: ChatConversation;
  created: boolean;
}> {
  const response = await api.post<{
    conversation: ChatApiConversation;
    created: boolean;
  }>(
    '/chat/direct-conversations/',
    payload,
    {
      auth: requireBearerAuth(auth),
    },
  );

  return {
    created: response.created,
    conversation: toSharedConversation(
      response.conversation,
    ),
  };
}

export async function getChatConversation(
  auth: AuthCredentials,
  conversationId: string,
): Promise<{
  conversation: ChatConversation;
}> {
  const response = await api.get<{
    conversation: ChatApiConversation;
  }>(
    `${conversationPath(conversationId)}?include_participants=true`,
    {
      auth: requireBearerAuth(auth),
    },
  );

  return {
    conversation: toSharedConversation(
      response.conversation,
    ),
  };
}

export async function getChatParticipants(
  auth: AuthCredentials,
  conversationId: string,
): Promise<{
  participants: ChatParticipant[];
}> {
  const response = await api.get<{
    participants: ChatApiParticipant[];
  }>(
    `${conversationPath(conversationId)}participants/`,
    {
      auth: requireBearerAuth(auth),
    },
  );

  return {
    participants: response.participants.map(
      toSharedParticipant,
    ),
  };
}

export async function getChatMessages(
  auth: AuthCredentials,
  conversationId: string,
  options: {
    limit?: number;
    beforeSequence?: number | null;
  } = {},
): Promise<{
  conversation_id: string;
  messages: ChatMessage[];
  limit: number;
  next_before_sequence: number | null;
}> {
  const response = await api.get<ChatApiMessagesResponse>(
    `${conversationPath(conversationId)}messages/${buildQuery({
      limit: options.limit ?? 50,
      before_sequence: (
        options.beforeSequence
        || undefined
      ),
    })}`,
    {
      auth: requireBearerAuth(auth),
    },
  );

  return {
    conversation_id: response.conversation_id,
    messages: response.messages.map(toSharedMessage),
    limit: response.limit,
    next_before_sequence: response.next_before_sequence,
  };
}

export async function sendChatMessage(
  auth: AuthCredentials,
  conversationId: string,
  payload: {
    sender_identity_id: string;
    body: string;
    message_type?: 'text';
  },
): Promise<{
  message: ChatMessage;
}> {
  const response = await api.post<{
    message: ChatApiMessage;
  }>(
    `${conversationPath(conversationId)}messages/`,
    {
      sender_identity_id: payload.sender_identity_id,
      message_type: payload.message_type || 'text',
      body: payload.body,
      metadata: {},
    },
    {
      auth: requireBearerAuth(auth),
    },
  );

  return {
    message: toSharedMessage(response.message),
  };
}