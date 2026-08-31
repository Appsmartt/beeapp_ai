import type {
  AuthCredentials,
  ChatContactProfile,
  ChatConversation,
  ChatConversationPermissions,
  ChatGroupInvite,
  ChatGroupInviteStatus,
  ChatGroupPostingPolicy,
  ChatMessage,
  ChatParticipant,
  ChatParticipantRole,
  ChatSearchUser,
} from '@beeapp/shared-types';

import {
  api,
} from './client';

type ChatIdentityType =
  | 'profile'
  | 'commercial_profile';

export interface ChatApiIdentity {
  id: string;
  identity_type: ChatIdentityType;
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
  identity_type: ChatIdentityType | null;
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
  role: ChatParticipantRole;
  joined_at: string;
  left_at: string | null;
  removed_at: string | null;
  removed_by_identity_id: string | null;
  cleared_at: string | null;
  cleared_before_message_id: string | null;
  last_read_message_id: string | null;
  last_read_at: string | null;
  last_delivered_message_id: string | null;
  last_delivered_at: string | null;
  unread_count: number;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
  identity: ChatApiIdentitySummary;
}

export interface ChatApiConversationPermissions {
  own_role: ChatParticipantRole | null;
  is_active_participant: boolean;
  can_send_messages: boolean;
  can_invite_members: boolean;
  can_remove_members: boolean;
  can_promote_members: boolean;
  can_demote_admins: boolean;
  can_update_group: boolean;
  can_transfer_ownership: boolean;
  can_deactivate_group: boolean;
  can_leave_group: boolean;
}

export interface ChatApiInboxConversation {
  conversation_id: string;
  conversation_type: 'direct' | 'group';
  group_name: string | null;
  group_description: string | null;
  group_image_file_id: string | null;
  other_identity_id: string | null;
  other_identity_type: ChatIdentityType | null;
  other_profile_id: string | null;
  other_commercial_profile_id: string | null;
  other_display_name: string | null;
  other_logo_file_id: string | null;
  avatar_url: string | null;
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
  posting_policy: ChatGroupPostingPolicy | null;
  name: string | null;
  description: string | null;
  image_file_id: string | null;
  last_message_id: string | null;
  last_message_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  own_participant?: ChatApiParticipant | null;
  permissions?: ChatApiConversationPermissions | null;
  participants?: ChatApiParticipant[];
}

