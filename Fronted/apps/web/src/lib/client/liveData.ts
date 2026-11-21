import {
  bootstrapChat,
  createChatMessageReaction,
  createCommercialProfile,
  createMediaStatus,
  createTextStatus,
  createTextStatusWithImageLayers,
  deleteChatMessageReaction,
  getChatIdentities,
  getChatInbox,
  getChatInboxPresence,
  getChatMessages,
  getCurrentWebCalendarBootstrap,
  getCurrentWebNoteTags,
  getCurrentWebNotes,
  getCurrentWebNotifications,
  getMailMessages,
  getMyStatuses,
  getOwnedCommercialOffers,
  getOwnedCommercialProfiles,
  getStatusFeed,
  getStatusTextBackgrounds,
  listChatCategories,
  listChatCategoryAssignments,
  listMyCallLogs,
  listMyCommunities,
  listMyContacts,
  discoverNetworkProfiles,
  registerStatusView,
  sendChatMessage,
  setChatIdentityPresence,
  uploadChatAttachment,
  getStatusViewers,
  getAssistantSettings,
  listAssistantMessages,
  listProtectedChats,
  getChatMessageAttachmentAccess,
} from '@beeapp/api-client';
import type { ChatConversation, ChatMessage as ApiChatMessage, CommercialModality, Note, StatusFeedItem } from '@beeapp/shared-types';
import type { ChatCategory, ChatItem, ChatMessage } from './chats';
import { AI_ASSISTANT_NAME, ASSISTANT_CHAT_ID } from './chats';
import { contactColor, contactInitials, type CallLogItem, type ContactItem } from './contacts';
import type { CommunityItem, CommunityPost } from './communities';
import type { NoteCategory } from './noteCategories';
import type { CalendarEventItem } from './calendarEvents';
import type { EmailItem } from './emails';
import type { TickerNotification } from './tabNotifications';
import type { BusinessItem, BusinessProduct, BusinessService } from './myServices';
import type { StatusItem } from './statuses';
import { replaceLoadedContacts } from './contactStore';

let chatIdentityId = '';

export function getRememberedChatIdentity(): string {
  return chatIdentityId;
}

import { getWebAuth } from './webAuth';

export { getWebAuth };

function initials(name: string): string {
  return contactInitials(name);
}

function clock(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

const ARCHIVED_CHATS_STORAGE_KEY = 'beeapp.web.archived-chats.v1';

export function readArchivedChatMap(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ARCHIVED_CHATS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function writeArchivedChatPatch(conversationId: string, archived: boolean): Record<string, boolean> {
  const current = readArchivedChatMap();
  const next = { ...current, [conversationId]: archived };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ARCHIVED_CHATS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage error
    }
  }
  return next;
}

