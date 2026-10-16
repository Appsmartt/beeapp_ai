import {
  bootstrapChat,
  createCommercialProfile,
  createTextStatus,
  getChatInbox,
  getChatMessages,
  getCurrentWebCalendarBootstrap,
  getCurrentWebNoteTags,
  getCurrentWebNotes,
  getCurrentWebNotifications,
  getMailMessages,
  getOwnedCommercialOffers,
  getOwnedCommercialProfiles,
  getStatusFeed,
  listChatCategories,
  listMyCallLogs,
  listMyCommunities,
  listMyContacts,
  discoverNetworkProfiles,
  registerStatusView,
  sendChatMessage,
  uploadChatAttachment,
  getStatusViewers,
  getAssistantSettings,
  listAssistantMessages,
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

function toChatItem(conversation: ChatConversation, identityId: string): ChatItem {
  const name = conversation.name
    || conversation.other_display_name
    || conversation.commercial?.display_name
    || 'Conversación';
  const status = conversation.last_message?.status;

  return {
    id: conversation.id,
    name,
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
    members: (conversation.participants || []).map((participant) => {
      const name = [participant.user?.first_name, participant.user?.last_name].filter(Boolean).join(' ') || 'Miembro';
      return {
        id: participant.identity_id || participant.id,
        name,
        role: participant.role === 'owner' || participant.role === 'admin' ? 'admin' as const : 'member' as const,
        initials: initials(name),
        color: contactColor(participant.identity_id || participant.id),
        isCurrentUser: participant.identity_id === identityId,
      };
    }),
  };
}

const ASSISTANT_INBOX_PLACEHOLDER =
  'Pregúntame o pídeme que haga algo en la app.';

async function loadAssistantInboxItem(identityId: string): Promise<ChatItem | null> {
  try {
    const auth = await getWebAuth();
    const [settingsResponse, messagesResponse] = await Promise.all([
      getAssistantSettings(auth),
      listAssistantMessages(auth).catch(() => ({ messages: [] })),
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
      lastMessage: last?.content?.trim() || ASSISTANT_INBOX_PLACEHOLDER,
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
  const [inbox, categories] = await Promise.all([
    getChatInbox(auth, identity.id, { limit: 50 }),
    listChatCategories(auth, identity.id).catch(() => ({ categories: [] })),
  ]);
  const conversations = [...inbox.pinned_conversations, ...inbox.conversations];
  const unique = new Map(conversations.map((conversation) => [conversation.id, conversation]));

  const chats = Array.from(unique.values()).map((conversation) => toChatItem(conversation, identity.id));
  const withoutAssistant = chats.filter(
    (chat) => chat.id !== ASSISTANT_CHAT_ID && !chat.isAI,
  );
  const assistantRow = await loadAssistantInboxItem(identity.id);
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

export function toUiChatMessage(message: ApiChatMessage, identityId: string): ChatMessage {
  const kind = message.message_type === 'image'
    ? 'image'
    : message.message_type === 'audio'
      ? 'audio'
      : message.message_type === 'file'
        ? 'file'
        : 'text';

  return {
    id: message.id,
    senderName: [message.sender?.first_name, message.sender?.last_name].filter(Boolean).join(' ') || undefined,
    isUser: message.sender_identity_id === identityId,
    type: kind,
    text: message.deleted_at ? '' : message.content,
    status: message.status === 'read' || message.status === 'delivered' ? message.status : 'sent',
    time: clock(message.created_at),
    isPinned: Boolean(message.is_pinned),
    isEdited: Boolean(message.edited_at),
    isDestroyed: Boolean(message.destroyed_at),
    sentByAi: Boolean(message.is_sent_by_ai),
  };
}

export async function loadChatMessages(conversationId: string, identityId: string): Promise<ChatMessage[]> {
  const auth = await getWebAuth();
  const result = await getChatMessages(auth, conversationId, { limit: 50 });
  return result.messages.map((message) => toUiChatMessage(message, identityId)).reverse();
}

export async function sendTextChatMessage(conversationId: string, identityId: string, text: string): Promise<ChatMessage> {
  const auth = await getWebAuth();
  const result = await sendChatMessage(auth, conversationId, {
    sender_identity_id: identityId,
    body: text,
    message_type: 'text',
  });
  return toUiChatMessage(result.message, identityId);
}

export async function sendChatAttachmentMessage(
  conversationId: string,
  identityId: string,
  file: File,
  messageType: 'image' | 'document' | 'audio',
): Promise<ChatMessage> {
  const auth = await getWebAuth();
  const uri = URL.createObjectURL(file);
  try {
    const result = await uploadChatAttachment(auth, conversationId, {
      sender_identity_id: identityId,
      message_type: messageType,
      file: {
        uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      },
    });
    return toUiChatMessage(result.message, identityId);
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
    metadata: { latitude, longitude },
  });
  return toUiChatMessage(result.message, identityId);
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
  return item.stories.map((story) => ({
    id: story.id,
    authorId: item.author.actor_id,
    authorName: item.author.display_name,
    authorInitials: initials(item.author.display_name),
    authorColor: contactColor(item.author.actor_id),
    type: story.media?.url ? 'photo' : 'text',
    text: story.text_content || story.caption || '',
    photoUrl: story.media?.url || null,
    bgColor: story.media?.url ? null : '#6025d2',
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
  }));
}

export async function loadStatuses(): Promise<StatusItem[]> {
  const auth = await getWebAuth();
  const feed = await getStatusFeed(auth, { limit: 30 });
  return feed.items.flatMap(storyToStatus);
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

export async function publishTextStatus(text: string, authorName: string): Promise<StatusItem> {
  const auth = await getWebAuth();
  const response = await createTextStatus(auth, {
    kind: 'text',
    text_content: text,
    caption: text,
    text_background_id: '',
    actor_type: 'profile',
  });
  const story = response.status;
  return {
    id: story.id,
    authorId: story.actor.actor_id,
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
    timestamp: 'Ahora',
    viewed: true,
  };
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
  const created = await createCommercialProfile(auth, {
    offer_type: offerType,
    display_name: input.name.trim(),
    description: input.description.trim() || input.name.trim(),
    city: 'Sin ciudad',
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