export interface ChatApiContactProfile {
  identity_id: string;
  identity_type: ChatIdentityType;
  profile_id: string | null;
  commercial_profile_id: string | null;
  display_name: string;
  occupation: string | null;
  location: string | null;
  social_links: Array<{
    platform: string;
    url: string;
  }>;
  avatar_file_id: string | null;
  is_available: boolean;
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
  url?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ChatApiReplyPreview {
  id: string;
  body: string | null;
  message_type?: string | null;
  sender_identity?: ChatApiIdentitySummary | null;
  sender_display_name?: string | null;
}

export interface ChatApiReaction {
  id: string;
  message_id: string;
  identity_id: string;
  emoji: string;
  created_at: string;
  identity?: ChatApiIdentitySummary | null;
}

export interface ChatApiMessage {
  id: string;
  conversation_id: string;
  sender_identity_id: string | null;
  sender_user_id: string | null;
  message_type: string;
  body: string | null;
  attachment_file_id: string | null;
  attachment_file_ids?: string[];
  reference_type: string | null;
  reference_id: string | null;
  reply_to_message_id?: string | null;
  metadata: Record<string, unknown>;
  sequence_number: number;
  created_at: string;
  updated_at?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  destroyed_at?: string | null;
  is_pinned?: boolean;
  pinned_at?: string | null;
  sender_identity?: ChatApiIdentitySummary | null;
  attachment?: ChatApiAttachment | null;
  attachments?: ChatApiAttachment[];
  reply_to?: ChatApiReplyPreview | null;
  reactions?: ChatApiReaction[];
}

export interface ChatApiGroupInvite {
  id: string;
  conversation_id: string;
  invited_identity_id: string;
  invited_by_identity_id: string;
  status: ChatGroupInviteStatus;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  conversation?: ChatApiConversation | null;
  invited_identity?: ChatApiIdentitySummary | null;
  invited_by_identity?: ChatApiIdentitySummary | null;
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
    identity_type: ChatIdentityType;
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

interface ChatContactProfileResponse {
  contact: ChatApiContactProfile;
}

interface ChatGroupInvitesResponse {
  invites: ChatApiGroupInvite[];
  count: number;
  limit: number;
  offset: number;
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

function groupPath(
  conversationId: string,
): string {
  return `/chat/groups/${encodeURIComponent(
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
    identity_id: participant.identity_id,
    user_id: (
      identity?.profile_id
      || participant.identity_id
    ),
    role: participant.role,
    joined_at: participant.joined_at,
    left_at: participant.left_at,
    removed_at: participant.removed_at,
    removed_by_identity_id: (
      participant.removed_by_identity_id
    ),
    cleared_at: participant.cleared_at,
    cleared_before_message_id: (
      participant.cleared_before_message_id
    ),
    last_read_message_id: participant.last_read_message_id,
    last_read_at: participant.last_read_at,
    last_delivered_message_id: (
      participant.last_delivered_message_id
    ),
    last_delivered_at: participant.last_delivered_at,
    unread_count: participant.unread_count,
    notifications_enabled: (
      participant.notifications_enabled
    ),
    created_at: participant.created_at,
    updated_at: participant.updated_at,
    user: {
      id: (
        identity?.profile_id
        || participant.identity_id
      ),
      first_name: firstName,
      last_name: lastName,
      avatar_url: null,
      is_verified: false,
      is_online: false,
    },
  };
}

function toSharedPermissions(
  permissions: ChatApiConversationPermissions | null | undefined,
): ChatConversationPermissions | null {
  if (!permissions) {
    return null;
  }

  return {
    own_role: permissions.own_role,
    is_active_participant: Boolean(
      permissions.is_active_participant,
    ),
    can_send_messages: Boolean(
      permissions.can_send_messages,
    ),
    can_invite_members: Boolean(
      permissions.can_invite_members,
    ),
    can_remove_members: Boolean(
      permissions.can_remove_members,
    ),
    can_promote_members: Boolean(
      permissions.can_promote_members,
    ),
    can_demote_admins: Boolean(
      permissions.can_demote_admins,
    ),
    can_update_group: Boolean(
      permissions.can_update_group,
    ),
    can_transfer_ownership: Boolean(
      permissions.can_transfer_ownership,
    ),
    can_deactivate_group: Boolean(
      permissions.can_deactivate_group,
    ),
    can_leave_group: Boolean(
      permissions.can_leave_group,
    ),
  };
}

function toSharedMessage(
  message: ChatApiMessage,
): ChatMessage {
  const attachments = (
    message.attachments?.length
      ? message.attachments
      : message.attachment
        ? [message.attachment]
        : []
  );

  const {
    firstName,
    lastName,
  } = splitIdentityDisplayName(
    message.sender_identity?.display_name,
  );

  const messageType = (
    message.message_type === 'image'
    || message.message_type === 'audio'
      ? message.message_type
      : message.message_type === 'document'
      || message.message_type === 'video'
        ? 'file'
        : 'text'
  );

  return {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_id: (
      message.sender_user_id
      || message.sender_identity?.profile_id
      || message.sender_identity_id
      || null
    ),
    sequence_number: message.sequence_number,
    message_type: messageType,
    content: message.body || '',
    status: 'sent',
    created_at: message.created_at,
    updated_at: message.updated_at || undefined,
    edited_at: message.edited_at || null,
    deleted_at: message.deleted_at || null,
    destroyed_at: message.destroyed_at || null,
    reply_to_id: (
      message.reply_to_message_id
      || message.reference_id
      || null
    ),
    reply_to: message.reply_to
      ? {
          id: message.reply_to.id,
          sender_name: (
            message.reply_to.sender_display_name
            || message.reply_to.sender_identity?.display_name
            || 'Usuario Buddy'
          ),
          content: message.reply_to.body || '',
          message_type: (
            message.reply_to.message_type === 'image'
            || message.reply_to.message_type === 'audio'
              ? message.reply_to.message_type
              : message.reply_to.message_type === 'document'
              || message.reply_to.message_type === 'video'
                ? 'file'
                : 'text'
          ),
        }
      : null,
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      file_id: attachment.id,
      name: (
        attachment.display_name
        || attachment.original_name
        || 'Archivo adjunto'
      ),
      mime_type: attachment.mime_type || null,
      size_bytes: attachment.size_bytes || null,
      url: attachment.url || null,
      thumbnail_url: attachment.thumbnail_url || null,
      duration_seconds: attachment.duration_seconds || null,
    })),
    sender: message.sender_identity
      ? {
          id: (
            message.sender_user_id
            || message.sender_identity.profile_id
            || message.sender_identity.id
          ),
          first_name: firstName,
          last_name: lastName,
          avatar_url: null,
          is_verified: false,
          is_online: false,
        }
      : null,
    is_pinned: Boolean(message.is_pinned),
    pinned_at: message.pinned_at || null,
    is_sent_by_ai: false,
  };
}

function toSharedConversation(
  conversation: ChatApiConversation,
): ChatConversation {
  const participants = (
    conversation.participants || []
  ).map(toSharedParticipant);

  const ownParticipant = conversation.own_participant
    ? toSharedParticipant(conversation.own_participant)
    : null;

  return {
    id: conversation.id,
    conversation_type: conversation.conversation_type,
    name: conversation.name,
    description: conversation.description,
    avatar_url: null,
    image_file_id: conversation.image_file_id,
    created_by_id: (
      conversation.created_by_identity_id
      || null
    ),
    created_by_identity_id: (
      conversation.created_by_identity_id
    ),
    posting_identity_id: (
      conversation.posting_identity_id
    ),
    posting_policy: conversation.posting_policy,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    last_message_at: conversation.last_message_at,
    participants,
    own_participant: ownParticipant,
    permissions: toSharedPermissions(
      conversation.permissions,
    ),
    unread_count: ownParticipant?.unread_count || 0,
    is_pinned: false,
    is_muted: ownParticipant
      ? !ownParticipant.notifications_enabled
      : false,
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
          identity_id: conversation.other_identity_id,
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
            avatar_url: conversation.avatar_url || null,
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
          sender_id: (
            conversation.last_message_sender_identity_id
          ),
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
    avatar_url: conversation.avatar_url || null,
    image_file_id: (
      conversation.conversation_type === 'group'
        ? conversation.group_image_file_id
        : conversation.other_logo_file_id
    ),
    created_by_id: null,
    created_at: conversation.last_message_at || '',
    updated_at: conversation.last_message_at || '',
    last_message_at: conversation.last_message_at,
    last_message: lastMessage,
    participants: otherParticipant
      ? [otherParticipant]
      : [],
    own_participant: null,
    permissions: null,
    unread_count: conversation.unread_count || 0,
    is_pinned: false,
    is_muted: !conversation.notifications_enabled,
    is_archived: false,
    is_protected: false,
    is_ai: false,
    direct_profile: otherParticipant?.user || null,
  };
}

function toSharedIdentitySummary(
  identity: ChatApiIdentitySummary | null | undefined,
) {
  if (!identity) {
    return null;
  }

  return {
    id: identity.id,
    identity_type: identity.identity_type,
    profile_id: identity.profile_id,
    commercial_profile_id: (
      identity.commercial_profile_id
    ),
    display_name: identity.display_name,
    avatar_file_id: identity.avatar_file_id,
    is_active: Boolean(identity.is_active),
    is_available: Boolean(identity.is_available),
  };
}

function toSharedGroupInvite(
  invite: ChatApiGroupInvite,
): ChatGroupInvite {
  return {
    id: invite.id,
    conversation_id: invite.conversation_id,
    invited_identity_id: invite.invited_identity_id,
    invited_by_identity_id: invite.invited_by_identity_id,
    status: invite.status,
    responded_at: invite.responded_at,
    expires_at: invite.expires_at,
    created_at: invite.created_at,
    updated_at: invite.updated_at,
    conversation: invite.conversation
      ? toSharedConversation(invite.conversation)
      : null,
    invited_identity: toSharedIdentitySummary(
      invite.invited_identity,
    ),
    invited_by_identity: toSharedIdentitySummary(
      invite.invited_by_identity,
    ),
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
    identity_id: response.identity_id,
    conversations: response.conversations.map(
      toSharedInboxConversation,
    ),
    limit: response.limit,
    next_before_last_message_at: (
      response.next_before_last_message_at
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

export async function getChatContactProfile(
  auth: AuthCredentials,
  identityId: string,
): Promise<ChatContactProfile> {
  const normalizedIdentityId = identityId.trim();

  if (!normalizedIdentityId) {
    throw new Error(
      'No fue posible identificar el contacto.',
    );
  }

  const response = await api.get<
    ChatContactProfileResponse
  >(
    `/chat/contacts/${encodeURIComponent(
      normalizedIdentityId,
    )}/profile/`,
    {
      auth: requireBearerAuth(auth),
    },
  );

  return {
    identity_id: response.contact.identity_id,
    identity_type: response.contact.identity_type,
    profile_id: response.contact.profile_id,
    commercial_profile_id: (
      response.contact.commercial_profile_id
    ),
    display_name: response.contact.display_name,
    occupation: response.contact.occupation || null,
    location: response.contact.location || null,
    social_links: (
      response.contact.social_links || []
    ).map((link) => ({
      platform: link.platform,
      url: link.url,
    })),
    avatar_file_id: (
      response.contact.avatar_file_id || null
    ),
    is_available: Boolean(
      response.contact.is_available,
    ),
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

export async function createChatGroup(
  auth: AuthCredentials,
  payload: {
    creator_identity_id: string;
    name: string;
    posting_policy: ChatGroupPostingPolicy;
    description?: string | null;
    image_file_id?: string | null;
  },
): Promise<{
  conversation: ChatConversation;
}> {
  const response = await api.post<{
    conversation: ChatApiConversation;
  }>(
    '/chat/groups/',
    {
      creator_identity_id: payload.creator_identity_id,
      name: payload.name.trim(),
      posting_policy: payload.posting_policy,
      description: payload.description?.trim() || null,
      image_file_id: payload.image_file_id || null,
    },
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

export async function updateChatGroup(
  auth: AuthCredentials,
  conversationId: string,
  payload: {
    actor_identity_id: string;
    name?: string;
    description?: string | null;
    posting_policy?: ChatGroupPostingPolicy;
    image_file_id?: string | null;
  },
): Promise<{
  conversation: ChatConversation;
}> {
  const response = await api.patch<{
    conversation: ChatApiConversation;
  }>(
    groupPath(conversationId),
    {
      actor_identity_id: payload.actor_identity_id,
      ...(payload.name !== undefined
        ? {
            name: payload.name.trim(),
          }
        : {}),
      ...(payload.description !== undefined
        ? {
            description: payload.description?.trim() || null,
          }
        : {}),
      ...(payload.posting_policy !== undefined
        ? {
            posting_policy: payload.posting_policy,
          }
        : {}),
      ...(payload.image_file_id !== undefined
        ? {
            image_file_id: payload.image_file_id,
          }
        : {}),
    },
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

export async function getChatConversation(
  auth: AuthCredentials,
  conversationId: string,
): Promise<{
  conversation: ChatConversation;
}> {
  const response = await api.get<{
    conversation: ChatApiConversation;
  }>(
    `${conversationPath(
      conversationId,
    )}?include_participants=true`,
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

export async function getChatMessage(
  auth: AuthCredentials,
  messageId: string,
): Promise<{
  message: ChatMessage;
}> {
  const normalizedMessageId = messageId.trim();

  if (!normalizedMessageId) {
    throw new Error(
      'No fue posible identificar el mensaje de Chat.',
    );
  }

  const response = await api.get<{
    message: ChatApiMessage;
  }>(
    `/chat/messages/${encodeURIComponent(
      normalizedMessageId,
    )}/`,
    {
      auth: requireBearerAuth(auth),
    },
  );

  return {
    message: toSharedMessage(response.message),
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
    body?: string | null;
    message_type?: 'text' | 'image' | 'file' | 'audio';
    attachment_file_ids?: string[];
    reply_to_message_id?: string | null;
  },
): Promise<{
  message: ChatMessage;
}> {
  const attachmentFileIds = Array.from(
    new Set(
      (payload.attachment_file_ids || [])
        .map((fileId) => fileId.trim())
        .filter(Boolean),
    ),
  );

  const response = await api.post<{
    message: ChatApiMessage;
  }>(
    `${conversationPath(conversationId)}messages/`,
    {
      sender_identity_id: payload.sender_identity_id,
      message_type: payload.message_type || 'text',
      body: payload.body?.trim() || '',
      ...(attachmentFileIds.length > 0
        ? {
            attachment_file_ids: attachmentFileIds,
          }
        : {}),
      ...(payload.reply_to_message_id
        ? {
            reply_to_message_id: (
              payload.reply_to_message_id.trim()
            ),
          }
        : {}),
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

export async function markChatConversationRead(
  auth: AuthCredentials,
  conversationId: string,
  payload: {
    identity_id: string;
    last_read_message_id: string;
  },
): Promise<{
  marked: boolean;
}> {
  return api.post<{
    marked: boolean;
  }>(
    `${conversationPath(conversationId)}read/`,
    payload,
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export async function clearChatConversation(
  auth: AuthCredentials,
  conversationId: string,
  payload: {
    identity_id: string;
  },
): Promise<void> {
  await api.delete<void>(
    `${conversationPath(conversationId)}clear/`,
    {
      auth: requireBearerAuth(auth),
      body: payload,
    },
  );
}

export async function inviteToChatGroup(
  auth: AuthCredentials,
  conversationId: string,
  payload: {
    actor_identity_id: string;
    invited_identity_id: string;
    expires_at?: string | null;
  },
): Promise<{
  invite: ChatGroupInvite;
}> {
  const response = await api.post<{
    invite: ChatApiGroupInvite;
  }>(
    `${groupPath(conversationId)}invites/`,
    {
      actor_identity_id: payload.actor_identity_id,
      invited_identity_id: payload.invited_identity_id,
      ...(payload.expires_at
        ? {
            expires_at: payload.expires_at,
          }
        : {}),
    },
    {
      auth: requireBearerAuth(auth),
    },
  );

  return {
    invite: toSharedGroupInvite(response.invite),
  };
}

export async function getChatGroupInvites(
  auth: AuthCredentials,
  options: {
    identityId?: string;
    status?: ChatGroupInviteStatus;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{
  invites: ChatGroupInvite[];
  count: number;
  limit: number;
  offset: number;
}> {
  const response = await api.get<ChatGroupInvitesResponse>(
    `/chat/group-invites/${buildQuery({
      identity_id: options.identityId,
      status: options.status || 'pending',
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
    })}`,
    {
      auth: requireBearerAuth(auth),
    },
  );

  return {
    invites: response.invites.map(toSharedGroupInvite),
    count: response.count,
    limit: response.limit,
    offset: response.offset,
  };
}

export async function respondToChatGroupInvite(
  auth: AuthCredentials,
  inviteId: string,
  accept: boolean,
): Promise<{
  accepted: boolean;
  conversation: ChatConversation | null;
  invite: ChatGroupInvite;
}> {
  const response = await api.post<{
    accepted: boolean;
    conversation: ChatApiConversation | null;
    invite: ChatApiGroupInvite;
  }>(
    `/chat/group-invites/${encodeURIComponent(
      inviteId,
    )}/response/`,
    {
      accept,
    },
    {
      auth: requireBearerAuth(auth),
    },
  );

  return {
    accepted: Boolean(response.accepted),
    conversation: response.conversation
      ? toSharedConversation(response.conversation)
      : null,
    invite: toSharedGroupInvite(response.invite),
  };
}

export async function leaveChatGroup(
  auth: AuthCredentials,
  conversationId: string,
  payload: {
    identity_id: string;
  },
): Promise<void> {
  await api.post<void>(
    `${groupPath(conversationId)}leave/`,
    payload,
    {
      auth: requireBearerAuth(auth),
    },
  );
}

export async function removeChatGroupParticipant(
  auth: AuthCredentials,
  conversationId: string,
  targetIdentityId: string,
  payload: {
    actor_identity_id: string;
  },
): Promise<void> {
  await api.delete<void>(
    `${groupPath(
      conversationId,
    )}participants/${encodeURIComponent(
      targetIdentityId,
    )}/`,
    {
      auth: requireBearerAuth(auth),
      body: payload,
    },
  );
}