function formatDateHeading(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  if (date >= startOfToday) return 'HOY';
  if (date >= startOfYesterday) return 'AYER';
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function toChatItem(conversation: ChatConversation, identityId: string): ChatItem {
  const name = conversation.name
    || conversation.other_display_name
    || conversation.commercial?.display_name
    || 'Conversación';
  const status = conversation.last_message?.status;
  const rawPolicy = (conversation as { posting_policy?: string }).posting_policy;
  const postingPolicy = rawPolicy === 'admins_only' ? 'admins_only' : 'all_members';
  const disappearingSeconds = (conversation as { disappearing_seconds?: number | null }).disappearing_seconds ?? null;

  return {
    id: conversation.id,
    name,
    avatarUrl: conversation.avatar_url || conversation.direct_profile?.avatar_url || null,
    description: conversation.description || null,
    postingPolicy,
    disappearingSeconds,
    peerIdentityId: conversation.other_identity_id || null,
    lastMessage: conversation.last_message?.content || '',
    time: clock(conversation.last_message_at),
    unreadCount: conversation.unread_count || 0,
    isGroup: conversation.conversation_type === 'group',
    status: status === 'read' || status === 'delivered' || status === 'sent' ? status : 'sent',
    isPinned: Boolean(conversation.is_pinned),
    isMuted: Boolean(conversation.is_muted),
    isArchived: Boolean(conversation.is_archived),
    isProtected: Boolean(conversation.is_protected),
    isAI: Boolean(conversation.is_ai) || conversation.conversation_type === 'ai',
    isSellerChat: conversation.other_identity_type === 'commercial_profile',
    postingIdentityId: identityId,
    businessId: conversation.business_id || conversation.commercial?.id || null,
    commercialProfileId: conversation.other_commercial_profile_id
      || conversation.commercial?.id
      || null,
    members: (conversation.participants || []).map((participant) => {
      const memberName = [participant.user?.first_name, participant.user?.last_name].filter(Boolean).join(' ') || 'Miembro';
      const role = participant.role === 'owner'
        ? 'owner' as const
        : participant.role === 'admin'
          ? 'admin' as const
          : 'member' as const;
      return {
        id: participant.identity_id || participant.id,
        name: memberName,
        role,
        initials: initials(memberName),
        color: contactColor(participant.identity_id || participant.id),
        isCurrentUser: participant.identity_id === identityId,
      };
    }),
  };
}

const ASSISTANT_INBOX_PLACEHOLDER =
  'Pregúntame o pídeme que haga algo en la app.';

async function protectedConversationIds(): Promise<Set<string>> {
  try {
    const auth = await getWebAuth();
    const result = await listProtectedChats(auth);
    return new Set(result.conversation_ids || []);
  } catch {
    return new Set();
  }
}

function lockChatItem(chat: ChatItem): ChatItem {
  return {
    ...chat,
    isProtected: true,
    lastMessage: '',
    unreadCount: 0,
  };
}

async function loadAssistantInboxItem(identityId: string, locked = false): Promise<ChatItem | null> {
  try {
    const auth = await getWebAuth();
    const [settingsResponse, messagesResponse] = await Promise.all([
      getAssistantSettings(auth),
      locked
        ? Promise.resolve({ messages: [] })
        : listAssistantMessages(auth).catch(() => ({ messages: [] })),
    ]);
    const settings = settingsResponse.settings;
    if (settings?.inbox_pinned === false) {
      return null;
    }

    const messages = messagesResponse.messages || [];
    const last = messages[messages.length - 1];

    return {
      id: ASSISTANT_CHAT_ID,
      name: settings?.name?.trim() || AI_ASSISTANT_NAME,
      lastMessage: locked ? '' : (last?.content?.trim() || ASSISTANT_INBOX_PLACEHOLDER),
      isProtected: locked,
      time: clock(last?.created_at),
      unreadCount: 0,
      isGroup: false,
      status: 'read',
      isPinned: true,
      isMuted: settings?.inbox_muted === true,
      isAI: true,
      postingIdentityId: identityId,
    };
  } catch {
    return null;
  }
}

export async function loadInbox(): Promise<{ identityId: string; chats: ChatItem[]; categories: ChatCategory[] }> {
  const auth = await getWebAuth();
  const bootstrap = await bootstrapChat(auth);
  const identity = bootstrap.identities.find((item) => item.identity_type === 'profile') || bootstrap.identities[0];

  if (!identity) {
    return { identityId: '', chats: [], categories: [] };
  }

  chatIdentityId = identity.id;
  void setChatIdentityPresence(auth, identity.id, true).catch(() => undefined);
  const [inbox, categories] = await Promise.all([
    getChatInbox(auth, identity.id, { limit: 100 }),
    listChatCategories(auth, identity.id).catch(() => ({ categories: [] })),
  ]);
  const conversations = [...inbox.pinned_conversations, ...inbox.conversations];
  const unique = new Map(conversations.map((conversation) => [conversation.id, conversation]));
  const conversationIds = Array.from(unique.keys());
  const targetIdentityIds = Array.from(
    new Set(
      Array.from(unique.values())
        .map((c) => c.other_identity_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [categoryAssignments, presenceResult] = await Promise.all([
    conversationIds.length > 0
      ? listChatCategoryAssignments(auth, identity.id, conversationIds).catch(() => ({ assignments: [] }))
      : Promise.resolve({ assignments: [] }),
    targetIdentityIds.length > 0
      ? getChatInboxPresence(auth, identity.id, targetIdentityIds).catch(() => ({ presences: [] }))
      : Promise.resolve({ presences: [] }),
  ]);

  const categoryMap = new Map<string, string[]>();
  for (const assignment of categoryAssignments.assignments || []) {
    const existing = categoryMap.get(assignment.conversation_id) || [];
    if (!existing.includes(assignment.category_id)) {
      existing.push(assignment.category_id);
      categoryMap.set(assignment.conversation_id, existing);
    }
  }

  const presenceByIdentity = new Map<string, { online: boolean; lastSeenAt: string | null }>();
  for (const p of presenceResult.presences || []) {
    if (p.identity_id) {
      presenceByIdentity.set(p.identity_id, {
        online: Boolean(p.is_online),
        lastSeenAt: p.last_seen_at ?? null,
      });
    }
  }

  const archivedPatches = readArchivedChatMap();
  const protectedIds = await protectedConversationIds();
  const chats = Array.from(unique.values())
    .map((conversation) => {
      const base = toChatItem(conversation, identity.id);
      const assignedCategories = categoryMap.get(conversation.id);
      const peerPresence = base.peerIdentityId ? presenceByIdentity.get(base.peerIdentityId) : undefined;
      const archivedPatch = archivedPatches[conversation.id];
      return {
        ...base,
        categoryIds: assignedCategories ?? base.categoryIds,
        online: peerPresence ? peerPresence.online : base.online,
        lastSeenAt: peerPresence ? peerPresence.lastSeenAt : base.lastSeenAt,
        isArchived: archivedPatch !== undefined ? archivedPatch : base.isArchived,
      };
    })
    .map((chat) => (protectedIds.has(chat.id) ? lockChatItem(chat) : chat));
  const assistantLocked = chats.some((chat) => chat.isAI && chat.isProtected);
  const withoutAssistant = chats.filter(
    (chat) => chat.id !== ASSISTANT_CHAT_ID && !chat.isAI,
  );
  const assistantRow = await loadAssistantInboxItem(identity.id, assistantLocked);
  const mergedChats = assistantRow
    ? [assistantRow, ...withoutAssistant]
    : withoutAssistant;

  return {
    identityId: identity.id,
    chats: mergedChats,
    categories: categories.categories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon || 'Tag',
      color: category.color || '#F3E8FF',
    })),
  };
}

export async function loadCommercialInbox(businessId: string): Promise<ChatItem[]> {
  const auth = await getWebAuth();
  await bootstrapChat(auth);
  const identities = await getChatIdentities(auth);
  const identity = identities.identities.find((item) => (
    item.identity_type === 'commercial_profile'
    && item.commercial_profile_id === businessId
    && item.is_active
  ));

  if (!identity) {
    throw new Error('No fue posible preparar la identidad de chat de este negocio.');
  }

  chatIdentityId = identity.id;
  void setChatIdentityPresence(auth, identity.id, true).catch(() => undefined);
  const [inbox, protectedIds] = await Promise.all([
    getChatInbox(auth, identity.id, { limit: 100 }),
    protectedConversationIds(),
  ]);
  const conversations = [...inbox.pinned_conversations, ...inbox.conversations];
  const unique = new Map(conversations.map((conversation) => [conversation.id, conversation]));
  return Array.from(unique.values())
    .map((conversation) => toChatItem(conversation, identity.id))
    .map((chat) => (protectedIds.has(chat.id) ? lockChatItem(chat) : chat))
    .filter((chat) => (
      !chat.isAI
      && (
        chat.businessId === businessId
        || chat.commercialProfileId === businessId
        || !chat.businessId
      )
    ));
}

function formatAttachmentSize(size?: number | null): string | undefined {
  if (!size || size <= 0) return undefined;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function toUiChatMessage(message: ApiChatMessage, identityId: string): ChatMessage {
  const rawType = String(message.message_type || 'text');
  const rawMeta = ((message as { metadata?: Record<string, unknown> | null }).metadata ?? {}) as Record<string, unknown>;
  const refType = (message as { reference_type?: string | null }).reference_type;
  const replySource = (message as {
    reply_to?: {
      id?: string;
      content?: string | null;
      sender_display_name?: string | null;
      sender?: { first_name?: string | null; last_name?: string | null } | null;
    } | null;
  }).reply_to;

  const locObj = (rawMeta.location && typeof rawMeta.location === 'object'
    ? rawMeta.location
    : rawMeta) as { latitude?: unknown; longitude?: unknown; label?: unknown };
  const hasLocation = Number.isFinite(Number(locObj?.latitude)) && Number.isFinite(Number(locObj?.longitude));

  const contactObj = (rawMeta.contact && typeof rawMeta.contact === 'object'
    ? rawMeta.contact
    : null) as { name?: unknown; phone?: unknown; email?: unknown } | null;

  let kind: ChatMessage['type'] = 'text';
  if (rawType === 'image') kind = 'image';
  else if (rawType === 'video') kind = 'video';
  else if (rawType === 'audio' || rawType === 'voice') kind = 'audio';
  else if (rawType === 'file' || rawType === 'document') kind = 'file';
  else if (rawType === 'location' || hasLocation) kind = 'location';
  else if (rawType === 'contact' || contactObj?.name) kind = 'contact';
  else if (refType === 'status_story') kind = 'status_reply';
  else if (refType === 'call_session' || rawType === 'call_notice') kind = 'call_notice';

  const attachment = message.attachments?.[0];
  const mediaUrl = attachment?.url?.trim() || attachment?.thumbnail_url?.trim() || undefined;

  const replySender = replySource?.sender_display_name
    || [replySource?.sender?.first_name, replySource?.sender?.last_name].filter(Boolean).join(' ')
    || 'Mensaje';

  return {
    id: message.id,
    senderName: [message.sender?.first_name, message.sender?.last_name].filter(Boolean).join(' ') || undefined,
    isUser: message.sender_identity_id === identityId,
    type: kind,
    text: message.deleted_at ? '' : message.content,
    mediaUrl,
    fileName: attachment?.name || undefined,
    fileSize: formatAttachmentSize(attachment?.size_bytes),
    status: message.status === 'read' || message.status === 'delivered' ? message.status : 'sent',
    time: clock(message.created_at),
    createdAt: message.created_at,
    dateLabel: formatDateHeading(message.created_at),
    replyTo: replySource
      ? {
        id: replySource.id,
        sender: replySender,
        text: replySource.content || 'Adjunto',
      }
      : undefined,
    location: hasLocation
      ? {
        latitude: Number(locObj.latitude),
        longitude: Number(locObj.longitude),
        label: typeof locObj.label === 'string' ? locObj.label : undefined,
      }
      : undefined,
    contactCard: contactObj?.name
      ? {
        name: String(contactObj.name),
        phone: typeof contactObj.phone === 'string' ? contactObj.phone : undefined,
        email: typeof contactObj.email === 'string' ? contactObj.email : undefined,
      }
      : undefined,
    statusReply: refType === 'status_story'
      ? {
        statusId: (message as { reference_id?: string | null }).reference_id || undefined,
        previewText: typeof rawMeta.status_preview === 'string' ? rawMeta.status_preview : 'Respondió a un estado',
      }
      : undefined,
    callNotice: kind === 'call_notice'
      ? {
        callType: rawMeta.call_type === 'video' ? 'video' : 'voice',
        status: typeof rawMeta.call_status === 'string' ? rawMeta.call_status : (message.content || 'Llamada'),
        durationSeconds: typeof rawMeta.duration_seconds === 'number' ? rawMeta.duration_seconds : null,
      }
      : undefined,
    isPinned: Boolean(message.is_pinned),
    isEdited: Boolean(message.edited_at),
    isDestroyed: Boolean(message.destroyed_at),
    sentByAi: Boolean(message.is_sent_by_ai),
    reactions: summarizeReactions(message.reactions, identityId),
  };
}

function summarizeReactions(
  reactions: ApiChatMessage['reactions'],
  identityId: string,
): ChatMessage['reactions'] {
  const grouped = new Map<string, { emoji: string; count: number; mine: boolean }>();
  for (const reaction of reactions || []) {
    const current = grouped.get(reaction.emoji) || { emoji: reaction.emoji, count: 0, mine: false };
    current.count += 1;
    if (reaction.identity_id === identityId) current.mine = true;
    grouped.set(reaction.emoji, current);
  }
  return Array.from(grouped.values());
}

export async function hydrateChatMedia(message: ChatMessage, identityId: string): Promise<ChatMessage> {
  if (message.mediaUrl || message.isDestroyed) return message;
  if (
    message.type !== 'image'
    && message.type !== 'video'
    && message.type !== 'file'
    && message.type !== 'audio'
  ) {
    return message;
  }
  try {
    const auth = await getWebAuth();
    const access = await getChatMessageAttachmentAccess(auth, message.id, identityId);
    const mime = access.attachment.mime_type || '';
    const inferredType = mime.startsWith('video/') ? 'video' : message.type;
    return {
      ...message,
      type: inferredType,
      mediaUrl: access.url,
      fileName: message.fileName || access.attachment.display_name || access.attachment.original_name || undefined,
      fileSize: message.fileSize || formatAttachmentSize(access.attachment.size_bytes),
    };
  } catch {
    return message;
  }
}

export async function loadChatMessages(
  conversationId: string,
  identityId: string,
  limit = 100,
): Promise<ChatMessage[]> {
  const auth = await getWebAuth();
  const result = await getChatMessages(auth, conversationId, { limit });
  const mapped = result.messages.map((message) => toUiChatMessage(message, identityId)).reverse();
  return Promise.all(mapped.map((message) => hydrateChatMedia(message, identityId)));
}

export async function sendTextChatMessage(
  conversationId: string,
  identityId: string,
  text: string,
  replyToMessageId?: string,
): Promise<ChatMessage> {
  const auth = await getWebAuth();
  const result = await sendChatMessage(auth, conversationId, {
    sender_identity_id: identityId,
    body: text,
    message_type: 'text',
    ...(replyToMessageId
      ? {
        reference_type: 'message',
        reference_id: replyToMessageId,
      }
      : {}),
  });
  return toUiChatMessage(result.message, identityId);
}

export async function sendChatAttachmentMessage(
  conversationId: string,
  identityId: string,
  file: File,
  messageType: 'image' | 'video' | 'document' | 'audio',
): Promise<ChatMessage> {
  const auth = await getWebAuth();
  const uri = URL.createObjectURL(file);
  const uploadType: 'image' | 'document' | 'audio' = messageType === 'video' ? 'document' : messageType;
  try {
    const result = await uploadChatAttachment(auth, conversationId, {
      sender_identity_id: identityId,
      message_type: uploadType,
      file: {
        uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      },
    });
    const uiMessage = toUiChatMessage(result.message, identityId);
    if (messageType === 'video' || file.type.startsWith('video/')) {
      uiMessage.type = 'video';
    }
    return hydrateChatMedia(uiMessage, identityId);
  } finally {
    URL.revokeObjectURL(uri);
  }
}

export async function sendLocationChatMessage(
  conversationId: string,
  identityId: string,
  latitude: number,
  longitude: number,
): Promise<ChatMessage> {
  const auth = await getWebAuth();
  const result = await sendChatMessage(auth, conversationId, {
    sender_identity_id: identityId,
    message_type: 'location',
    body: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    metadata: {
      latitude,
      longitude,
      location: { latitude, longitude },
    },
  });
  return toUiChatMessage(result.message, identityId);
}

export async function sendContactChatMessage(
  conversationId: string,
  identityId: string,
  contact: { name: string; phone?: string; email?: string },
): Promise<ChatMessage> {
  const auth = await getWebAuth();
  const summary = [contact.name, contact.phone, contact.email].filter(Boolean).join(' · ');
  const result = await sendChatMessage(auth, conversationId, {
    sender_identity_id: identityId,
    message_type: 'text',
    body: `Contacto: ${summary}`,
    metadata: {
      contact: {
        name: contact.name,
        phone: contact.phone || null,
        email: contact.email || null,
      },
    },
  });
  const mapped = toUiChatMessage(result.message, identityId);
  return {
    ...mapped,
    type: 'contact',
    contactCard: contact,
  };
}

export async function toggleChatMessageReaction(
  conversationId: string,
  messageId: string,
  identityId: string,
  emoji: string,
  currentlyMine: boolean,
): Promise<void> {
  void conversationId;
  const auth = await getWebAuth();
  if (currentlyMine) {
    await deleteChatMessageReaction(auth, messageId, identityId, emoji);
  } else {
    await createChatMessageReaction(auth, messageId, identityId, emoji);
  }
}

export function toContactItem(row: {
  id: string;
  display_name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  linked_user_id?: string | null;
}): ContactItem {
  return {
    id: row.id,
    name: row.display_name,
    profession: row.notes || '',
    activity: '',
    interests: [],
    initials: initials(row.display_name),
    color: contactColor(row.id),
    phone: row.phone || '',
    email: row.email || '',
    linkedUserId: row.linked_user_id,
  };
}

export async function loadContacts(): Promise<ContactItem[]> {
  const contacts = (await listMyContacts()).map(toContactItem);
  replaceLoadedContacts(contacts);
  return contacts;
}

export async function loadDiscoverContacts(): Promise<ContactItem[]> {
  const profiles = await discoverNetworkProfiles();
  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.display_name || 'Usuario',
    profession: profile.occupation,
    activity: profile.occupation,
    interests: [],
    initials: initials(profile.display_name || 'Usuario'),
    color: contactColor(profile.id),
    isDiscovery: true,
    linkedUserId: profile.id,
  }));
}

