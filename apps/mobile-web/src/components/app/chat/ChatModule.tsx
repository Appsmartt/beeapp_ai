'use client';

import { useEffect, useState } from 'react';
import {
  MOCK_CHATS,
  ChatItem,
  MOCK_CATEGORIES,
  ChatCategory,
  addCategory,
  setChatCategories,
} from '@/mocks/chats';
import { MOCK_COMMUNITIES, CommunityItem, CURRENT_USER_ID } from '@/mocks/communities';
import { MOCK_STATUSES, StatusItem, addStatus, markStatusViewed } from '@/mocks/statuses';
import { MOCK_CONTACTS, ContactItem } from '@/mocks/contacts';
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
import ChatEmptyState from './ChatEmptyState';
import ChatOptionsBar from './ChatOptionsBar';
import ChatPanelTabs from './ChatPanelTabs';
import ChatListPanel from './ChatListPanel';
import ContactsPanel from './ContactsPanel';
import StatusesPanel from './StatusesPanel';
import DiscoverPanel from './DiscoverPanel';
import { CommunityRow } from './ChatRow';
import { ChatSection, ContactsTab } from './chatSections';
import AiSettingsScreen from './modals/AiSettingsScreen';
import ContactDetail from '../contacts/ContactDetail';

interface ChatModuleProps {
  section: ChatSection;
  onSectionChange: (section: ChatSection) => void;
}

const newChatItem = (name: string, isGroup: boolean, verified = false): ChatItem => ({
  id: `ch-${Date.now()}`,
  name,
  lastMessage: isGroup ? 'Grupo creado' : 'Conversación iniciada',
  time: 'Ahora',
  unreadCount: 0,
  isAI: false,
  isGroup,
  isProtected: false,
  status: 'sent',
  verified,
});

