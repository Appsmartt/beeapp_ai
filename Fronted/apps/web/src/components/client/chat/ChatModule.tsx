'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import {
  createChatCategory,
  createChatGroup,
  createDirectChatConversation,
  createMyCommunity,
  getAccountSecurityPinStatus,
  protectChatWithPin,
  removeChatPinProtection,
  saveChatConversationCategories,
  searchChatRecipients,
  updateChatConversationNotifications,
  updateChatConversationPinned,
} from '@beeapp/api-client';
import {
  ASSISTANT_CHAT_ID,
  ChatItem,
  ChatCategory,
} from '@/lib/client/chats';
import { CommunityItem } from '@/lib/client/communities';
import { StatusItem } from '@/lib/client/statuses';
import { ContactItem, contactColor, contactInitials } from '@/lib/client/contacts';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  getRememberedChatIdentity,
  getWebAuth,
  loadCommunities,
  loadContacts,
  loadInbox,
  loadStatuses,
  markStatusSeen,
  publishTextStatus,
} from '@/lib/client/liveData';
import {
  ASSISTANT_ARCHIVE_EVENT,
  consumeAssistantArchives,
} from '@/lib/client/assistantChat';
import GroupInvitesPanel from './GroupInvitesPanel';
import ChatConversation from './ChatConversation';
import ChatProfile from './ChatProfile';
import CommunityScreen from './CommunityScreen';
import CommunityProfile from './CommunityProfile';
import StatusViewer from './StatusViewer';
import CreateStatusModal from './CreateStatusModal';
import CreateCategoryModal from './modals/CreateCategoryModal';
import AssignCategoryModal from './modals/AssignCategoryModal';
import CreateCommunityModal from './modals/CreateCommunityModal';
import CreateContactModal from '../contacts/CreateContactModal';
import NewChatModal from './modals/NewChatModal';
import CreateGroupModal from './modals/CreateGroupModal';
import PinLockModal from './modals/PinLockModal';
import ChatPanelTabs from './ChatPanelTabs';
import ChatListPanel from './ChatListPanel';
import ChatInboxHeader from './ChatInboxHeader';
import ChatInboxTabs, { type InboxTab } from './ChatInboxTabs';
import StatusCirclesRow from './StatusCirclesRow';
import ContactsPanel from './ContactsPanel';
import StatusesPanel from './StatusesPanel';
import DiscoverPanel from './DiscoverPanel';
import { CommunityRow } from './ChatRow';
import { ChatSection, ContactsTab } from './chatSections';
import AiSettingsScreen from './modals/AiSettingsScreen';
import ContactDetail from '../contacts/ContactDetail';
import HomeDesktopCanvas from '../HomeDesktopCanvas';
import type { QuickModuleKey } from '../ModuleQuickMenu';
import HomeSearchResults from '../home/HomeSearchResults';
import {
  homeSearchEmptyCopy,
  useHomeModuleSearch,
  type HomeSearchHit,
} from '../home/HomeSearchContext';

interface ChatModuleProps {
  section: ChatSection;
  onSectionChange: (section: ChatSection) => void;
  onOpenModule?: (key: QuickModuleKey) => void;
  onConversationOpenChange?: (open: boolean) => void;
  onChatModalOpenChange?: (open: boolean) => void;
  onOpenSearchHit?: (hit: HomeSearchHit) => void;
}