export async function loadCallLogs(): Promise<CallLogItem[]> {
  const logs = await listMyCallLogs();
  return logs.map((log) => ({
    id: log.id,
    contactId: log.id,
    name: log.display_name,
    initials: initials(log.display_name),
    color: contactColor(log.id),
    type: log.direction,
    isVideo: log.call_type.toLowerCase().includes('video'),
    time: clock(log.created_at),
    duration: log.started_at && log.ended_at
      ? `${Math.max(1, Math.round((new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 60000))} min`
      : '',
  }));
}

export async function loadCommunities(userId: string): Promise<CommunityItem[]> {
  const rows = await listMyCommunities();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    initials: initials(row.name),
    color: contactColor(row.id),
    creatorId: row.owner_id,
    membersCount: row.members.length,
    isAdmin: row.owner_id === userId || row.members.some((member) => member.user_id === userId && member.member_role === 'owner'),
    unreadCount: 0,
    members: row.members.map((member) => ({
      id: member.user_id,
      name: member.user_id === userId ? 'Tú' : 'Miembro',
      role: member.member_role === 'owner' ? 'admin' : 'member',
      initials: member.user_id === userId ? 'TÚ' : 'M',
      color: contactColor(member.user_id),
      isCurrentUser: member.user_id === userId,
    })),
    posts: row.posts
      .slice()
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map((post): CommunityPost => ({
        id: post.id,
        authorId: post.author_id,
        authorName: post.author_id === userId ? 'Tú' : 'Miembro',
        authorInitials: post.author_id === userId ? 'TÚ' : 'M',
        authorColor: contactColor(post.author_id),
        text: post.body,
        timestamp: clock(post.created_at),
        reactions: { like: 0, love: 0, laugh: 0 },
        myReactions: [],
      })),
  }));
}