export default function ChatModule({ section, onSectionChange }: ChatModuleProps) {
  const [chats, setChats] = useState<ChatItem[]>(MOCK_CHATS);
  const [communities, setCommunities] = useState<CommunityItem[]>(MOCK_COMMUNITIES);
  const [statuses, setStatuses] = useState<StatusItem[]>([...MOCK_STATUSES]);
  const [contacts, setContacts] = useState<ContactItem[]>(MOCK_CONTACTS);

  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityItem | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
  const [viewingProfile, setViewingProfile] = useState<'chat' | 'community' | null>(null);

  const [lockedChat, setLockedChat] = useState<ChatItem | null>(null);


  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [creatingStatus, setCreatingStatus] = useState(false);

  const [categories, setCategories] = useState<ChatCategory[]>([...MOCK_CATEGORIES]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [assigningChat, setAssigningChat] = useState<ChatItem | null>(null);

  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [creatingCommunity, setCreatingCommunity] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

  const networkTab: ContactsTab = 'my_contacts';



  useEffect(() => {
    if (section !== 'ai') return;
    const aiChat = chats.find((c) => c.isAI);
    if (aiChat) setSelectedChat(aiChat);
    onSectionChange('chats');
  }, [section, chats, onSectionChange]);

  const inContacts = section === 'contacts' || section === 'calls' || section === 'discover';
  const contactsTab: ContactsTab = section === 'calls' ? 'calls' : networkTab;

  const handleChatPress = (chat: ChatItem) => {
    if (chat.isProtected) {
      setLockedChat(chat);
      return;
    }
    openChatWith(chat);
  };

  const openChatWith = (chat: ChatItem) => {
    setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c)));
    setSelectedChat(chat);
    setSelectedCommunity(null);
    setSelectedContact(null);
    setViewingProfile(null);
  };

  const handleArchiveChat = (id: string) => {
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, isArchived: true } : c)));
  };

  const renderLeftPanel = () => {
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
          contacts={contacts} tab={contactsTab} selectedContactId={selectedContact?.id}
          onSelectContact={setSelectedContact} onCreateContact={() => setCreatingContact(true)}
        />
      );
    }

    if (section === 'statuses') {
      return (
        <StatusesPanel statuses={statuses} onOpenStatus={(i) => { markStatusViewed(statuses[i].id); setStatuses([...MOCK_STATUSES]); setViewerIndex(i); }} onCreateStatus={() => setCreatingStatus(true)} />
      );
    }

    if (section === 'communities') {
      return (
        <div className="divide-y divide-neutral-100 flex-1 overflow-y-auto">
          {communities.map((community) => (
            <CommunityRow key={community.id} community={community} isSelected={selectedCommunity?.id === community.id} onClick={() => { setSelectedCommunity(community); setSelectedChat(null); }} />
          ))}
        </div>
      );
    }

    const panelChats = section === 'archived'
      ? chats.filter((c) => c.isArchived)
      : section === 'restricted'
      ? chats.filter((c) => c.isProtected)
      : chats.filter((c) => !c.isArchived);

    return (
      <ChatListPanel
        chats={panelChats}
        categories={categories}
        activeCategoryId={activeCategoryId}
        selectedChatId={selectedChat?.id}
        onSelectCategory={setActiveCategoryId}
        onCreateCategory={() => setCreatingCategory(true)}
        onSelectChat={handleChatPress}
        onPinChat={(id) => setChats((prev) => prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c)))}
        onMuteChat={(id) => setChats((prev) => prev.map((c) => (c.id === id ? { ...c, isMuted: !c.isMuted } : c)))}
        onDeleteChat={(id) => { setChats((prev) => prev.filter((c) => c.id !== id)); if (selectedChat?.id === id) setSelectedChat(null); }}
        onAssignCategory={setAssigningChat}
        onToggleProtection={(chat) => setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, isProtected: !c.isProtected } : c)))}
        onArchiveChat={handleArchiveChat}
      />
    );
  };

  const renderDetail = () => {
    if (aiSettingsOpen) return <AiSettingsScreen onBack={() => setAiSettingsOpen(false)} />;
    if (inContacts) {
      if (!selectedContact) return null;
      return <ContactDetail contact={selectedContact} onBack={() => setSelectedContact(null)} onSendMessage={() => { const existing = chats.find((c) => c.name === selectedContact.name); if (existing) { onSectionChange('chats'); openChatWith(existing); } else { const chat = newChatItem(selectedContact.name, false, selectedContact.verified); setChats((prev) => [chat, ...prev]); onSectionChange('chats'); openChatWith(chat); } }} />;
    }
    if (viewingProfile === 'chat' && selectedChat) return <ChatProfile chat={selectedChat} onBack={() => setViewingProfile(null)} />;
    if (viewingProfile === 'community' && selectedCommunity) return <CommunityProfile community={selectedCommunity} onBack={() => setViewingProfile(null)} />;
    if (selectedCommunity) return <CommunityScreen community={selectedCommunity} onBack={() => setSelectedCommunity(null)} onOpenProfile={() => setViewingProfile('community')} />;
    if (selectedChat) return <ChatConversation key={selectedChat.id} chat={selectedChat} onBack={() => setSelectedChat(null)} onOpenProfile={() => setViewingProfile('chat')} onOpenAiSettings={() => setAiSettingsOpen(true)} onNavigateToChat={() => {}} />;
    return null;
  };

  const detail = renderDetail();

  return (
    <div className="bg-white min-h-full flex flex-row relative">
      <ChatOptionsBar section={section} onSelectSection={onSectionChange} />
      <div className="w-[440px] shrink-0 border-r border-neutral-200 flex flex-col">
        <ChatPanelTabs section={section} onSectionChange={onSectionChange} onNewChat={() => setNewChatModalOpen(true)} onNewGroup={() => setCreateGroupModalOpen(true)} onNewCommunity={() => setCreatingCommunity(true)} onNewContact={() => setCreatingContact(true)} />
        {renderLeftPanel()}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        {detail ?? <ChatEmptyState inContacts={inContacts} />}
      </div>

      <NewChatModal isOpen={newChatModalOpen} onClose={() => setNewChatModalOpen(false)} onSelectContact={(contact) => { const existing = chats.find((c) => c.name === contact.name); if (existing) { onSectionChange('chats'); openChatWith(existing); } else { const chat = newChatItem(contact.name, false, contact.verified); setChats((prev) => [chat, ...prev]); onSectionChange('chats'); openChatWith(chat); } }} />
      <CreateGroupModal isOpen={createGroupModalOpen} onClose={() => setCreateGroupModalOpen(false)} onCreateGroup={(name, members) => { const groupChat: ChatItem = { id: `group_${Date.now()}`, name, lastMessage: 'Grupo creado', time: 'Ahora', unreadCount: 0, isGroup: true, status: 'sent', members }; setChats((prev) => [groupChat, ...prev]); onSectionChange('chats'); openChatWith(groupChat); }} />
      <StatusViewer visible={viewerIndex !== null} statuses={statuses} index={viewerIndex ?? 0} onChangeIndex={(i) => setViewerIndex(i)} onClose={() => setViewerIndex(null)} />
      <CreateStatusModal visible={creatingStatus} onPublish={(st) => { addStatus(st); setStatuses([...MOCK_STATUSES]); setCreatingStatus(false); }} onClose={() => setCreatingStatus(false)} />
      <CreateCategoryModal isOpen={creatingCategory} onClose={() => setCreatingCategory(false)} onCreate={(catData) => { const created = addCategory(catData); setCategories([...MOCK_CATEGORIES]); setActiveCategoryId(created.id); setCreatingCategory(false); }} />
      <AssignCategoryModal isOpen={!!assigningChat} chatName={assigningChat?.name} categories={categories} currentCategoryIds={assigningChat?.categoryIds ?? []} onSave={(catIds) => { if (assigningChat) { setChatCategories(assigningChat.id, catIds); setChats([...MOCK_CHATS]); } setAssigningChat(null); }} onClose={() => setAssigningChat(null)} />
      <CreateCommunityModal isOpen={creatingCommunity} onClose={() => setCreatingCommunity(false)} onCreate={(name, description, category) => { const comm: CommunityItem = { id: `comm-${Date.now()}`, name, description, category, initials: name.slice(0, 2).toUpperCase(), color: '#F3E8FF', creatorId: CURRENT_USER_ID, membersCount: 1, isAdmin: true, unreadCount: 0, members: [{ id: CURRENT_USER_ID, name: 'Santiago Valencia', role: 'admin', initials: 'SV', color: '#F3E8FF', isCurrentUser: true }], posts: [] }; setCommunities((prev) => [comm, ...prev]); setCreatingCommunity(false); onSectionChange('communities'); }} />
      <CreateContactModal isOpen={creatingContact} onClose={() => setCreatingContact(false)} onCreate={(c) => { setContacts((prev) => [c, ...prev]); setSelectedContact(c); setCreatingContact(false); }} />
      
      <PinLockModal visible={!!lockedChat} itemName={lockedChat?.name} onClose={() => setLockedChat(null)} onSuccess={() => { if (lockedChat) { const c = lockedChat; setLockedChat(null); openChatWith(c); } }} />

    </div>
  );
}