export default function ChatModule({
  section,
  onSectionChange,
  onOpenModule,
  onConversationOpenChange,
  onChatModalOpenChange,
  onOpenSearchHit,
}: ChatModuleProps) {
  const { profile } = useAuth();
  const homeSearch = useHomeModuleSearch(['chat', 'contacto']);
  const chatListSearchActive = (
    homeSearch.active
    && homeSearch.filter !== 'contacto'
  );
  const contactListSearchActive = (
    homeSearch.active
    && (homeSearch.filter === 'contacto' || homeSearch.filter === 'todos')
  );
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);

  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityItem | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
  const [viewingProfile, setViewingProfile] = useState<'chat' | 'community' | null>(null);

  const [lockedChat, setLockedChat] = useState<ChatItem | null>(null);
  const [pinPurpose, setPinPurpose] = useState<'open' | 'remove'>('open');
  const [protectionNotice, setProtectionNotice] = useState<string | null>(null);


  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [creatingStatus, setCreatingStatus] = useState(false);

  const [categories, setCategories] = useState<ChatCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [assigningChat, setAssigningChat] = useState<ChatItem | null>(null);

  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [creatingCommunity, setCreatingCommunity] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [inboxTab, setInboxTab] = useState<InboxTab>('chats');
  const [showingAll, setShowingAll] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [pendingOpenChat, setPendingOpenChat] = useState<string | null>(null);
  const archivePatchesRef = useRef<Record<string, boolean>>({});

  const networkTab: ContactsTab = 'my_contacts';



  useEffect(() => {
    if (section !== 'ai') return;
    const aiChat = chats.find((c) => c.isAI);
    if (aiChat) setSelectedChat(aiChat);
    onSectionChange('chats');
  }, [section, chats, onSectionChange]);

  useEffect(() => {
    let active = true;
    setInboxLoading(true);

    Promise.all([
      loadInbox().catch(() => ({ identityId: '', chats: [] as ChatItem[], categories: [] as ChatCategory[] })),
      loadContacts().catch(() => [] as ContactItem[]),
      loadCommunities(profile?.id || '').catch(() => [] as CommunityItem[]),
      loadStatuses().catch(() => [] as StatusItem[]),
    ])
      .then(([inbox, nextContacts, nextCommunities, nextStatuses]) => {
        if (!active) return;
        setChats(inbox.chats.map((chat) => (
          archivePatchesRef.current[chat.id] === undefined
            ? chat
            : { ...chat, isArchived: archivePatchesRef.current[chat.id] }
        )));
        setCategories(inbox.categories);
        setContacts(nextContacts);
        setCommunities(nextCommunities);
        setStatuses(nextStatuses);
        const requested = new URLSearchParams(window.location.search).get('openChat');
        if (requested) setPendingOpenChat(requested);
      })
      .finally(() => {
        if (active) {
          setInboxLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [profile?.id]);

  const inContacts = section === 'contacts' || section === 'calls' || section === 'discover';
  const contactsTab: ContactsTab = section === 'calls' ? 'calls' : networkTab;

  const requestChatPin = (chat: ChatItem, purpose: 'open' | 'remove') => {
    setPinPurpose(purpose);
    setLockedChat(chat);
  };

  const handleChatPress = (chat: ChatItem) => {
    if (chat.isProtected) {
      requestChatPin(chat, 'open');
      return;
    }
    openChatWith(chat);
  };

  const showProtectionNotice = (text: string) => {
    setProtectionNotice(text);
    window.setTimeout(() => setProtectionNotice((current) => (current === text ? null : current)), 3200);
  };

  const handleToggleProtection = (chat: ChatItem) => {
    if (chat.isProtected) {
      requestChatPin(chat, 'remove');
      return;
    }
    void getWebAuth().then(async (auth) => {
      const status = await getAccountSecurityPinStatus(auth);
      if (!status.configured) {
        showProtectionNotice('Crea un PIN en Seguridad antes de proteger un chat.');
        return;
      }
      await protectChatWithPin(auth, chat.id);
      setChats((prev) => prev.map((item) => (
        item.id === chat.id ? { ...item, isProtected: true, lastMessage: '', unreadCount: 0 } : item
      )));
    }).catch(() => showProtectionNotice('No fue posible proteger el chat.'));
  };

  const openChatWith = (chat: ChatItem) => {
    setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c)));
    setSelectedChat(chat);
    setSelectedCommunity(null);
    setSelectedContact(null);
    setViewingProfile(null);
    onSectionChange('chats');
  };

  useEffect(() => {
    if (!pendingOpenChat) return;
    const target = chats.find((item) => item.id === pendingOpenChat);
    if (target) handleChatPress(target);
    else {
      openChatWith({
        id: pendingOpenChat,
        name: 'Proveedor',
        lastMessage: '',
        time: '',
        unreadCount: 0,
        isGroup: false,
        status: 'sent',
        postingIdentityId: getRememberedChatIdentity(),
      });
    }
    setPendingOpenChat(null);
    window.history.replaceState(null, '', '/app');
  }, [pendingOpenChat, chats]);

  const persistAssistantInboxPreference = (
    chatId: string,
    patch: { isPinned?: boolean; isMuted?: boolean },
  ) => {
    const identityId = getRememberedChatIdentity();
    if (!identityId) return;
    if (chatId !== ASSISTANT_CHAT_ID) {
      if (patch.isMuted === undefined) return;
      void getWebAuth().then((auth) => updateChatConversationNotifications(auth, chatId, {
        identity_id: identityId,
        notifications_enabled: !patch.isMuted,
      })).catch(() => undefined);
      return;
    }
    void getWebAuth().then(async (auth) => {
      if (patch.isPinned !== undefined) {
        await updateChatConversationPinned(auth, ASSISTANT_CHAT_ID, {
          identity_id: identityId,
          is_pinned: patch.isPinned,
        });
      }
      if (patch.isMuted !== undefined) {
        await updateChatConversationNotifications(auth, ASSISTANT_CHAT_ID, {
          identity_id: identityId,
          notifications_enabled: !patch.isMuted,
        });
      }
    }).catch(() => undefined);
  };

  const startDirectChat = (name: string) => {
    const existing = chats.find((chat) => chat.name === name);
    if (existing) {
      onSectionChange('chats');
      handleChatPress(existing);
      return;
    }
    const identityId = getRememberedChatIdentity();
    if (!identityId) return;
    void getWebAuth().then(async (auth) => {
      const found = await searchChatRecipients(auth, name, 5);
      const recipient = found.users[0];
      if (!recipient) return;
      const created = await createDirectChatConversation(auth, {
        sender_identity_id: identityId,
        recipient_identity_id: recipient.id,
      });
      const inbox = await loadInbox();
      setChats(inbox.chats);
      const chat = inbox.chats.find((item) => item.id === created.conversation.id);
      if (chat) {
        onSectionChange('chats');
        openChatWith(chat);
      }
    }).catch(() => undefined);
  };

  const handleArchiveChat = (id: string, archived = true) => {
    archivePatchesRef.current[id] = archived;
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, isArchived: archived } : c)));
  };

  useEffect(() => {
    for (const item of consumeAssistantArchives()) {
      archivePatchesRef.current[item.id] = item.archived;
    }
    const onArchive = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; archived?: boolean }>).detail;
      if (detail?.id) handleArchiveChat(detail.id, detail.archived !== false);
    };
    window.addEventListener(ASSISTANT_ARCHIVE_EVENT, onArchive);
    return () => window.removeEventListener(ASSISTANT_ARCHIVE_EVENT, onArchive);
  }, []);

  const renderLeftPanel = () => {
    if (invitesOpen && (section === 'chats' || section === 'archived')) {
      return (
        <GroupInvitesPanel
          onAccepted={() => {
            void loadInbox().then((inbox) => setChats(inbox.chats)).catch(() => undefined);
          }}
        />
      );
    }

    if (section === 'discover') {
      return (
        <DiscoverPanel
          selectedContactId={selectedContact?.id}
          onSelectContact={(c) => { setSelectedContact(c); setSelectedChat(null); setSelectedCommunity(null); }}
        />
      );
    }

    if (inContacts) {
      return (
        <ContactsPanel
          contacts={contacts}
          tab={contactsTab}
          selectedContactId={selectedContact?.id}
          onSelectContact={setSelectedContact}
          onCreateContact={() => setCreatingContact(true)}
          homeSearchQuery={contactListSearchActive ? homeSearch.query : ''}
        />
      );
    }

    if (section === 'statuses') {
      return (
        <StatusesPanel statuses={statuses} authorInitials={contactInitials([profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Tú')} onOpenStatus={(i) => { const status = statuses[i]; if (status) { void markStatusSeen(status.id).catch(() => undefined); setStatuses((prev) => prev.map((item) => item.id === status.id ? { ...item, viewed: true } : item)); } setViewerIndex(i); }} onCreateStatus={() => setCreatingStatus(true)} />
      );
    }

    if (section === 'communities') {
      if (communities.length === 0) {
        return (
          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-28 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[#E7DFF3] bg-white text-brand-primary shadow-sm">
              <Users className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-base font-semibold text-neutral-900">
              Aún no tienes comunidades
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6B5B8A]">
              Crea un espacio para publicar avisos y reunir a las personas de un mismo tema.
            </p>
            <button
              type="button"
              onClick={() => setCreatingCommunity(true)}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary/90"
            >
              <Plus className="h-4 w-4" />
              Crear comunidad
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-3">
          {communities.map((community) => (
            <CommunityRow key={community.id} community={community} isSelected={selectedCommunity?.id === community.id} onClick={() => { setSelectedCommunity(community); setSelectedChat(null); }} />
          ))}
        </div>
      );
    }

    const visibleChats = section === 'archived'
      ? chats.filter((chat) => chat.isArchived && !chat.isAI)
      : chats.filter((chat) => {
        if (chat.isArchived) return false;
        if (showingAll) return true;
        if (inboxTab === 'groups') return chat.isGroup && !chat.isAI;
        return !chat.isGroup || Boolean(chat.isAI);
      });
    const archivedCount = chats.filter((chat) => chat.isArchived && !chat.isAI).length;

    const listedChats = chatListSearchActive
      ? visibleChats.filter((chat) => (
        homeSearch.matchesQuery(chat.name, chat.lastMessage)
      ))
      : visibleChats;

    const searchEmptyCopy = (
      chatListSearchActive
      && homeSearch.hasActiveQuery
      && listedChats.length === 0
    )
      ? homeSearchEmptyCopy(homeSearch.query)
      : null;

    return (
      <ChatListPanel
        loading={inboxLoading}
        chats={listedChats}
        searchEmpty={searchEmptyCopy}
        categories={categories}
        activeCategoryId={showingAll ? null : activeCategoryId}
        selectedChatId={selectedChat?.id}
        onSelectCategory={(id) => {
          setShowingAll(false);
          setActiveCategoryId(id);
        }}
        onCreateCategory={() => setCreatingCategory(true)}
        onSelectChat={handleChatPress}
        archivedCount={section === 'chats' ? archivedCount : 0}
        onOpenArchived={section === 'chats' ? () => onSectionChange('archived') : undefined}
        onPinChat={(id) => {
          setChats((prev) => {
            const target = prev.find((c) => c.id === id);
            const nextPinned = !target?.isPinned;
            persistAssistantInboxPreference(id, { isPinned: nextPinned });
            return prev.map((c) => (c.id === id ? { ...c, isPinned: nextPinned } : c));
          });
        }}
        onMuteChat={(id) => {
          setChats((prev) => {
            const target = prev.find((c) => c.id === id);
            const nextMuted = !target?.isMuted;
            persistAssistantInboxPreference(id, { isMuted: nextMuted });
            return prev.map((c) => (c.id === id ? { ...c, isMuted: nextMuted } : c));
          });
        }}
        onDeleteChat={(id) => { setChats((prev) => prev.filter((c) => c.id !== id)); if (selectedChat?.id === id) setSelectedChat(null); }}
        onAssignCategory={setAssigningChat}
        onToggleProtection={handleToggleProtection}
        onArchiveChat={handleArchiveChat}
      />
    );
  };

  const renderDetail = () => {
    if (aiSettingsOpen) return <AiSettingsScreen onBack={() => setAiSettingsOpen(false)} />;
    if (inContacts) {
      if (!selectedContact) return null;
      return (
        <ContactDetail
          contact={selectedContact}
          onBack={() => setSelectedContact(null)}
          onSendMessage={() => startDirectChat(selectedContact.name)}
          onStartCall={() => {
            startDirectChat(selectedContact.name);
          }}
        />
      );
    }
    if (viewingProfile === 'chat' && selectedChat) return <ChatProfile chat={selectedChat} onBack={() => setViewingProfile(null)} />;
    if (viewingProfile === 'community' && selectedCommunity) return <CommunityProfile community={selectedCommunity} onBack={() => setViewingProfile(null)} />;
    if (selectedCommunity) return <CommunityScreen community={selectedCommunity} onBack={() => setSelectedCommunity(null)} onOpenProfile={() => setViewingProfile('community')} />;
    if (selectedChat) {
      return (
        <ChatConversation
          key={selectedChat.id}
          chat={selectedChat}
          onBack={() => setSelectedChat(null)}
          onOpenProfile={() => setViewingProfile('chat')}
          onOpenAiSettings={() => setAiSettingsOpen(true)}
          onArchiveChat={handleArchiveChat}
          onNavigateToChat={(chatId, chatName) => {
            const target = chats.find((item) => item.id === chatId);
            if (target) {
              handleChatPress(target);
              return;
            }
            void loadInbox().then((inbox) => {
              setChats(inbox.chats);
              const loaded = inbox.chats.find((item) => item.id === chatId);
              if (loaded) {
                handleChatPress(loaded);
              } else {
                openChatWith({
                  id: chatId,
                  name: chatName,
                  lastMessage: '',
                  time: '',
                  unreadCount: 0,
                  isGroup: false,
                  status: 'sent',
                  postingIdentityId: getRememberedChatIdentity(),
                });
              }
            }).catch(() => undefined);
          }}
        />
      );
    }
    return null;
  };

  const detail = renderDetail();
  const searchScopeKey = `${homeSearch.filter}:${homeSearch.query}`;
  const previousSearchScope = useRef(searchScopeKey);

  useEffect(() => {
    if (previousSearchScope.current === searchScopeKey) return;
    previousSearchScope.current = searchScopeKey;
    const searching = homeSearch.filter !== 'todos' || homeSearch.query.trim().length > 0;
    if (!searching) return;
    setSelectedChat(null);
    setSelectedCommunity(null);
    setSelectedContact(null);
    setViewingProfile(null);
  }, [homeSearch.filter, homeSearch.query, searchScopeKey]);

  const paneOpen = detail != null;
  const showSearchResults = (
    !paneOpen
    && (homeSearch.filter !== 'todos' || homeSearch.query.trim().length > 0)
  );
  const conversationOpen = selectedChat != null;

  useEffect(() => {
    onConversationOpenChange?.(conversationOpen);
  }, [conversationOpen, onConversationOpenChange]);

  const chatModalOpen = creatingContact
    || creatingStatus
    || creatingCategory
    || newChatModalOpen
    || createGroupModalOpen
    || creatingCommunity
    || aiSettingsOpen
    || Boolean(assigningChat)
    || Boolean(lockedChat)
    || viewerIndex !== null
    || invitesOpen;

  useEffect(() => {
    onChatModalOpenChange?.(chatModalOpen);
  }, [chatModalOpen, onChatModalOpenChange]);

  const goHome = () => {
    setSelectedChat(null);
    setSelectedCommunity(null);
    setSelectedContact(null);
    setViewingProfile(null);
    setAiSettingsOpen(false);
    onSectionChange('chats');
  };

  const inboxTitle = section === 'archived' ? 'Chats archivados' : 'Chats';
  const showInboxChrome = section === 'chats' || section === 'archived';
  const authorInitials = contactInitials(
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Tú',
  );

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-[#F7F4FB]">
    <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden md:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:grid-cols-[400px_minmax(0,1fr)]">
      <div className={`h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#F3EEF8] md:grid md:border-r md:border-[#E4D8F2] ${paneOpen || showSearchResults ? 'hidden' : 'grid'}`}>
        <div className="min-w-0">
        {showInboxChrome ? (
          <>
            <ChatInboxHeader
              title={inboxTitle}
              onGoHome={section === 'chats' && !paneOpen ? undefined : goHome}
              onBack={section === 'archived' ? () => onSectionChange('chats') : undefined}
              onNewChat={() => setNewChatModalOpen(true)}
              onNewGroup={() => setCreateGroupModalOpen(true)}
              onNewCommunity={() => setCreatingCommunity(true)}
              onOpenSection={onSectionChange}
            />
            {section === 'chats' ? (
              <>
                <div className="[@media(max-height:720px)]:hidden">
                  <StatusCirclesRow
                    statuses={statuses}
                    authorInitials={authorInitials}
                    onCreateStatus={() => setCreatingStatus(true)}
                    onOpenStatus={(index) => {
                      const status = statuses[index];
                      if (status) {
                        void markStatusSeen(status.id).catch(() => undefined);
                        setStatuses((prev) => prev.map((item) => (
                          item.id === status.id ? { ...item, viewed: true } : item
                        )));
                      }
                      setViewerIndex(index);
                    }}
                  />
                </div>
                <ChatInboxTabs
                  activeTab={inboxTab}
                  onChange={(tab) => {
                    setShowingAll(false);
                    setInboxTab(tab);
                  }}
                />
                <div className="flex justify-end gap-3 px-4 py-1.5">
                  <button
                    type="button"
                    onClick={() => setInvitesOpen((open) => !open)}
                    className="text-xs font-medium text-brand-primary hover:underline"
                  >
                    {invitesOpen ? 'Ver chats' : 'Invitaciones'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowingAll(true);
                      setActiveCategoryId(null);
                      setInboxTab('chats');
                    }}
                    className="text-xs font-medium text-brand-primary hover:underline"
                  >
                    Ver todo
                  </button>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <ChatPanelTabs
            section={section}
            onSectionChange={onSectionChange}
            onBack={() => onSectionChange('chats')}
            onNewChat={() => setNewChatModalOpen(true)}
            onNewGroup={() => setCreateGroupModalOpen(true)}
            onNewCommunity={() => setCreatingCommunity(true)}
            onNewContact={() => setCreatingContact(true)}
          />
        )}
        </div>
        <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain">
          {renderLeftPanel()}
        </div>
      </div>
      <div className={`relative min-h-0 min-w-0 overflow-hidden ${paneOpen || showSearchResults ? 'block' : 'hidden md:block'}`}>
        {paneOpen ? (
          <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-white">
            {detail}
          </div>
        ) : showSearchResults ? (
          <HomeSearchResults
            chats={chats}
            contacts={contacts}
            onOpenChat={(chat) => {
              onSectionChange('chats');
              handleChatPress(chat);
            }}
            onOpenContact={(contact) => {
              onSectionChange('contacts');
              setSelectedContact(contact);
              setSelectedChat(null);
              setSelectedCommunity(null);
            }}
            onOpenRemoteHit={(hit) => onOpenSearchHit?.(hit)}
          />
        ) : onOpenModule ? (
          <HomeDesktopCanvas onOpenModule={onOpenModule} />
        ) : null}
      </div>
    </div>

      <NewChatModal isOpen={newChatModalOpen} onClose={() => setNewChatModalOpen(false)} onSelectContact={(contact) => startDirectChat(contact.name)} />
      <CreateGroupModal isOpen={createGroupModalOpen} onClose={() => setCreateGroupModalOpen(false)} onCreateGroup={(name) => {
        const identityId = getRememberedChatIdentity();
        if (!identityId) return;
        void getWebAuth().then(async (auth) => {
          const created = await createChatGroup(auth, {
            creator_identity_id: identityId,
            name,
            posting_policy: 'all_members',
          });
          const inbox = await loadInbox();
          setChats(inbox.chats);
          const chat = inbox.chats.find((item) => item.id === created.conversation.id);
          if (chat) {
            onSectionChange('chats');
            openChatWith(chat);
          }
        }).catch(() => undefined);
      }} />
      <StatusViewer
        visible={viewerIndex !== null}
        statuses={statuses}
        index={viewerIndex ?? 0}
        currentUserId={profile?.id}
        onChangeIndex={(i) => setViewerIndex(i)}
        onClose={() => setViewerIndex(null)}
      />
      <CreateStatusModal visible={creatingStatus} onPublish={(st) => {
        setCreatingStatus(false);
        if (st.type !== 'text' || !st.text?.trim()) return;
        const authorName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Tú';
        void publishTextStatus(st.text.trim(), authorName).then((saved) => {
          setStatuses((prev) => [saved, ...prev]);
        }).catch(() => undefined);
      }} onClose={() => setCreatingStatus(false)} />
      <CreateCategoryModal isOpen={creatingCategory} onClose={() => setCreatingCategory(false)} onCreate={(catData) => {
        const created: ChatCategory = { ...catData, id: `local-${Date.now()}` };
        setCategories((prev) => [...prev, created]);
        setActiveCategoryId(created.id);
        setCreatingCategory(false);
        const identityId = getRememberedChatIdentity();
        if (!identityId) return;
        void getWebAuth().then((auth) => createChatCategory(auth, {
          identity_id: identityId,
          name: catData.name,
          icon: catData.icon,
          color: catData.color,
        })).then((result) => {
          setCategories((prev) => prev.map((item) => item.id === created.id ? { ...item, id: result.category.id } : item));
        }).catch(() => undefined);
      }} />
      <AssignCategoryModal isOpen={!!assigningChat} chatName={assigningChat?.name} categories={categories} currentCategoryIds={assigningChat?.categoryIds ?? []} onSave={(catIds) => {
        if (assigningChat) {
          setChats((prev) => prev.map((chat) => chat.id === assigningChat.id ? { ...chat, categoryIds: catIds } : chat));
          const identityId = getRememberedChatIdentity();
          if (identityId) {
            void getWebAuth().then((auth) => saveChatConversationCategories(auth, identityId, assigningChat.id, catIds)).catch(() => undefined);
          }
        }
        setAssigningChat(null);
      }} onClose={() => setAssigningChat(null)} />
      <CreateCommunityModal isOpen={creatingCommunity} onClose={() => setCreatingCommunity(false)} onCreate={(name, description, category) => {
        void createMyCommunity({ name, description, category }).then((created) => {
          const community: CommunityItem = {
            id: created.id,
            name: created.name,
            description: created.description,
            category: created.category,
            initials: contactInitials(created.name),
            color: contactColor(created.id),
            creatorId: created.owner_id,
            membersCount: 1,
            isAdmin: true,
            unreadCount: 0,
            members: [],
            posts: [],
          };
          setCommunities((prev) => [community, ...prev]);
          setCreatingCommunity(false);
          onSectionChange('communities');
        }).catch(() => setCreatingCommunity(false));
      }} />
      <CreateContactModal isOpen={creatingContact} onClose={() => setCreatingContact(false)} onCreate={(c) => { setContacts((prev) => [c, ...prev]); setSelectedContact(c); setCreatingContact(false); }} />
      
      {protectionNotice ? (
        <div className="fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {protectionNotice}
        </div>
      ) : null}
      <PinLockModal
        visible={!!lockedChat}
        itemName={lockedChat?.name}
        onClose={() => setLockedChat(null)}
        onVerify={pinPurpose === 'remove' && lockedChat ? async (pin) => {
          const auth = await getWebAuth();
          await removeChatPinProtection(auth, lockedChat.id, pin);
        } : undefined}
        onSuccess={() => {
          if (!lockedChat) return;
          const chat = lockedChat;
          setLockedChat(null);
          if (pinPurpose === 'remove') {
            setChats((prev) => prev.map((item) => (
              item.id === chat.id ? { ...item, isProtected: false } : item
            )));
            void loadInbox().then((inbox) => {
              setChats(inbox.chats);
            }).catch(() => undefined);
            return;
          }
          openChatWith({ ...chat, isProtected: false });
        }}
      />

    </div>
  );
}