function storyToStatus(item: StatusFeedItem): StatusItem[] {
  return item.stories.map((story) => {
    const rawMedia = story.media as { url?: string | null; media_type?: string | null; mime_type?: string | null } | null | undefined;
    const mediaUrl = rawMedia?.url || null;
    const isVideo = Boolean(
      mediaUrl
      && (
        rawMedia?.media_type === 'video'
        || rawMedia?.mime_type?.startsWith('video/')
        || story.kind === 'video'
        || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(mediaUrl)
      ),
    );
    const bgHex = (story as { text_background?: { background_hex?: string | null; gradient_start_hex?: string | null } }).text_background?.background_hex
      || (story as { text_background?: { gradient_start_hex?: string | null } }).text_background?.gradient_start_hex
      || '#6025d2';

    return {
      id: story.id,
      authorId: item.author.actor_id,
      authorName: item.author.display_name,
      authorInitials: initials(item.author.display_name),
      authorColor: contactColor(item.author.actor_id),
      authorAvatarUrl: item.author.avatar_url || null,
      actorType: item.author.actor_type,
      actorCommercialProfileId: item.author.actor_type === 'commercial_profile' ? item.author.actor_id : null,
      type: mediaUrl ? (isVideo ? 'video' : 'photo') : 'text',
      text: story.text_content || story.caption || '',
      photoUrl: mediaUrl,
      bgColor: mediaUrl ? null : bgHex,
      linkedProduct: story.commercial_offer_link
        ? {
          id: story.commercial_offer_link.commercial_offer_id,
          name: story.commercial_offer_link.offer_title_snapshot || 'Oferta',
          price: null,
        }
        : null,
      textPosition: { x: 50, y: 70 },
      textSize: 22,
      textWeight: '700',
      textColor: '#FFFFFF',
      timestamp: clock(story.created_at),
      viewed: story.is_viewed,
    };
  });
}

export async function loadStatuses(): Promise<StatusItem[]> {
  const auth = await getWebAuth();
  const [feed, mine] = await Promise.all([
    getStatusFeed(auth, { limit: 30 }).catch(() => ({ items: [] as StatusFeedItem[] })),
    getMyStatuses(auth).catch(() => null),
  ]);
  const feedItems = feed.items.flatMap(storyToStatus);
  const existingIds = new Set(feedItems.map((item) => item.id));
  const rawMineStories = [
    ...(mine?.active?.profile?.stories || []),
    ...(mine?.active?.commercial_profiles?.flatMap((cp) => cp.stories || []) || []),
  ];
  const myItems: StatusItem[] = rawMineStories
    .filter((story) => !existingIds.has(story.id))
    .map((story) => {
      const rawMedia = story.media as { url?: string | null; media_type?: string | null; mime_type?: string | null } | null | undefined;
      const mediaUrl = rawMedia?.url || null;
      const isVideo = Boolean(
        mediaUrl
        && (
          rawMedia?.media_type === 'video'
          || rawMedia?.mime_type?.startsWith('video/')
          || story.kind === 'video'
          || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(mediaUrl)
        ),
      );
      return {
        id: story.id,
        authorId: story.actor.actor_id,
        authorName: story.actor.display_name || 'Tú',
        authorInitials: initials(story.actor.display_name || 'Tú'),
        authorColor: contactColor(story.actor.actor_id),
        authorAvatarUrl: story.actor.avatar_url || null,
        actorType: story.actor.actor_type,
        actorCommercialProfileId: story.actor.actor_type === 'commercial_profile' ? story.actor.actor_id : null,
        type: mediaUrl ? (isVideo ? 'video' : 'photo') : 'text',
        text: story.text_content || story.caption || '',
        photoUrl: mediaUrl,
        bgColor: mediaUrl ? null : '#6025d2',
        linkedProduct: story.commercial_offer_link
          ? {
            id: story.commercial_offer_link.commercial_offer_id,
            name: story.commercial_offer_link.offer_title_snapshot || 'Oferta',
            price: null,
          }
          : null,
        textPosition: { x: 50, y: 70 },
        textSize: 22,
        textWeight: '700',
        textColor: '#FFFFFF',
        timestamp: clock(story.created_at),
        viewed: true,
      };
    });
  return [...myItems, ...feedItems];
}

export async function markStatusSeen(statusId: string): Promise<void> {
  const auth = await getWebAuth();
  await registerStatusView(auth, statusId);
}

export async function loadStatusViewers(statusId: string): Promise<{
  count: number;
  viewers: Array<{
    contactId: string;
    contactName: string;
    viewedAt: string;
  }>;
}> {
  const auth = await getWebAuth();
  const response = await getStatusViewers(auth, statusId);

  return {
    count: response.count,
    viewers: response.viewers.map((viewer) => ({
      contactId: viewer.profile_id,
      contactName: viewer.display_name || 'Usuario',
      viewedAt: viewer.viewed_at
        ? new Date(viewer.viewed_at).toLocaleString('es-CO', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
        : '',
    })),
  };
}

export async function publishStatus(
  draft: Omit<StatusItem, 'id' | 'timestamp' | 'viewed'>,
  authorName: string,
): Promise<StatusItem> {
  const auth = await getWebAuth();
  const actorType = draft.actorType || 'profile';
  const actorCommercialProfileId = actorType === 'commercial_profile' ? draft.actorCommercialProfileId || undefined : undefined;
  const editorMetadata: Record<string, unknown> = {
    textPosition: draft.textPosition,
    textSize: draft.textSize,
    textWeight: draft.textWeight,
    textColor: draft.textColor,
    textLayers: draft.textLayers || [],
    ...(draft.linkedProduct ? { linkedProduct: draft.linkedProduct } : {}),
  };

  if ((draft.type === 'photo' || draft.type === 'video') && (draft.mediaFile || draft.photoUrl)) {
    const file = draft.mediaFile;
    const uri = file ? URL.createObjectURL(file) : (draft.photoUrl || '');
    try {
      const response = await createMediaStatus(
        auth,
        {
          kind: draft.type === 'video' ? 'video' : 'image',
          caption: draft.text?.trim() || undefined,
          duration_seconds: draft.type === 'video' ? Math.max(1, Math.round(draft.videoDurationSeconds || 5)) : undefined,
          actor_type: actorType,
          actor_commercial_profile_id: actorCommercialProfileId,
          editor_metadata: editorMetadata,
        },
        {
          uri,
          name: file?.name || (draft.type === 'video' ? 'status.mp4' : 'status.jpg'),
          mimeType: file?.type || (draft.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        },
      );
      const story = response.status;
      return {
        ...draft,
        id: story.id,
        authorId: story.actor.actor_id,
        authorName: story.actor.display_name || authorName,
        authorInitials: initials(story.actor.display_name || authorName),
        authorColor: '#F3E8FF',
        photoUrl: story.media?.url || draft.photoUrl,
        timestamp: 'Ahora',
        viewed: true,
      };
    } finally {
      if (file) URL.revokeObjectURL(uri);
    }
  }

  let backgroundId = '';
  try {
    const bgs = await getStatusTextBackgrounds(auth);
    const items = bgs.backgrounds || [];
    const matched = items.find((b) => b.hex_color?.toLowerCase() === draft.bgColor?.toLowerCase());
    backgroundId = matched?.id || items[0]?.id || '';
  } catch {
    backgroundId = '';
  }

  const textContent = draft.text?.trim() || 'Estado';
  const payload = {
    kind: 'text' as const,
    text_content: textContent,
    caption: textContent,
    text_background_id: backgroundId,
    actor_type: actorType,
    actor_commercial_profile_id: actorCommercialProfileId,
    editor_metadata: editorMetadata,
  };

  const response = draft.imageLayers && draft.imageLayers.length > 0
    ? await createTextStatusWithImageLayers(auth, payload)
    : await createTextStatus(auth, payload);
  const story = response.status;
  return {
    ...draft,
    id: story.id,
    authorId: story.actor.actor_id,
    authorName: story.actor.display_name || authorName,
    authorInitials: initials(story.actor.display_name || authorName),
    authorColor: '#F3E8FF',
    type: 'text',
    text: textContent,
    photoUrl: null,
    bgColor: draft.bgColor || '#6025d2',
    timestamp: 'Ahora',
    viewed: true,
  };
}

export async function publishTextStatus(text: string, authorName: string): Promise<StatusItem> {
  return publishStatus(
    {
      authorId: 'me',
      authorName,
      authorInitials: initials(authorName),
      authorColor: '#F3E8FF',
      type: 'text',
      text,
      photoUrl: null,
      bgColor: '#6025d2',
      linkedProduct: null,
      textPosition: { x: 50, y: 50 },
      textSize: 24,
      textWeight: '700',
      textColor: '#FFFFFF',
    },
    authorName,
  );
}

export async function loadOverviewNotes(): Promise<Array<{ id: string; title: string; preview: string; timestamp: string; isProtected: boolean }>> {
  const response = await getCurrentWebNotes({ limit: 4 });
  return (response.notes || []).map((note: Note) => ({
    id: note.id,
    title: note.title || 'Sin título',
    preview: '',
    timestamp: clock(note.updated_at),
    isProtected: false,
  }));
}

export async function loadNoteCategories(): Promise<NoteCategory[]> {
  const response = await getCurrentWebNoteTags();
  return (response.tags || []).map((tag) => ({
    id: tag.id,
    name: tag.name,
    iconKey: 'file-text',
    color: tag.color || '#6025d2',
  }));
}

export async function loadOverviewEvents(): Promise<CalendarEventItem[]> {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 14);
  const response = await getCurrentWebCalendarBootstrap({
    range_start: start.toISOString(),
    range_end: end.toISOString(),
  });
  return (response.events || []).slice(0, 5).map((event) => ({
    id: event.id,
    title: event.title || 'Evento',
    time: clock(event.starts_at),
    type: 'meeting',
    dateStr: event.starts_at || '',
    location: event.location_name || undefined,
  }));
}

export async function loadOverviewEmails(): Promise<EmailItem[]> {
  const response = await getMailMessages({ limit: 5 });
  return (response.messages || []).map((message) => ({
    id: message.id,
    sender: message.sender?.display_name || message.sender?.email || 'Remitente',
    email: message.sender?.email || '',
    subject: message.subject || '(Sin asunto)',
    preview: message.snippet || '',
    timestamp: clock(message.received_at || message.sent_at),
    unread: !message.is_read,
    starred: Boolean(message.is_starred),
    hasAttachment: Boolean(message.has_attachments),
    folder: 'inbox',
    account: '',
    initialsColor: contactColor(message.id),
  }));
}

export async function loadTickerNotifications(): Promise<TickerNotification[]> {
  const response = await getCurrentWebNotifications({ limit: 12 });
  return response.notifications.map((notification) => ({
    id: notification.id,
    type: notification.module === 'mail'
      ? 'mail'
      : notification.module === 'calendar'
        ? 'calendar'
        : notification.module === 'notes'
          ? 'notes'
          : notification.module === 'storage'
            ? 'storage'
            : 'chat',
    title: notification.title,
    message: notification.body,
    timestamp: clock(notification.created_at),
    read: Boolean(notification.read_at),
  }));
}

export async function loadOwnedBusinesses(): Promise<BusinessItem[]> {
  const auth = await getWebAuth();
  const profiles = await getOwnedCommercialProfiles(auth);
  const businesses = await Promise.all(profiles.profiles.map(async (profile) => {
    const offers = await getOwnedCommercialOffers(auth, profile.id).catch(() => ({ offers: [] }));
    const products: BusinessProduct[] = [];
    const services: BusinessService[] = [];
    offers.offers.forEach((offer) => {
      const price = offer.base_price_amount == null ? 'Precio por acordar' : formatCop(offer.base_price_amount);
      if (offer.offer_kind === 'service') {
        services.push({
          id: offer.id,
          name: offer.title,
          price,
          description: offer.description || '',
          type: 'service',
          serviceModalities: offer.modalities.map((item) => item.modality),
          features: [],
        });
      } else {
        products.push({
          id: offer.id,
          name: offer.title,
          price,
          description: offer.description || '',
          type: 'product',
          deliveryMethods: offer.modalities.map((item) => item.modality),
          features: [],
        });
      }
    });

    return {
      id: profile.id,
      name: profile.display_name,
      category: profile.categories?.[0]?.category?.name || profile.custom_activity_text || '',
      address: [profile.address, profile.city].filter(Boolean).join(', '),
      description: profile.description || '',
      offersProducts: profile.offer_type !== 'services',
      offersServices: profile.offer_type !== 'products',
      deliveryMethods: profile.modalities.map((item) => item.modality),
      serviceModalities: profile.modalities.map((item) => item.modality),
      products,
      services,
      publicationStatus: profile.publication_status,
      offerType: profile.offer_type,
    } satisfies BusinessItem;
  }));

  return businesses;
}

export async function createOwnedBusiness(input: BusinessItem): Promise<BusinessItem> {
  const auth = await getWebAuth();
  const offerType = input.offersProducts && input.offersServices
    ? 'mixed'
    : input.offersServices
      ? 'services'
      : 'products';
  const modalities: CommercialModality[] = [
    ...(input.offersProducts ? ['delivery', 'pickup'] as const : []),
    ...(input.offersServices ? ['virtual', 'in_person'] as const : []),
  ];
  const rawAddressParts = (input.address || '').split(',').map((part) => part.trim()).filter(Boolean);
  const extractedCity = rawAddressParts.length > 1
    ? rawAddressParts[rawAddressParts.length - 1]
    : (rawAddressParts[0] || 'Bogotá');
  const created = await createCommercialProfile(auth, {
    offer_type: offerType,
    display_name: input.name.trim(),
    description: input.description.trim() || input.name.trim(),
    city: extractedCity,
    address: input.address || null,
    custom_activity_text: input.category,
    new_category_names: input.category ? [input.category] : [],
    modalities: modalities.length > 0 ? modalities : ['buddy_chat'],
  });
  const saved = (await loadOwnedBusinesses()).find((item) => item.id === created.profile.id);
  return saved || { ...input, id: created.profile.id };
}

function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}
